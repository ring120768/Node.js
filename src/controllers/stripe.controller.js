/**
 * Stripe Controller
 *
 * Handles subscription payments via Stripe Checkout.
 * Used for both web and mobile app payments.
 *
 * Endpoints:
 * - POST /api/stripe/create-checkout - Create Stripe Checkout session
 * - POST /api/stripe/webhook - Handle Stripe webhook events
 * - GET  /api/stripe/subscription/:userId - Get subscription status
 * - POST /api/stripe/portal - Create customer portal session
 */

const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { decryptPassword } = require('../../lib/encryption');
const { supabaseAdmin } = require('../../lib/supabaseAdmin');

// Feature flag for signup flow v2 (auth after payment)
const isSignupFlowV2 = () => process.env.SIGNUP_FLOW_V2 === 'true';

// Lazy-initialize Stripe to prevent crash when API key is missing
let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
}

// Initialise Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price IDs from Stripe Dashboard.
// NOTE: the amount actually charged lives on the Stripe Price object, not here.
// These IDs must point at Prices whose amounts match TIER_NAMES below.
const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_REPLACE_WITH_PREMIUM_PRICE_ID',
  family: process.env.STRIPE_PRICE_FAMILY || 'price_REPLACE_WITH_FAMILY_PRICE_ID',
  business_10: process.env.STRIPE_PRICE_BUSINESS_10 || 'price_REPLACE_WITH_BUSINESS_10_PRICE_ID',
  // Enterprise (25+ seats) is quoted manually - no self-serve Price ID.
  // Larger business tiers are kept available for manually arranged subscriptions.
  business_25: process.env.STRIPE_PRICE_BUSINESS_25 || 'price_REPLACE_WITH_BUSINESS_25_PRICE_ID',
  business_50: process.env.STRIPE_PRICE_BUSINESS_50 || 'price_REPLACE_WITH_BUSINESS_50_PRICE_ID',
  business_75: process.env.STRIPE_PRICE_BUSINESS_75 || 'price_REPLACE_WITH_BUSINESS_75_PRICE_ID',
  business_100: process.env.STRIPE_PRICE_BUSINESS_100 || 'price_REPLACE_WITH_BUSINESS_100_PRICE_ID',
};

// Tiers that can still be bought self-serve (drives validation on new checkouts).
// 'standard' is deliberately absent - it is retired and no longer sold.
const PURCHASABLE_TIERS = ['premium', 'family', 'business_10'];

/**
 * Work out which tier a subscription is for.
 *
 * The Stripe Pricing Table does NOT set metadata.tier - only our own
 * create-checkout call does. Every pricing-table purchase therefore wrote
 * subscription_tier = null, which is why all existing rows have a null tier.
 * Derive it from the price ID on the subscription instead, falling back to
 * session metadata for programmatic checkouts.
 *
 * @param {object} subscription - a Stripe Subscription object
 * @param {object} [session] - the Checkout Session, if available
 * @returns {string|null} tier key, or null if it cannot be determined
 */
function resolveTier(subscription, session) {
  const fromMetadata = session?.metadata?.tier || subscription?.metadata?.tier;
  if (fromMetadata && PRICE_IDS[fromMetadata]) return fromMetadata;

  const priceId = subscription?.items?.data?.[0]?.price?.id;
  if (priceId) {
    const match = Object.keys(PRICE_IDS).find((key) => PRICE_IDS[key] === priceId);
    if (match) return match;
    console.warn('[Stripe] Price ID not mapped to any tier:', priceId, '- check STRIPE_PRICE_* env vars');
  }

  return fromMetadata || null;
}

// Subscription statuses that entitle a user to the service.
// 'trialing' MUST be here: the pricing table offers a 7-day free trial, so Stripe
// sends customer.subscription.* with status 'trialing' immediately after checkout,
// which overwrites the 'active' set by checkout.session.completed. Without this,
// every trialing customer looks unsubscribed until their first payment clears.
const ENTITLED_STATUSES = ['active', 'trialing'];

// Tier display names and pricing.
// 'standard' is retired but MUST stay here: existing subscribers still carry
// subscription_tier = 'standard' in the database and are looked up by it.
const TIER_NAMES = {
  standard: 'Standard (legacy - no longer sold)',
  premium: 'Premium (£11.99/year)',
  family: 'Family (£35/year - up to 4 members)',
  business_10: 'Company (£80/year - up to 10 members)',
  business_25: 'Enterprise (up to 25 members - priced on request)',
  business_50: 'Enterprise (up to 50 members - priced on request)',
  business_75: 'Enterprise (up to 75 members - priced on request)',
  business_100: 'Enterprise (up to 100 members - priced on request)',
};

// Import groups controller for group creation
const groupsController = require('./groups.controller');

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 *
 * Body: { tier, userId, successUrl, cancelUrl }
 */
async function createCheckoutSession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { tier, userId, successUrl, cancelUrl } = req.body;

  // Validate tier. Retired tiers (e.g. 'standard') are rejected for NEW checkouts
  // but remain valid everywhere else so existing subscribers keep working.
  if (!PRICE_IDS[tier] || !PURCHASABLE_TIERS.includes(tier)) {
    return res.status(400).json({
      error: 'Invalid subscription tier',
      validTiers: PURCHASABLE_TIERS,
    });
  }

  // Validate userId
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user details from database
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, driver_name, stripe_customer_id')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      console.error('[Stripe] User not found:', userError);
      return res.status(404).json({ error: 'User not found' });
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      console.log('[Stripe] Creating new customer for:', user.email);

      const customer = await stripeClient.customers.create({
        email: user.email,
        name: user.driver_name,
        metadata: {
          userId: userId,
          source: 'car-crash-lawyer-ai',
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('user_signup')
        .update({ stripe_customer_id: customerId })
        .eq('create_user_id', userId);

      console.log('[Stripe] Customer created:', customerId);
    }

    // Check if user already has an active subscription
    const { data: existingUser } = await supabase
      .from('user_signup')
      .select('subscription_status, subscription_tier')
      .eq('create_user_id', userId)
      .single();

    if (existingUser?.subscription_status === 'active') {
      // Redirect to portal for upgrades/downgrades instead
      console.log('[Stripe] User already subscribed, creating portal session');
      const portalSession = await stripeClient.billingPortal.sessions.create({
        customer: customerId,
        return_url: successUrl || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`,
      });

      return res.json({
        checkoutUrl: portalSession.url,
        isPortal: true,
        message: 'You already have an active subscription. Redirecting to manage it.',
      });
    }

    // Build success URL with session ID
    const finalSuccessUrl = successUrl
      ? `${successUrl}?session_id={CHECKOUT_SESSION_ID}`
      : `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}`;

    const finalCancelUrl = cancelUrl
      || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/subscribe.html`;

    // Create Checkout Session
    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        userId: userId,
        tier: tier,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          tier: tier,
        },
      },
      // UK-specific options
      locale: 'en-GB',
      currency: 'gbp',
      // Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: 'auto',
      // Customer update settings
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    console.log('[Stripe] Checkout session created:', session.id, 'for tier:', tier);

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('[Stripe] Create checkout error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
}

/**
 * Handle Stripe Webhooks
 * POST /api/stripe/webhook
 *
 * IMPORTANT: This endpoint needs raw body parsing for signature verification
 */
async function handleWebhook(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const sig = req.headers['stripe-signature'];

  // Single account: acct_1Rg9mWGDFfktozQP. The old account's subscriptions are
  // being retired and its former users hold lifetime premium in the database, so
  // there is no second secret to fall back to.
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Stripe expects the exact bytes it signed, so prefer the raw Buffer
    // captured by the express.json() verify hook in app.js.
    event = stripeClient.webhooks.constructEvent(
      req.rawBodyBuffer || req.rawBody || req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Log every event received. The previous silent failure - checkout completing,
  // webhook returning 200, and nobody being activated - was invisible precisely
  // because nothing recorded what arrived or what was done with it.
  console.log('[Stripe] Webhook received:', {
    type: event.type,
    id: event.id,
    account: event.account || 'acct_1Rg9mWGDFfktozQP',
    livemode: event.livemode,
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log('[Stripe] Unhandled event type:', event.type);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('[Stripe] Webhook handler error:', error);
    // Return 200 to prevent Stripe from retrying
    res.json({ received: true, error: error.message });
  }
}

/**
 * Handle checkout.session.completed
 *
 * Supports two flows:
 * - v1: userId is a real Supabase auth UUID (user already authenticated)
 * - v2: userId is a temp_signup_id (auth account created here after payment)
 */
async function handleCheckoutComplete(session) {
  console.log('[Stripe] Checkout complete:', session.id);

  // For Stripe Pricing Table, the user ID is in client_reference_id
  // For programmatic checkout, it's in metadata.userId
  let tempOrUserId = session.client_reference_id || session.metadata?.userId;
  // Resolved properly once the subscription is retrieved below - the Pricing
  // Table never sets metadata.tier, so this is null for most real purchases.
  const metadataTier = session.metadata?.tier;

  if (!tempOrUserId) {
    console.error('[Stripe] No userId in session (checked client_reference_id and metadata)');
    return;
  }

  console.log('[Stripe] Processing checkout for ID:', tempOrUserId, '| session:', session.id);

  // Look up the signup record
  const { data: signup, error: lookupError } = await supabase
    .from('user_signup')
    .select('email, name, surname, pending_password, auth_pending, create_user_id')
    .eq('create_user_id', tempOrUserId)
    .single();

  if (lookupError || !signup) {
    console.error('[Stripe] No signup record found for ID:', tempOrUserId, lookupError);
    return;
  }

  // Determine which flow we're in
  // auth_pending = true means v2 flow (need to create auth account)
  const needsAuthCreation = signup.auth_pending === true && signup.pending_password;
  let finalUserId = tempOrUserId;

  // ===== V2 FLOW: Create auth account after payment =====
  if (needsAuthCreation) {
    console.log('[Stripe] v2 flow detected - creating auth account for:', signup.email);

    try {
      // Decrypt the stored password
      const plainPassword = decryptPassword(signup.pending_password);

      // Create auth account using admin API (auto-confirmed, no email verification)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: signup.email,
        password: plainPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: `${signup.name} ${signup.surname}`,
          signup_flow: 'v2_after_payment'
        }
      });

      if (authError) {
        console.error('[Stripe] Failed to create auth account:', authError);
        // This is critical - we can't complete signup without auth
        // The user will need to contact support
        throw new Error(`Auth creation failed: ${authError.message}`);
      }

      const newAuthUserId = authData.user.id;
      console.log('[Stripe] Auth account created:', newAuthUserId, 'for email:', signup.email);

      // Update user_signup with real auth user ID
      const { error: updateIdError } = await supabase
        .from('user_signup')
        .update({
          create_user_id: newAuthUserId, // Replace temp ID with real auth ID
          pending_password: null, // SECURITY: Clear stored password immediately
          auth_pending: false // Auth is now created
        })
        .eq('create_user_id', tempOrUserId);

      if (updateIdError) {
        console.error('[Stripe] Failed to update create_user_id:', updateIdError);
        // Auth exists but signup record has wrong ID - admin intervention needed
      }

      // Update any related records that used the temp ID
      // (user_documents, incident_reports if any were created somehow)
      await supabase
        .from('user_documents')
        .update({ create_user_id: newAuthUserId })
        .eq('create_user_id', tempOrUserId);

      await supabase
        .from('dvla_vehicle_info_new')
        .update({ create_user_id: newAuthUserId })
        .eq('create_user_id', tempOrUserId);

      // Use the new auth user ID for the rest of the function
      finalUserId = newAuthUserId;

      console.log('[Stripe] v2 flow: Updated all records from temp ID', tempOrUserId, 'to auth ID', finalUserId);

    } catch (authCreationError) {
      console.error('[Stripe] v2 auth creation failed:', authCreationError);
      // Don't throw - still update subscription status so payment isn't lost
      // The auth issue will need manual resolution
    }
  } else {
    console.log('[Stripe] v1 flow: Auth already exists for:', finalUserId);
  }

  // ===== COMMON: Update subscription status =====
  const stripeClient = getStripe();
  const subscription = await stripeClient.subscriptions.retrieve(session.subscription, {
    expand: ['items.data.price'],
  });

  // Derive the tier from the price actually purchased. metadataTier is only
  // populated by our own create-checkout call, never by the Pricing Table.
  const tier = resolveTier(subscription, session) || metadataTier || null;
  if (!tier) {
    console.warn('[Stripe] Could not resolve tier for subscription', subscription.id,
      '- price:', subscription.items?.data?.[0]?.price?.id);
  }

  const { error: subError } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer, // Also store customer ID
      subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('create_user_id', finalUserId);

  if (subError) {
    console.error('[Stripe] Failed to update user subscription:', subError);
    return;
  }

  console.log('[Stripe] User subscription activated:', finalUserId, 'tier:', tier);

  // Check if this tier requires a subscription group (family or business plans)
  const tierConfig = groupsController.TIER_CONFIG[tier];

  if (tierConfig && tierConfig.type !== 'individual') {
    try {
      // Create subscription group for family/business plans
      const group = await groupsController.createGroup(finalUserId, tier, subscription.id);

      if (group) {
        console.log('[Stripe] Subscription group created:', group.id, 'type:', tierConfig.type);
      }
    } catch (groupError) {
      console.error('[Stripe] Failed to create subscription group:', groupError);
      // Don't fail the checkout - subscription is still valid
      // User can manage group later
    }
  }

  // Send welcome email
  try {
    const emailService = require('../../lib/emailService');

    const { data: user } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('create_user_id', finalUserId)
      .single();

    if (user) {
      // Customise message for group plans
      const isGroupPlan = tierConfig && tierConfig.type !== 'individual';
      const tierDisplayName = TIER_NAMES[tier] || tier;

      await emailService.sendSubscriptionWelcome(user.email, {
        userName: user.name || `${user.name} ${user.surname}`,
        tier: tierDisplayName,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        isGroupPlan,
        maxMembers: isGroupPlan ? tierConfig.maxMembers : 1,
        // v2 flow extra info
        isNewAccount: needsAuthCreation,
      });
    }
  } catch (emailError) {
    console.error('[Stripe] Failed to send welcome email:', emailError);
    // Don't throw - subscription is still valid
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription) {
  console.log('[Stripe] Subscription created:', subscription.id);
  // Usually handled by checkout.session.completed
  // This is a backup handler
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('[Stripe] Subscription updated:', subscription.id, '->', subscription.status);

  // NOTE: `user` used to be declared with const INSIDE the `if (!userId)` block
  // and then read outside it, which is a ReferenceError. Pricing Table
  // subscriptions never carry metadata.userId, so !userId was always true and
  // this function threw on every real subscription update - silently, because
  // the webhook's try/catch returns 200 regardless. Look the user up here, in
  // scope, and fall back to the subscription id as well as the customer id.
  let finalUserId = subscription.metadata?.userId || null;

  if (!finalUserId) {
    const { data: user } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .or(`stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${subscription.customer}`)
      .is('deleted_at', null)
      .maybeSingle();

    if (!user) {
      console.error('[Stripe] Cannot find user for subscription:', subscription.id,
        '(customer:', subscription.customer, ')');
      return;
    }

    finalUserId = user.create_user_id;
  }

  // Map Stripe status to our status
  const statusMap = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    trialing: 'trialing',
    incomplete: 'incomplete',
    incomplete_expired: 'inactive',
    paused: 'paused',
  };

  const mappedStatus = statusMap[subscription.status] || subscription.status;
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: mappedStatus,
      ...(periodEnd ? { subscription_end_date: periodEnd } : {}),
    })
    .eq('create_user_id', finalUserId);

  if (error) {
    console.error('[Stripe] Failed to update subscription:', error);
  }

  // Cascade to the group, if this subscription pays for one. Previously only
  // customer.subscription.deleted cascaded, so a family plan going past_due or
  // paused left every member reading 'active' indefinitely - and a renewal
  // never extended members' end dates, so they lost access at the old date
  // while the subscription was healthy.
  try {
    await groupsController.updateGroupSubscriptionStatus(
      subscription.id,
      mappedStatus,
      periodEnd
    );
  } catch (groupError) {
    console.error('[Stripe] Failed to cascade status to group:', groupError.message);
  }
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('[Stripe] Subscription deleted:', subscription.id);

  // Find user by subscription ID
  const { data: user, error: findError } = await supabase
    .from('user_signup')
    .select('create_user_id, email, driver_name')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (findError || !user) {
    console.error('[Stripe] Cannot find user for deleted subscription:', subscription.id);
    return;
  }

  // Update status to cancelled
  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'cancelled',
      // Keep subscription_end_date as the access expiry
    })
    .eq('create_user_id', user.create_user_id);

  if (error) {
    console.error('[Stripe] Failed to update cancelled subscription:', error);
  }

  // Update group status if this was a group subscription
  try {
    await groupsController.updateGroupSubscriptionStatus(
      subscription.id,
      'cancelled',
      new Date(subscription.current_period_end * 1000).toISOString()
    );
  } catch (groupError) {
    console.error('[Stripe] Failed to update group status:', groupError);
  }

  // Send cancellation email
  try {
    const emailService = require('../../lib/emailService');
    // TODO: Implement sendSubscriptionCancelled in emailService
    console.log('[Stripe] TODO: Send cancellation email to:', user.email);
  } catch (emailError) {
    console.error('[Stripe] Failed to send cancellation email:', emailError);
  }
}

/**
 * Handle invoice.paid - subscription renewal success
 */
async function handleInvoicePaid(invoice) {
  // Skip first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    return;
  }

  console.log('[Stripe] Invoice paid (renewal):', invoice.id);

  const stripeClient = getStripe();
  const subscription = await stripeClient.subscriptions.retrieve(invoice.subscription);

  // Find user by subscription
  const { data: user, error: findError } = await supabase
    .from('user_signup')
    .select('create_user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (findError || !user) {
    console.error('[Stripe] Cannot find user for invoice:', invoice.id);
    return;
  }

  // Extend subscription period
  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('create_user_id', user.create_user_id);

  if (error) {
    console.error('[Stripe] Failed to update renewed subscription:', error);
  }

  console.log('[Stripe] Subscription renewed for user:', user.create_user_id);
}

/**
 * Handle invoice.payment_failed
 */
async function handlePaymentFailed(invoice) {
  console.log('[Stripe] Payment failed:', invoice.id);

  // Find user
  const { data: user } = await supabase
    .from('user_signup')
    .select('create_user_id, email, driver_name')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (!user) {
    console.error('[Stripe] Cannot find user for failed invoice:', invoice.id);
    return;
  }

  // Update status
  await supabase
    .from('user_signup')
    .update({ subscription_status: 'past_due' })
    .eq('create_user_id', user.create_user_id);

  // Send payment failed email
  try {
    const emailService = require('../../lib/emailService');
    // TODO: Implement sendPaymentFailed in emailService
    console.log('[Stripe] TODO: Send payment failed email to:', user.email);
  } catch (emailError) {
    console.error('[Stripe] Failed to send payment failed email:', emailError);
  }
}

/**
 * Get subscription status
 * GET /api/stripe/subscription/:userId
 */
async function getSubscriptionStatus(req, res) {
  const { userId } = req.params;

  try {
    const { data: user, error } = await supabase
      .from('user_signup')
      .select('subscription_status, subscription_tier, subscription_start_date, subscription_end_date')
      .eq('create_user_id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if subscription is still valid
    const now = new Date();
    const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null;
    const isActive = ENTITLED_STATUSES.includes(user.subscription_status) && endDate && endDate > now;

    res.json({
      status: user.subscription_status || 'inactive',
      tier: user.subscription_tier,
      startDate: user.subscription_start_date,
      endDate: user.subscription_end_date,
      isActive,
      daysRemaining: endDate ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))) : 0,
    });

  } catch (error) {
    console.error('[Stripe] Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
}

/**
 * Create customer portal session
 * POST /api/stripe/portal
 *
 * Body: { userId, returnUrl }
 */
async function createPortalSession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { userId, returnUrl } = req.body;

  try {
    // Get customer ID
    const { data: user, error } = await supabase
      .from('user_signup')
      .select('stripe_customer_id')
      .eq('create_user_id', userId)
      .single();

    if (error || !user || !user.stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Create portal session
    const session = await stripeClient.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`,
    });

    res.json({ portalUrl: session.url });

  } catch (error) {
    console.error('[Stripe] Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

/**
 * Verify Checkout Session
 * POST /api/stripe/verify-session
 *
 * Called by payment-success page to verify the checkout was successful.
 * The webhook should have already processed it, but this provides confirmation.
 *
 * Body: { sessionId, userId }
 */
async function verifySession(req, res) {
  const stripeClient = getStripe();
  if (!stripeClient) {
    console.error('[Stripe] STRIPE_SECRET_KEY not configured');
    return res.status(503).json({ error: 'Payment service temporarily unavailable' });
  }

  const { sessionId, userId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  try {
    console.log('[Stripe] Verifying session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check payment status
    if (session.payment_status !== 'paid') {
      console.log('[Stripe] Session not paid:', session.payment_status);
      return res.status(400).json({
        error: 'Payment not completed',
        status: session.payment_status,
      });
    }

    // Get subscription details
    const subscription = session.subscription;
    const customerId = session.customer?.id || session.customer;

    console.log('[Stripe] Session verified:', {
      sessionId,
      customerId,
      subscriptionId: subscription?.id || subscription,
      paymentStatus: session.payment_status,
    });

    // If userId is provided, ensure the database is updated
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('user_signup')
        .select('subscription_status, subscription_tier')
        .eq('create_user_id', userId)
        .single();

      // If subscription isn't active yet, the webhook might not have processed
      // Return success anyway - the webhook will update it shortly
      if (userData && userData.subscription_status !== 'active') {
        console.log('[Stripe] User subscription not yet active, webhook may be pending');
      }
    }

    res.json({
      success: true,
      verified: true,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id || subscription,
      customerId: customerId,
    });

  } catch (error) {
    console.error('[Stripe] Session verification error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  createPortalSession,
  verifySession,
};
