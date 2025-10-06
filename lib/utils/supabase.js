
// ========================================
// SUPABASE CLIENT UTILITY
// Centralized Supabase client configuration
// ========================================

const { createClient } = require('@supabase/supabase-js');

/**
 * Create Supabase client with standard configuration
 * @param {string} url 
 * @param {string} key 
 * @param {Object} options 
 * @returns {Object}
 */
function createSupabaseClient(url, key, options = {}) {
  const defaultOptions = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'car-crash-lawyer-ai',
        'x-refresh-schema': 'true'
      }
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };
  return createClient(url, key, mergedOptions);
}

/**
 * Test Supabase connection
 * @param {Object} supabaseClient 
 * @returns {Promise<boolean>}
 */
async function testSupabaseConnection(supabaseClient) {
  try {
    const { data, error } = await supabaseClient
      .from('user_signup')
      .select('*')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

module.exports = {
  createSupabaseClient,
  testSupabaseConnection
};
