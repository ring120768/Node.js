-- Create table for tracking temporary image uploads
-- These are uploaded immediately when selected, before form submission
-- Expires after 24 hours if not claimed (finalized) by a signup

CREATE TABLE IF NOT EXISTS temp_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_by_user_id UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_temp_uploads_session ON temp_uploads(session_id);

-- Index for cleanup queries (find expired unclaimed uploads)
CREATE INDEX IF NOT EXISTS idx_temp_uploads_expires ON temp_uploads(expires_at) WHERE NOT claimed;

-- Index for user claims
CREATE INDEX IF NOT EXISTS idx_temp_uploads_claimed ON temp_uploads(claimed_by_user_id) WHERE claimed = TRUE;

-- Comment on table
COMMENT ON TABLE temp_uploads IS 'Tracks temporary image uploads during form completion. Files are uploaded immediately when selected, stored in temp/ bucket location, then moved to permanent location on form submission. Expires after 24 hours if not claimed.';

COMMENT ON COLUMN temp_uploads.session_id IS 'Unique session identifier (generated client-side, stored in localStorage)';
COMMENT ON COLUMN temp_uploads.field_name IS 'Form field name (e.g., driving_license_picture, vehicle_front_image)';
COMMENT ON COLUMN temp_uploads.storage_path IS 'Path in Supabase storage bucket (e.g., temp/session123/license_1234567890.jpg)';
COMMENT ON COLUMN temp_uploads.claimed IS 'Whether this temp upload was converted to permanent on form submission';
COMMENT ON COLUMN temp_uploads.claimed_by_user_id IS 'The create_user_id that claimed this temp upload';
