/**
 * Native Bridge - Capacitor Integration Layer
 *
 * This file provides a unified interface for native features when running
 * as a mobile app via Capacitor, with graceful fallbacks for web browser.
 *
 * Usage: Include this script BEFORE other app scripts that need native features.
 *
 * Features:
 * - Platform detection (iOS, Android, Web)
 * - Push notifications
 * - Biometric authentication (Face ID, Touch ID, Fingerprint)
 * - Native camera access
 * - Native share sheet
 * - Stripe checkout via system browser
 * - Haptic feedback
 */

// Create global namespace
window.NativeBridge = window.NativeBridge || {};

(function(NativeBridge) {
  'use strict';

  // ============================================
  // PLATFORM DETECTION
  // ============================================

  /**
   * Detect if running inside Capacitor native app
   */
  NativeBridge.isNative = function() {
    return window.Capacitor && window.Capacitor.isNativePlatform();
  };

  /**
   * Get current platform: 'ios', 'android', or 'web'
   */
  NativeBridge.getPlatform = function() {
    if (!window.Capacitor) return 'web';
    return window.Capacitor.getPlatform();
  };

  /**
   * Check if running on iOS
   */
  NativeBridge.isIOS = function() {
    return NativeBridge.getPlatform() === 'ios';
  };

  /**
   * Check if running on Android
   */
  NativeBridge.isAndroid = function() {
    return NativeBridge.getPlatform() === 'android';
  };

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  let pushNotificationsPlugin = null;

  /**
   * Initialise push notifications
   * @returns {Promise<{granted: boolean, token?: string}>}
   */
  NativeBridge.initPushNotifications = async function() {
    if (!NativeBridge.isNative()) {
      console.log('[NativeBridge] Push notifications not available on web');
      return { granted: false };
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      pushNotificationsPlugin = PushNotifications;

      // Request permission
      const permResult = await PushNotifications.requestPermissions();

      if (permResult.receive !== 'granted') {
        console.log('[NativeBridge] Push notification permission denied');
        return { granted: false };
      }

      // Register for push
      await PushNotifications.register();

      return new Promise((resolve) => {
        // Listen for registration success
        PushNotifications.addListener('registration', async (token) => {
          console.log('[NativeBridge] Push token received:', token.value.substring(0, 20) + '...');

          // Send token to backend
          try {
            await fetch('/api/user/push-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: token.value,
                platform: NativeBridge.getPlatform()
              }),
              credentials: 'include'
            });
          } catch (err) {
            console.error('[NativeBridge] Failed to save push token:', err);
          }

          resolve({ granted: true, token: token.value });
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('[NativeBridge] Push registration error:', error);
          resolve({ granted: false, error: error.error });
        });
      });

    } catch (err) {
      console.error('[NativeBridge] Push init error:', err);
      return { granted: false, error: err.message };
    }
  };

  /**
   * Add listener for received push notifications
   * @param {Function} callback - Called with notification data
   */
  NativeBridge.onPushReceived = function(callback) {
    if (!pushNotificationsPlugin) {
      console.warn('[NativeBridge] Push not initialised');
      return;
    }

    pushNotificationsPlugin.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativeBridge] Push received:', notification);
      callback(notification);
    });
  };

  /**
   * Add listener for push notification taps
   * @param {Function} callback - Called with action data
   */
  NativeBridge.onPushTapped = function(callback) {
    if (!pushNotificationsPlugin) {
      console.warn('[NativeBridge] Push not initialised');
      return;
    }

    pushNotificationsPlugin.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[NativeBridge] Push tapped:', action);
      callback(action);
    });
  };

  // ============================================
  // BIOMETRIC AUTHENTICATION
  // ============================================

  /**
   * Check if biometric auth is available
   * @returns {Promise<{available: boolean, biometryType?: string}>}
   */
  NativeBridge.checkBiometrics = async function() {
    if (!NativeBridge.isNative()) {
      return { available: false };
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable();

      return {
        available: result.isAvailable,
        biometryType: result.biometryType // 'touchId', 'faceId', 'fingerprint', etc.
      };
    } catch (err) {
      console.error('[NativeBridge] Biometric check error:', err);
      return { available: false };
    }
  };

  /**
   * Authenticate with biometrics
   * @param {string} reason - Reason shown to user
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  NativeBridge.authenticateWithBiometrics = async function(reason = 'Verify your identity') {
    if (!NativeBridge.isNative()) {
      return { success: false, error: 'Not available on web' };
    }

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');

      await NativeBiometric.verifyIdentity({
        reason: reason,
        title: 'Car Crash Lawyer AI',
        subtitle: 'Secure Login',
        description: reason,
      });

      return { success: true };
    } catch (err) {
      console.error('[NativeBridge] Biometric auth error:', err);
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  /**
   * Store credentials securely using biometrics
   * @param {string} username
   * @param {string} password
   */
  NativeBridge.storeCredentials = async function(username, password) {
    if (!NativeBridge.isNative()) return false;

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');

      await NativeBiometric.setCredentials({
        username: username,
        password: password,
        server: 'com.carcrashlawyerai.app',
      });

      return true;
    } catch (err) {
      console.error('[NativeBridge] Store credentials error:', err);
      return false;
    }
  };

  /**
   * Retrieve stored credentials after biometric verification
   * @returns {Promise<{username?: string, password?: string}>}
   */
  NativeBridge.getCredentials = async function() {
    if (!NativeBridge.isNative()) return {};

    try {
      const { NativeBiometric } = await import('capacitor-native-biometric');

      const credentials = await NativeBiometric.getCredentials({
        server: 'com.carcrashlawyerai.app',
      });

      return credentials;
    } catch (err) {
      console.error('[NativeBridge] Get credentials error:', err);
      return {};
    }
  };

  // ============================================
  // NATIVE CAMERA
  // ============================================

  /**
   * Take a photo using native camera
   * @param {Object} options
   * @returns {Promise<{success: boolean, base64?: string, error?: string}>}
   */
  NativeBridge.takePhoto = async function(options = {}) {
    const defaults = {
      quality: 85,
      allowEditing: false,
      saveToGallery: false,
    };
    const opts = { ...defaults, ...options };

    // If not native, fall back to file input
    if (!NativeBridge.isNative()) {
      return NativeBridge._webCameraFallback();
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: opts.quality,
        allowEditing: opts.allowEditing,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: opts.saveToGallery,
        correctOrientation: true,
      });

      return {
        success: true,
        base64: image.base64String,
        format: image.format,
      };
    } catch (err) {
      console.error('[NativeBridge] Camera error:', err);
      return { success: false, error: err.message || 'Camera failed' };
    }
  };

  /**
   * Pick photo from gallery
   * @returns {Promise<{success: boolean, base64?: string}>}
   */
  NativeBridge.pickPhoto = async function() {
    if (!NativeBridge.isNative()) {
      return NativeBridge._webCameraFallback();
    }

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

      const image = await Camera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
        correctOrientation: true,
      });

      return {
        success: true,
        base64: image.base64String,
        format: image.format,
      };
    } catch (err) {
      console.error('[NativeBridge] Gallery error:', err);
      return { success: false, error: err.message };
    }
  };

  /**
   * Web fallback for camera - uses file input
   */
  NativeBridge._webCameraFallback = function() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';  // Prefer back camera

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve({ success: false, error: 'No file selected' });
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve({ success: true, base64: base64 });
        };
        reader.onerror = () => {
          resolve({ success: false, error: 'Failed to read file' });
        };
        reader.readAsDataURL(file);
      };

      input.click();
    });
  };

  // ============================================
  // NATIVE SHARE
  // ============================================

  /**
   * Share content using native share sheet
   * @param {Object} options - { title, text, url, files }
   */
  NativeBridge.share = async function(options = {}) {
    // Use Web Share API if available (works on mobile browsers too)
    if (navigator.share && !NativeBridge.isNative()) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return { success: true };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, cancelled: true };
        }
        return { success: false, error: err.message };
      }
    }

    // Use Capacitor Share plugin for native
    if (NativeBridge.isNative()) {
      try {
        const { Share } = await import('@capacitor/share');

        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.title || 'Share',
        });

        return { success: true };
      } catch (err) {
        console.error('[NativeBridge] Share error:', err);
        return { success: false, error: err.message };
      }
    }

    // Fallback: copy to clipboard
    if (navigator.clipboard && options.url) {
      try {
        await navigator.clipboard.writeText(options.url);
        return { success: true, fallback: 'clipboard' };
      } catch (err) {
        return { success: false, error: 'Share not supported' };
      }
    }

    return { success: false, error: 'Share not supported' };
  };

  // ============================================
  // STRIPE CHECKOUT (External Browser)
  // ============================================

  /**
   * Open Stripe checkout in system browser
   * Required by Apple for external payment flows
   * @param {string} tier - Subscription tier: 'standard', 'premium', 'family', 'business'
   * @param {string} userId - Current user ID
   */
  NativeBridge.openStripeCheckout = async function(tier, userId) {
    try {
      // Create checkout session on backend
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: tier,
          userId: userId,
          successUrl: window.location.origin + '/payment-success.html',
          cancelUrl: window.location.origin + '/subscribe.html',
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { checkoutUrl } = await response.json();

      // Open in system browser (required by Apple for external payments)
      if (NativeBridge.isNative()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: checkoutUrl });
      } else {
        // Web: redirect in same window
        window.location.href = checkoutUrl;
      }

      return { success: true };
    } catch (err) {
      console.error('[NativeBridge] Stripe checkout error:', err);
      return { success: false, error: err.message };
    }
  };

  // ============================================
  // HAPTIC FEEDBACK
  // ============================================

  /**
   * Trigger haptic feedback
   * @param {'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'} style
   */
  NativeBridge.haptic = async function(style = 'medium') {
    if (!NativeBridge.isNative()) return;

    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

      switch (style) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch (err) {
      // Silently fail - haptics are nice-to-have
    }
  };

  // ============================================
  // APP LIFECYCLE
  // ============================================

  /**
   * Handle app returning to foreground
   * @param {Function} callback
   */
  NativeBridge.onAppResume = async function(callback) {
    if (!NativeBridge.isNative()) return;

    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          callback();
        }
      });
    } catch (err) {
      console.error('[NativeBridge] App listener error:', err);
    }
  };

  /**
   * Handle deep links / universal links
   * @param {Function} callback - Called with URL data
   */
  NativeBridge.onDeepLink = async function(callback) {
    if (!NativeBridge.isNative()) return;

    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appUrlOpen', (data) => {
        console.log('[NativeBridge] Deep link:', data.url);
        callback(data.url);
      });
    } catch (err) {
      console.error('[NativeBridge] Deep link listener error:', err);
    }
  };

  // ============================================
  // INITIALISATION
  // ============================================

  /**
   * Initialise native features
   * Call this on app startup
   */
  NativeBridge.init = async function() {
    console.log('[NativeBridge] Platform:', NativeBridge.getPlatform());
    console.log('[NativeBridge] Is Native:', NativeBridge.isNative());

    if (NativeBridge.isNative()) {
      // Hide splash screen after a short delay
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        setTimeout(() => {
          SplashScreen.hide();
        }, 500);
      } catch (err) {
        console.error('[NativeBridge] Splash screen error:', err);
      }

      // Set status bar style
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Light });
        if (NativeBridge.isAndroid()) {
          await StatusBar.setBackgroundColor({ color: '#0ea5e9' });
        }
      } catch (err) {
        console.error('[NativeBridge] Status bar error:', err);
      }
    }

    return {
      platform: NativeBridge.getPlatform(),
      isNative: NativeBridge.isNative(),
    };
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NativeBridge.init());
  } else {
    NativeBridge.init();
  }

})(window.NativeBridge);
