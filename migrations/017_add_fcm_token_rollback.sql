/**
 * Rollback Migration: Remove FCM token field
 * Description: Removes fcm_token column from user_signup table
 * Author: Claude
 * Date: 2026-01-06
 */

-- Drop index first
DROP INDEX IF EXISTS idx_user_signup_fcm_token;

-- Remove FCM token column
ALTER TABLE user_signup
DROP COLUMN IF EXISTS fcm_token;
