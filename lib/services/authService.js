// ========================================
// SUPABASE AUTH SERVICE
// Handles all authentication operations
// ========================================

const { createClient } = require('@supabase/supabase-js');

class AuthService {
  constructor(supabaseUrl, supabaseKey, serviceRoleKey = null) {
    // Client for user operations (ANON key)
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });

    // Admin client for privileged operations (SERVICE_ROLE key)
    if (serviceRoleKey) {
      this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  }

  /**
   * Sign up new user with email and password
   * @param {string} email 
   * @param {string} password 
   * @param {Object} metadata - Additional user data
   * @returns {Object} - { user, session, error }
   */
  async signUp(email, password, metadata = {}) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: metadata, // Store name, phone, etc.
          emailRedirectTo: undefined // Disable email confirmation for now
        }
      });

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        session: data.session,
        userId: data.user?.id
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign in existing user
   * @param {string} email 
   * @param {string} password 
   * @returns {Object} - { user, session, error }
   */
  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        session: data.session,
        userId: data.user?.id
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sign out current user
   * @returns {Object} - { success, error }
   */
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current session from access token
   * @param {string} accessToken 
   * @returns {Object} - { user, session, error }
   */
  async getSession(accessToken) {
    try {
      const { data, error } = await this.supabase.auth.getUser(accessToken);

      if (error) throw error;

      return {
        success: true,
        user: data.user,
        userId: data.user?.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify session token and return user
   * @param {string} token 
   * @returns {Object}
   */
  async verifyToken(token) {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error) throw error;

      return {
        valid: true,
        user: data.user,
        userId: data.user?.id
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Reset password request
   * @param {string} email 
   * @returns {Object}
   */
  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user password
   * @param {string} newPassword 
   * @returns {Object}
   */
  async updatePassword(newPassword) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = AuthService;