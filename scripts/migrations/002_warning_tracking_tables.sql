-- Migration: Warning Tracking Tables
-- Purpose: Track sent warning emails to prevent duplicates
-- Version: 1.0.0
-- Date: 2025-10-17

-- Create incident_warnings table
CREATE TABLE IF NOT EXISTS incident_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL,
    warning_type TEXT NOT NULL, -- '60_days', '30_days', '7_days', '1_days'
    sent_at TIMESTAMP DEFAULT NOW(),
    email_success BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate warnings for same incident + type
    UNIQUE(incident_id, warning_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_incident_warnings_incident_id
ON incident_warnings(incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_warnings_sent_at
ON incident_warnings(sent_at);

-- Create subscription_warnings table
CREATE TABLE IF NOT EXISTS subscription_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- auth_user_id from user_signup
    warning_type TEXT NOT NULL, -- '30_days_renewal', etc.
    sent_at TIMESTAMP DEFAULT NOW(),
    email_success BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate warnings for same user + type
    UNIQUE(user_id, warning_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_warnings_user_id
ON subscription_warnings(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_warnings_sent_at
ON subscription_warnings(sent_at);

-- Create RPC function to create incident_warnings table (used by script)
CREATE OR REPLACE FUNCTION create_incident_warnings_table()
RETURNS void AS $$
BEGIN
    -- This function is called by the script to ensure table exists
    -- The actual table creation is handled above
    -- This is just a placeholder for the RPC call
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Create RPC function to create subscription_warnings table (used by script)
CREATE OR REPLACE FUNCTION create_subscription_warnings_table()
RETURNS void AS $$
BEGIN
    -- This function is called by the script to ensure table exists
    -- The actual table creation is handled above
    -- This is just a placeholder for the RPC call
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Add comment to tables
COMMENT ON TABLE incident_warnings IS 'Tracks incident deletion warning emails to prevent duplicates';
COMMENT ON TABLE subscription_warnings IS 'Tracks subscription renewal warning emails to prevent duplicates';

-- Grant permissions (adjust as needed for your Supabase setup)
-- ALTER TABLE incident_warnings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscription_warnings ENABLE ROW LEVEL SECURITY;
