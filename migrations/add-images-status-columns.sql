-- Migration: Add image status tracking columns to user_signup table
-- Purpose: Track which users have uploaded all photos vs need reminders
-- Created: 2025-10-27

-- Add images_status column (complete, partial, none)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS images_status TEXT DEFAULT 'none' CHECK (images_status IN ('complete', 'partial', 'none'));

-- Add missing_images column (JSON array of missing image field names)
ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS missing_images TEXT[] DEFAULT NULL;

-- Add helpful comment
COMMENT ON COLUMN user_signup.images_status IS 'Image upload status: complete (all 5 uploaded), partial (some uploaded), none (no images)';
COMMENT ON COLUMN user_signup.missing_images IS 'Array of missing image field names for reminder emails';

-- Create index for finding users needing reminders
CREATE INDEX IF NOT EXISTS idx_user_signup_images_status ON user_signup(images_status)
WHERE images_status IN ('partial', 'none');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed: Image status columns added to user_signup';
  RAISE NOTICE '📊 Columns: images_status (TEXT), missing_images (TEXT[])';
  RAISE NOTICE '🔍 Index created: idx_user_signup_images_status';
END $$;
