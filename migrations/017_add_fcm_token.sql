/**
 * Migration: Add FCM token field for push notifications
 * Description: Adds fcm_token column to user_signup table for storing device tokens
 * Author: Claude
 * Date: 2026-01-06
 */

-- Add FCM token column
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Add index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_user_signup_fcm_token
ON user_signup(fcm_token)
WHERE fcm_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN user_signup.fcm_token IS 'Firebase Cloud Messaging device token for push notifications';
