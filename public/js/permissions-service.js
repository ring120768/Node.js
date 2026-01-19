/**
 * PermissionsService - Centralized permissions management
 * Handles Web Permissions API + Supabase tracking
 */
class PermissionsService {
  constructor() {
    this.permissionStates = {
      camera: 'not-requested',
      microphone: 'not-requested',
      location: 'not-requested'
    };
  }

  /**
   * Check current permission status using Permissions API
   * Gracefully falls back for Safari/unsupported browsers
   */
  async checkPermission(permissionType) {
    try {
      // Map our types to Permissions API names
      const permissionNames = {
        camera: 'camera',
        microphone: 'microphone',
        location: 'geolocation'
      };

      const name = permissionNames[permissionType];
      if (!name) throw new Error(`Invalid permission type: ${permissionType}`);

      // Check if Permissions API is supported (not in Safari < 16)
      if (!navigator.permissions || !navigator.permissions.query) {
        console.warn('Permissions API not supported, will request directly');
        return 'prompt'; // Assume we need to prompt
      }

      const result = await navigator.permissions.query({ name });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      console.warn(`Error checking ${permissionType} permission:`, error);
      return 'prompt'; // Safe default
    }
  }

  /**
   * Request camera permission using getUserMedia
   */
  async requestCameraPermission() {
    try {
      await this.logPermissionRequest('camera');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Stop stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      await this.updatePermissionStatus('camera', 'granted');
      this.permissionStates.camera = 'granted';
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      await this.updatePermissionStatus('camera', 'denied');
      this.permissionStates.camera = 'denied';
      return false;
    }
  }

  /**
   * Request microphone permission using getUserMedia
   */
  async requestMicrophonePermission() {
    try {
      await this.logPermissionRequest('microphone');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Stop stream immediately
      stream.getTracks().forEach(track => track.stop());

      await this.updatePermissionStatus('microphone', 'granted');
      this.permissionStates.microphone = 'granted';
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      await this.updatePermissionStatus('microphone', 'denied');
      this.permissionStates.microphone = 'denied';
      return false;
    }
  }

  /**
   * Request location permission using Geolocation API
   */
  async requestLocationPermission() {
    return new Promise((resolve) => {
      this.logPermissionRequest('location');

      navigator.geolocation.getCurrentPosition(
        async () => {
          await this.updatePermissionStatus('location', 'granted');
          this.permissionStates.location = 'granted';
          resolve(true);
        },
        async (error) => {
          console.error('Location permission denied:', error);
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
      console.error('Error updating permission status:', error);
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
      console.error('Error logging permission request:', error);
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
      console.error('Error fetching permission states:', error);
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
