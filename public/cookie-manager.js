/**
 * Car Crash Lawyer AI - Cookie Manager
 * Handles cookie preferences, compliance, and management
 * Works with PrivacyManager for comprehensive consent handling
 */

class CookieManager {
  constructor() {
    this.cookiePrefix = 'ccl_';
    this.consentCookieName = 'ccl_consent_preferences';
    this.cookieCategories = {
      essential: {
        name: 'Essential Cookies',
        description: 'Required for basic website functionality',
        required: true,
        cookies: ['session_id', 'csrf_token', 'consent_preferences']
      },
      analytics: {
        name: 'Analytics Cookies',
        description: 'Help us understand website usage',
        required: false,
        cookies: ['_ga', '_ga_*', '_gid', 'hotjar_*']
      },
      marketing: {
        name: 'Marketing Cookies',
        description: 'Personalized advertising and content',
        required: false,
        cookies: ['fb_pixel', 'google_ads', 'linkedin_insight']
      }
    };

    this.preferences = {
      essential: true,
      analytics: false,
      marketing: false
    };

    console.log('🍪 Cookie Manager initialized');
  }

  /**
   * Initialize cookie manager and load preferences
   */
  async initialize() {
    try {
      await this.loadCookiePreferences();
      this.applyCookiePreferences();
      this.setupCookieControls();
      console.log('✅ Cookie Manager ready');
      return true;
    } catch (error) {
      console.error('❌ Cookie Manager initialization failed:', error);
      return false;
    }
  }

  /**
   * Load cookie preferences from storage
   */
  async loadCookiePreferences() {
    try {
      // Try localStorage first (for session persistence)
      const storedPrefs = localStorage.getItem('cookiePreferences');
      if (storedPrefs) {
        this.preferences = { ...this.preferences, ...JSON.parse(storedPrefs) };
        console.log('🍪 Cookie preferences loaded from localStorage');
        return;
      }

      // Fall back to cookie storage
      const cookieValue = this.getCookie(this.consentCookieName);
      if (cookieValue) {
        this.preferences = { ...this.preferences, ...JSON.parse(cookieValue) };
        console.log('🍪 Cookie preferences loaded from cookie');
        return;
      }

      console.log('🍪 No stored cookie preferences found');
    } catch (error) {
      console.error('❌ Failed to load cookie preferences:', error);
    }
  }

  /**
   * Save cookie preferences to both localStorage and cookies
   */
  async saveCookiePreferences() {
    try {
      const prefsJson = JSON.stringify(this.preferences);

      // Save to localStorage
      localStorage.setItem('cookiePreferences', prefsJson);

      // Save to cookie (1 year expiry)
      this.setCookie(this.consentCookieName, prefsJson, 365);

      // Apply preferences immediately
      this.applyCookiePreferences();

      // Integrate with Privacy Manager if available
      if (window.privacyManager) {
        await window.privacyManager.updatePreferences(this.preferences);
      }

      console.log('✅ Cookie preferences saved');
      return true;
    } catch (error) {
      console.error('❌ Failed to save cookie preferences:', error);
      return false;
    }
  }

  /**
   * Update specific cookie category preference
   */
  async updateCategoryPreference(category, enabled) {
    if (category === 'essential') {
      console.warn('⚠️ Essential cookies cannot be disabled');
      return false;
    }

    if (this.cookieCategories[category]) {
      this.preferences[category] = enabled;
      await this.saveCookiePreferences();
      console.log(`🍪 ${category} cookies ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }

    console.error(`❌ Unknown cookie category: ${category}`);
    return false;
  }

  /**
   * Accept all non-essential cookies
   */
  async acceptAllCookies() {
    this.preferences = {
      essential: true,
      analytics: true,
      marketing: true
    };

    await this.saveCookiePreferences();
    console.log('✅ All cookies accepted');
    return true;
  }

  /**
   * Decline all non-essential cookies
   */
  async declineNonEssentialCookies() {
    this.preferences = {
      essential: true,
      analytics: false,
      marketing: false
    };

    await this.saveCookiePreferences();
    this.removeNonEssentialCookies();
    console.log('❌ Non-essential cookies declined');
    return true;
  }

  /**
   * Apply current cookie preferences to the page
   */
  applyCookiePreferences() {
    // Analytics cookies
    if (!this.preferences.analytics) {
      this.disableAnalytics();
      this.removeCookiesByCategory('analytics');
    } else {
      this.enableAnalytics();
    }

    // Marketing cookies
    if (!this.preferences.marketing) {
      this.disableMarketing();
      this.removeCookiesByCategory('marketing');
    } else {
      this.enableMarketing();
    }

    console.log('🍪 Cookie preferences applied');
  }

  /**
   * Disable analytics tracking
   */
  disableAnalytics() {
    // Disable Google Analytics
    window['ga-disable-GA_MEASUREMENT_ID'] = true;

    // Disable Hotjar
    if (window.hj) {
      window.hj('doNotTrack', true);
    }

    console.log('📊 Analytics tracking disabled');
  }

  /**
   * Enable analytics tracking
   */
  enableAnalytics() {
    // Enable Google Analytics
    window['ga-disable-GA_MEASUREMENT_ID'] = false;

    // Re-enable Hotjar
    if (window.hj) {
      window.hj('doNotTrack', false);
    }

    console.log('📊 Analytics tracking enabled');
  }

  /**
   * Disable marketing tracking
   */
  disableMarketing() {
    // Disable Facebook Pixel
    if (window.fbq) {
      window.fbq('consent', 'revoke');
    }

    // Disable Google Ads
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    }

    console.log('🎯 Marketing tracking disabled');
  }

  /**
   * Enable marketing tracking
   */
  enableMarketing() {
    // Enable Facebook Pixel
    if (window.fbq) {
      window.fbq('consent', 'grant');
    }

    // Enable Google Ads
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted'
      });
    }

    console.log('🎯 Marketing tracking enabled');
  }

  /**
   * Remove cookies by category
   */
  removeCookiesByCategory(category) {
    if (!this.cookieCategories[category]) return;

    const cookies = this.cookieCategories[category].cookies;
    cookies.forEach(cookieName => {
      if (cookieName.includes('*')) {
        // Handle wildcard cookies
        const prefix = cookieName.replace('*', '');
        this.removeCookiesByPrefix(prefix);
      } else {
        this.deleteCookie(cookieName);
      }
    });

    console.log(`🗑️ Removed ${category} cookies`);
  }

  /**
   * Remove all non-essential cookies
   */
  removeNonEssentialCookies() {
    this.removeCookiesByCategory('analytics');
    this.removeCookiesByCategory('marketing');
  }

  /**
   * Remove cookies by prefix (for wildcard cookies)
   */
  removeCookiesByPrefix(prefix) {
    document.cookie.split(';').forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName.startsWith(prefix)) {
        this.deleteCookie(cookieName);
      }
    });
  }

  /**
   * Setup cookie control UI elements
   */
  setupCookieControls() {
    // Setup toggle switches
    Object.keys(this.cookieCategories).forEach(category => {
      const toggle = document.getElementById(`${category}Toggle`);
      if (toggle) {
        toggle.checked = this.preferences[category];
        toggle.addEventListener('change', async (e) => {
          await this.updateCategoryPreference(category, e.target.checked);
        });
      }
    });

    // Setup action buttons
    const acceptAllBtn = document.getElementById('acceptAllCookies');
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => this.acceptAllCookies());
    }

    const declineAllBtn = document.getElementById('declineAllCookies');
    if (declineAllBtn) {
      declineAllBtn.addEventListener('click', () => this.declineNonEssentialCookies());
    }

    const savePrefsBtn = document.getElementById('saveCookiePreferences');
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => this.saveCookiePreferences());
    }

    console.log('🎛️ Cookie controls setup complete');
  }

  /**
   * Get current cookie preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Check if specific cookie category is enabled
   */
  isCategoryEnabled(category) {
    return this.preferences[category] === true;
  }

  /**
   * Get cookie categories and their status
   */
  getCookieCategories() {
    return Object.keys(this.cookieCategories).map(key => ({
      id: key,
      ...this.cookieCategories[key],
      enabled: this.preferences[key]
    }));
  }

  /**
   * Utility: Set cookie
   */
  setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  /**
   * Utility: Get cookie
   */
  getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  /**
   * Utility: Delete cookie
   */
  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Generate cookie policy report
   */
  generateCookieReport() {
    const report = {
      timestamp: new Date().toISOString(),
      preferences: this.preferences,
      categories: this.getCookieCategories(),
      activeCookies: document.cookie.split(';').map(c => c.split('=')[0].trim()),
      compliance: {
        essential: true,
        analytics: this.preferences.analytics,
        marketing: this.preferences.marketing
      }
    };

    console.log('📋 Cookie report generated:', report);
    return report;
  }
}

// Export for use in other modules
window.CookieManager = CookieManager;

// Auto-initialize if not in module environment
if (typeof module === 'undefined') {
  window.cookieManager = new CookieManager();

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.cookieManager.initialize();
    });
  } else {
    window.cookieManager.initialize();
  }
}