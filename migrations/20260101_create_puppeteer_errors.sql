-- Create puppeteer_errors table for debugging Puppeteer failures on Railway
CREATE TABLE IF NOT EXISTS puppeteer_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  environment TEXT,
  railway_env TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_puppeteer_errors_created_at ON puppeteer_errors(created_at DESC);

-- Add comment explaining the table
COMMENT ON TABLE puppeteer_errors IS 'Logs Puppeteer failures on Railway for debugging AI page rendering issues';
