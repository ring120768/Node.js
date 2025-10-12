
/**
 * Supabase Admin Client - Server-side only
 * Uses SERVICE_ROLE_KEY for privileged operations
 * ❌ NEVER use in browser/frontend code
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../src/config');

// Server-side admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

module.exports = { supabaseAdmin };
