/**
 * Stripe Routes
 *
 * Payment and subscription management endpoints.
 */

const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');

/**
 * POST /api/stripe/create-checkout
 * Create a Stripe Checkout session for subscription
 *
 * Body: { tier, userId, successUrl?, cancelUrl? }
 * Returns: { checkoutUrl, sessionId }
 */
router.post('/create-checkout', stripeController.createCheckoutSession);

/**
 * POST /api/stripe/webhook
 * Stripe webhook endpoint - receives events from Stripe
 *
 * IMPORTANT: This needs raw body for signature verification.
 * The raw body middleware is configured in app.js
 *
 * Headers required: stripe-signature
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeController.handleWebhook
);

/**
 * GET /api/stripe/subscription/:userId
 * Get subscription status for a user
 *
 * Returns: { status, tier, startDate, endDate, isActive, daysRemaining }
 */
router.get('/subscription/:userId', stripeController.getSubscriptionStatus);

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session for managing subscriptions
 *
 * Body: { userId, returnUrl? }
 * Returns: { portalUrl }
 */
router.post('/portal', stripeController.createPortalSession);

module.exports = router;
