-- Add Stripe subscription columns to user_signup table
-- Run this migration to enable Stripe payment integration

-- Stripe Customer ID (links user to Stripe customer record)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Stripe Subscription ID (for managing active subscription)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription tier (standard, premium, family, business)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_signup_stripe_customer_id
ON user_signup(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_signup_stripe_subscription_id
ON user_signup(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_signup.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) for payment management';
COMMENT ON COLUMN user_signup.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx) for active subscription';
COMMENT ON COLUMN user_signup.subscription_tier IS 'Subscription tier: standard, premium, family, or business';
