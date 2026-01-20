/**
 * PermissionsService - Centralized permissions management
 * Handles Web Permissions API + Native Capacitor Plugin + Supabase tracking
 *
 * When running in Capacitor native app (Android APK), uses the WebViewPermission
 * plugin to properly bridge permissions between WebView and Android OS.
 */
class PermissionsService {
  constructor() {
    this.permissionStates = {
      camera: 'not-requested',
      microphone: 'not-requested',
      location: 'not-requested'
    };

    // Will be set to true if native plugin is available
    this.hasNativePlugin = false;
    this.nativePlugin = null;

    // Initialize native plugin detection
    this._initNativePlugin();
  }

  /**
   * Check if running in Capacitor native app
   */
  isCapacitorApp() {
    return window.Capacitor &&
           window.Capacitor.isNativePlatform &&
           window.Capacitor.isNativePlatform();
  }

  /**
   * Initialize native plugin if available (Capacitor Android/iOS)
   */
  _initNativePlugin() {
    if (this.isCapacitorApp()) {
      // Try to get the WebViewPermission plugin
      try {
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.WebViewPermission) {
          this.nativePlugin = window.Capacitor.Plugins.WebViewPermission;
          this.hasNativePlugin = true;
          console.log('[PermissionsService] Native WebViewPermission plugin detected');
        } else {
          console.log('[PermissionsService] Running in Capacitor but plugin not registered yet');
          // Try again after a short delay (plugin may register asynchronously)
          setTimeout(() => {
            if (window.Capacitor.Plugins && window.Capacitor.Plugins.WebViewPermission) {
              this.nativePlugin = window.Capacitor.Plugins.WebViewPermission;
              this.hasNativePlugin = true;
              console.log('[PermissionsService] Native plugin detected on retry');
            }
          }, 500);
        }
      } catch (error) {
        console.warn('[PermissionsService] Error detecting native plugin:', error);
      }
    } else {
      console.log('[PermissionsService] Running in browser, using Web APIs');
    }
  }

  /**
   * Check current permission status
   * Uses native plugin on Capacitor, Web Permissions API in browser
   */
  async checkPermission(permissionType) {
    console.log(`[PermissionsService] checkPermission(${permissionType}), hasNativePlugin: ${this.hasNativePlugin}`);

    // Try native plugin first if available
    if (this.hasNativePlugin && this.nativePlugin) {
      try {
        console.log(`[PermissionsService] Using native plugin to check ${permissionType}`);
        const result = await this.nativePlugin.checkPermission({ permission: permissionType });
        console.log(`[PermissionsService] Native check result:`, result);
        return result.state || (result.granted ? 'granted' : 'prompt');
      } catch (error) {
        console.warn(`[PermissionsService] Native check failed, falling back to Web API:`, error);
      }
    }

    // Fall back to Web Permissions API
    try {
      const permissionNames = {
        camera: 'camera',
        microphone: 'microphone',
        location: 'geolocation'
      };

      const name = permissionNames[permissionType];
      if (!name) throw new Error(`Invalid permission type: ${permissionType}`);

      // Check if Permissions API is supported (not in Safari < 16)
      if (!navigator.permissions || !navigator.permissions.query) {
        console.warn('[PermissionsService] Permissions API not supported, will request directly');
        return 'prompt';
      }

      const result = await navigator.permissions.query({ name });
      console.log(`[PermissionsService] Web API check result for ${permissionType}:`, result.state);
      return result.state;
    } catch (error) {
      console.warn(`[PermissionsService] Error checking ${permissionType} permission:`, error);
      return 'prompt';
    }
  }

  /**
   * Request camera permission
   * Uses native plugin on Capacitor for proper Android bridging
   */
  async requestCameraPermission() {
    try {
      await this.logPermissionRequest('camera');

      // Try native plugin first
      if (this.hasNativePlugin && this.nativePlugin) {
        console.log('[PermissionsService] Requesting camera via native plugin');
        const result = await this.nativePlugin.requestPermission({ permission: 'camera' });
        console.log('[PermissionsService] Native camera result:', result);

        if (result.granted) {
          await this.updatePermissionStatus('camera', 'granted');
          this.permissionStates.camera = 'granted';
          return true;
        } else {
          await this.updatePermissionStatus('camera', 'denied');
          this.permissionStates.camera = 'denied';
          return false;
        }
      }

      // Fall back to getUserMedia
      console.log('[PermissionsService] Requesting camera via getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Stop stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      await this.updatePermissionStatus('camera', 'granted');
      this.permissionStates.camera = 'granted';
      return true;
    } catch (error) {
      console.error('[PermissionsService] Camera permission denied:', error);
      await this.updatePermissionStatus('camera', 'denied');
      this.permissionStates.camera = 'denied';
      return false;
    }
  }

  /**
   * Request microphone permission
   * Uses native plugin on Capacitor for proper Android bridging
   */
  async requestMicrophonePermission() {
    try {
      await this.logPermissionRequest('microphone');

      // Try native plugin first
      if (this.hasNativePlugin && this.nativePlugin) {
        console.log('[PermissionsService] Requesting microphone via native plugin');
        const result = await this.nativePlugin.requestPermission({ permission: 'microphone' });
        console.log('[PermissionsService] Native microphone result:', result);

        if (result.granted) {
          await this.updatePermissionStatus('microphone', 'granted');
          this.permissionStates.microphone = 'granted';
          return true;
        } else {
          await this.updatePermissionStatus('microphone', 'denied');
          this.permissionStates.microphone = 'denied';
          return false;
        }
      }

      // Fall back to getUserMedia
      console.log('[PermissionsService] Requesting microphone via getUserMedia');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop stream immediately
      stream.getTracks().forEach(track => track.stop());

      await this.updatePermissionStatus('microphone', 'granted');
      this.permissionStates.microphone = 'granted';
      return true;
    } catch (error) {
      console.error('[PermissionsService] Microphone permission denied:', error);
      await this.updatePermissionStatus('microphone', 'denied');
      this.permissionStates.microphone = 'denied';
      return false;
    }
  }

  /**
   * Request location permission using Geolocation API
   */
  async requestLocationPermission() {
    return new Promise(async (resolve) => {
      await this.logPermissionRequest('location');

      // Try native plugin first
      if (this.hasNativePlugin && this.nativePlugin) {
        try {
          console.log('[PermissionsService] Requesting location via native plugin');
          const result = await this.nativePlugin.requestPermission({ permission: 'location' });
          console.log('[PermissionsService] Native location result:', result);

          if (result.granted) {
            await this.updatePermissionStatus('location', 'granted');
            this.permissionStates.location = 'granted';
            resolve(true);
            return;
          } else {
            await this.updatePermissionStatus('location', 'denied');
            this.permissionStates.location = 'denied';
            resolve(false);
            return;
          }
        } catch (error) {
          console.warn('[PermissionsService] Native location request failed, falling back:', error);
        }
      }

      // Fall back to Geolocation API
      console.log('[PermissionsService] Requesting location via Geolocation API');
      navigator.geolocation.getCurrentPosition(
        async () => {
          await this.updatePermissionStatus('location', 'granted');
          this.permissionStates.location = 'granted';
          resolve(true);
        },
        async (error) => {
          console.error('[PermissionsService] Location permission denied:', error);
          await this.updatePermissionStatus('location', 'denied');
          this.permissionStates.location = 'denied';
          resolve(false);
        },
        { timeout: 5000 }
      );
    });
  }

  /**
   * Request all permissions at once (for signup flow)
   */
  async requestAllPermissions() {
    const results = {
      camera: await this.requestCameraPermission(),
      microphone: await this.requestMicrophonePermission(),
      location: await this.requestLocationPermission()
    };

    const allGranted = Object.values(results).every(granted => granted);
    return { results, allGranted };
  }

  /**
   * Check all permissions via native plugin (if available)
   */
  async checkAllNativePermissions() {
    if (this.hasNativePlugin && this.nativePlugin) {
      try {
        const result = await this.nativePlugin.checkAllPermissions();
        console.log('[PermissionsService] All native permissions:', result);
        return result;
      } catch (error) {
        console.warn('[PermissionsService] Error checking all native permissions:', error);
      }
    }
    return null;
  }

  /**
   * Open app settings (native only)
   */
  async openAppSettings() {
    if (this.hasNativePlugin && this.nativePlugin) {
      try {
        const result = await this.nativePlugin.openSettings();
        return result.success;
      } catch (error) {
        console.error('[PermissionsService] Error opening settings:', error);
      }
    }

    // Fallback for when plugin isn't available
    if (this.isCapacitorApp() && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      try {
        await window.Capacitor.Plugins.App.openUrl({ url: 'app-settings:' });
        return true;
      } catch (error) {
        console.error('[PermissionsService] Fallback settings open failed:', error);
      }
    }

    return false;
  }

  /**
   * Update permission status in database
   */
  async updatePermissionStatus(permission, status) {
    try {
      const response = await fetch('/api/permissions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission, status })
      });

      if (!response.ok) {
        throw new Error(`Failed to update permission: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[PermissionsService] Error updating permission status:', error);
    }
  }

  /**
   * Log permission request attempt
   */
  async logPermissionRequest(permission) {
    try {
      await fetch('/api/permissions/log-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission })
      });
    } catch (error) {
      console.error('[PermissionsService] Error logging permission request:', error);
    }
  }

  /**
   * Get current permission states from database
   */
  async fetchPermissionStates() {
    try {
      const response = await fetch('/api/permissions/status');
      if (!response.ok) throw new Error('Failed to fetch permissions');

      const data = await response.json();
      this.permissionStates = {
        camera: data.camera_permission || 'not-requested',
        microphone: data.microphone_permission || 'not-requested',
        location: data.location_permission || 'not-requested'
      };

      return this.permissionStates;
    } catch (error) {
      console.error('[PermissionsService] Error fetching permission states:', error);
      return this.permissionStates;
    }
  }

  /**
   * Detect user's platform for showing platform-specific instructions
   */
  detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();

    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/mac/.test(ua)) return 'mac';
    if (/win/.test(ua)) return 'windows';
    if (/linux/.test(ua)) return 'linux';

    return 'unknown';
  }
}

// Export as global singleton
window.PermissionsService = new PermissionsService();
