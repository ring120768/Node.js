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

// Initialise Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Initialise Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Price IDs from Stripe Dashboard
// TODO: Replace with your actual Stripe Price IDs after creating products
const PRICE_IDS = {
  standard: process.env.STRIPE_PRICE_STANDARD || 'price_REPLACE_WITH_STANDARD_PRICE_ID',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_REPLACE_WITH_PREMIUM_PRICE_ID',
  family: process.env.STRIPE_PRICE_FAMILY || 'price_REPLACE_WITH_FAMILY_PRICE_ID',
  business: process.env.STRIPE_PRICE_BUSINESS || 'price_REPLACE_WITH_BUSINESS_PRICE_ID',
};

// Tier display names
const TIER_NAMES = {
  standard: 'Standard',
  premium: 'Premium',
  family: 'Family',
  business: 'Business',
};

/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout
 *
 * Body: { tier, userId, successUrl, cancelUrl }
 */
async function createCheckoutSession(req, res) {
  const { tier, userId, successUrl, cancelUrl } = req.body;

  // Validate tier
  if (!PRICE_IDS[tier]) {
    return res.status(400).json({
      error: 'Invalid subscription tier',
      validTiers: Object.keys(PRICE_IDS),
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

      const customer = await stripe.customers.create({
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
      const portalSession = await stripe.billingPortal.sessions.create({
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
    const session = await stripe.checkout.sessions.create({
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
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('[Stripe] Webhook received:', event.type);

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
 */
async function handleCheckoutComplete(session) {
  console.log('[Stripe] Checkout complete:', session.id);

  const { userId, tier } = session.metadata;

  if (!userId) {
    console.error('[Stripe] No userId in session metadata');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  // Update user record
  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      subscription_start_date: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('create_user_id', userId);

  if (error) {
    console.error('[Stripe] Failed to update user subscription:', error);
    return;
  }

  console.log('[Stripe] User subscription activated:', userId, 'tier:', tier);

  // Send welcome email
  try {
    const emailService = require('../../lib/emailService');

    const { data: user } = await supabase
      .from('user_signup')
      .select('email, driver_name')
      .eq('create_user_id', userId)
      .single();

    if (user) {
      await emailService.sendSubscriptionWelcome(user.email, {
        userName: user.driver_name,
        tier: TIER_NAMES[tier] || tier,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
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
  console.log('[Stripe] Subscription updated:', subscription.id);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    // Try to find user by customer ID
    const { data: user } = await supabase
      .from('user_signup')
      .select('create_user_id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (!user) {
      console.error('[Stripe] Cannot find user for subscription:', subscription.id);
      return;
    }
  }

  const finalUserId = userId || user.create_user_id;

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

  const { error } = await supabase
    .from('user_signup')
    .update({
      subscription_status: statusMap[subscription.status] || subscription.status,
      subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('create_user_id', finalUserId);

  if (error) {
    console.error('[Stripe] Failed to update subscription:', error);
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

  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

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
    const isActive = user.subscription_status === 'active' && endDate && endDate > now;

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
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl || `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/dashboard.html`,
    });

    res.json({ portalUrl: session.url });

  } catch (error) {
    console.error('[Stripe] Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
}

module.exports = {
  createCheckoutSession,
  handleWebhook,
  getSubscriptionStatus,
  createPortalSession,
};
