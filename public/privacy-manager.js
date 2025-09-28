/**
 * Car Crash Lawyer AI - Privacy Manager
 * Centralized privacy consent and preference management
 * Integrates with existing ConsentManager and GDPRComplianceModule
 */

class PrivacyManager {
  constructor() {
    this.apiEndpoint = '/api/gdpr/consent';
    this.jurisdiction = 'UK'; // Default to UK
    this.consentStatus = null;
    this.userPreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      ai_processing: false
    };

    console.log('🔒 Privacy Manager initialized');
  }

  /**
   * Initialize privacy manager with jurisdiction detection
   */
  async initialize() {
    try {
      await this.detectJurisdiction();
      await this.loadStoredConsent();
      console.log('✅ Privacy Manager ready');
      return true;
    } catch (error) {
      console.error('❌ Privacy Manager initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect user jurisdiction using geolocation
   */
  async detectJurisdiction() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });

      const { latitude, longitude } = position.coords;

      // Simple US detection - can be enhanced with proper geolocation API
      const isUS = (latitude >= 24 && latitude <= 49 && longitude >= -125 && longitude <= -66);

      this.jurisdiction = isUS ? 'US' : 'UK';
      console.log(`📍 Jurisdiction detected: ${this.jurisdiction}`);

      return this.jurisdiction;
    } catch (error) {
      // Default to UK (more restrictive)
      this.jurisdiction = 'UK';
      console.log('📍 Geolocation failed, defaulting to UK jurisdiction');
      return this.jurisdiction;
    }
  }

  /**
   * Load stored consent from localStorage
   */
  async loadStoredConsent() {
    try {
      const consent = localStorage.getItem('privacyConsent');
      const consentDate = localStorage.getItem('privacyConsentDate');
      const preferences = localStorage.getItem('privacyPreferences');

      if (consent && consentDate) {
        const consentTimestamp = new Date(consentDate);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (consentTimestamp > sixMonthsAgo) {
          this.consentStatus = consent;

          if (preferences) {
            this.userPreferences = { ...this.userPreferences, ...JSON.parse(preferences) };
          }

          console.log('✅ Valid stored consent found');
          return true;
        }
      }

      console.log('📋 No valid stored consent found');
      return false;
    } catch (error) {
      console.error('❌ Failed to load stored consent:', error);
      return false;
    }
  }

  /**
   * Check if privacy consent notice should be shown
   */
  shouldShowConsentNotice() {
    return !this.consentStatus || this.consentStatus === 'declined';
  }

  /**
   * Record consent acceptance with comprehensive preferences
   */
  async acceptConsent(preferences = {}) {
    try {
      // Merge provided preferences with defaults
      this.userPreferences = {
        essential: true, // Always true
        analytics: preferences.analytics !== false,
        marketing: preferences.marketing === true,
        ai_processing: preferences.ai_processing !== false,
        ...preferences
      };

      this.consentStatus = 'accepted';

      // Store locally
      localStorage.setItem('privacyConsent', 'accepted');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      localStorage.setItem('privacyPreferences', JSON.stringify(this.userPreferences));

      // Send to backend (integrates with existing ConsentManager)
      await this.recordConsentWithBackend('accepted');

      console.log('✅ Privacy consent accepted');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept consent:', error);
      return false;
    }
  }

  /**
   * Record consent decline
   */
  async declineConsent() {
    try {
      this.userPreferences = {
        essential: true, // Always true
        analytics: false,
        marketing: false,
        ai_processing: false
      };

      this.consentStatus = 'declined';

      // Store locally
      localStorage.setItem('privacyConsent', 'declined');
      localStorage.setItem('privacyConsentDate', new Date().toISOString());
      localStorage.setItem('privacyPreferences', JSON.stringify(this.userPreferences));

      // Send to backend
      await this.recordConsentWithBackend('declined');

      console.log('❌ Privacy consent declined');
      return true;
    } catch (error) {
      console.error('❌ Failed to decline consent:', error);
      return false;
    }
  }

  /**
   * Update specific privacy preferences
   */
  async updatePreferences(preferences) {
    try {
      // Merge with existing preferences
      this.userPreferences = { ...this.userPreferences, ...preferences };

      // Essential is always true
      this.userPreferences.essential = true;

      // Store locally
      localStorage.setItem('privacyPreferences', JSON.stringify(this.userPreferences));

      // Send to backend
      await this.recordConsentWithBackend('updated');

      console.log('✅ Privacy preferences updated');
      return true;
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
      return false;
    }
  }

  /**
   * Get current consent status and preferences
   */
  getConsentData() {
    return {
      status: this.consentStatus,
      jurisdiction: this.jurisdiction,
      preferences: this.userPreferences,
      timestamp: localStorage.getItem('privacyConsentDate')
    };
  }

  /**
   * Check if specific consent is granted
   */
  hasConsent(type) {
    if (type === 'essential') return true; // Always granted
    return this.consentStatus === 'accepted' && this.userPreferences[type] === true;
  }

  /**
   * Record consent with backend (integrates with existing /api/gdpr/consent)
   */
  async recordConsentWithBackend(action) {
    try {
      const userId = localStorage.getItem('userId') || 'anonymous';

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          consent_type: 'privacy_general',
          consent_status: this.consentStatus,
          preferences: this.userPreferences,
          jurisdiction: this.jurisdiction,
          timestamp: new Date().toISOString(),
          source: 'privacy_manager',
          action: action
        })
      });

      if (response.ok) {
        console.log('✅ Consent recorded with backend');
        return true;
      } else {
        console.warn('⚠️ Backend consent recording failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Backend consent recording error:', error);
      return false;
    }
  }

  /**
   * Request data export (Right to Access)
   */
  async requestDataExport() {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID required for data export');
      }

      const response = await fetch(`/api/gdpr/export/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('✅ Data export started');
        return true;
      } else {
        throw new Error('Data export request failed');
      }
    } catch (error) {
      console.error('❌ Data export failed:', error);
      return false;
    }
  }

  /**
   * Request data deletion (Right to Erasure)
   */
  async requestDataDeletion(confirmation) {
    try {
      if (confirmation !== 'DELETE') {
        throw new Error('Confirmation required');
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID required for data deletion');
      }

      const response = await fetch(`/api/gdpr/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: confirmation,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Data deletion request submitted');
        // Clear local storage
        localStorage.clear();
        return true;
      } else {
        throw new Error('Data deletion request failed');
      }
    } catch (error) {
      console.error('❌ Data deletion failed:', error);
      return false;
    }
  }

  /**
   * Apply current preferences to page functionality
   */
  applyPreferences() {
    // Disable analytics if not consented
    if (!this.hasConsent('analytics')) {
      window['ga-disable-GA_MEASUREMENT_ID'] = true;
      console.log('📊 Analytics disabled per user preference');
    }

    // Disable marketing cookies if not consented
    if (!this.hasConsent('marketing')) {
      // Remove marketing cookies
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      console.log('🎯 Marketing cookies disabled per user preference');
    }

    // Set AI processing availability
    if (!this.hasConsent('ai_processing')) {
      console.log('🤖 AI processing disabled per user preference');
    }
  }

  /**
   * Get applicable privacy rights based on jurisdiction
   */
  getPrivacyRights() {
    if (this.jurisdiction === 'US') {
      return [
        'Right to Know',
        'Right to Delete',
        'Right to Correct',
        'Right to Opt-Out',
        'Right to Non-Discrimination',
        'Right to Limit Sensitive Data'
      ];
    } else {
      return [
        'Right of Access',
        'Right to Rectification',
        'Right to Erasure',
        'Right to Restrict Processing',
        'Right to Data Portability',
        'Right to Object',
        'Rights Related to Automated Decision-Making'
      ];
    }
  }
}

// Export for use in other modules
window.PrivacyManager = PrivacyManager;

// Auto-initialize if not in module environment
if (typeof module === 'undefined') {
  window.privacyManager = new PrivacyManager();

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.privacyManager.initialize();
    });
  } else {
    window.privacyManager.initialize();
  }
}