/**
 * Push Notifications Client-Side Handler
 * Registers device for push notifications and handles incoming notifications
 *
 * Works with Capacitor Push Notifications plugin
 * Saves FCM token to user profile for server-side sending
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

let fcmToken = null;

/**
 * Check if push notifications are available on this platform
 * @returns {boolean}
 */
function isAvailable() {
  // Only available on iOS and Android
  return Capacitor.isNativePlatform();
}

/**
 * Initialize push notifications
 * Requests permission and registers device
 */
async function initialize() {
  if (!isAvailable()) {
    console.log('[Push] Not available on this platform (web)');
    return;
  }

  try {
    // Request permission
    const permissionResult = await PushNotifications.requestPermissions();

    if (permissionResult.receive === 'granted') {
      console.log('[Push] Permission granted, registering device...');
      await PushNotifications.register();
    } else {
      console.log('[Push] Permission denied');
      return;
    }

    // Listen for registration success
    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Device registered:', token.value.substring(0, 20) + '...');
      fcmToken = token.value;

      // Save token to user profile
      await saveTokenToProfile(token.value);
    });

    // Listen for registration error
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // Listen for notification received (app in foreground)
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received:', notification);

      // Show in-app notification (since app is open)
      showInAppNotification(notification.title, notification.body);
    });

    // Listen for notification tapped (app in background/closed)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action);

      const data = action.notification.data;
      handleNotificationAction(data);
    });

    console.log('[Push] Initialization complete');

  } catch (error) {
    console.error('[Push] Initialization failed:', error);
  }
}

/**
 * Save FCM token to user profile in database
 * @param {string} token - FCM device token
 */
async function saveTokenToProfile(token) {
  try {
    const response = await fetch('/api/profile/update-fcm-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Send auth cookies
      body: JSON.stringify({ fcmToken: token }),
    });

    if (response.ok) {
      console.log('[Push] Token saved to profile');
    } else {
      console.error('[Push] Failed to save token:', response.statusText);
    }
  } catch (error) {
    console.error('[Push] Error saving token:', error);
  }
}

/**
 * Show in-app notification banner
 * (When notification received while app is open)
 * @param {string} title
 * @param {string} body
 */
function showInAppNotification(title, body) {
  // Create notification banner at top of screen
  const banner = document.createElement('div');
  banner.className = 'push-notification-banner';
  banner.innerHTML = `
    <div class="push-notification-content">
      <strong>${title}</strong>
      <p>${body}</p>
    </div>
  `;

  // Add styles
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #0E7490;
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 90%;
    animation: slideDown 0.3s ease-out;
  `;

  document.body.appendChild(banner);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    banner.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  }, 5000);

  // Remove on tap
  banner.addEventListener('click', () => {
    banner.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => banner.remove(), 300);
  });
}

/**
 * Handle notification action (when user taps notification)
 * @param {Object} data - Notification data payload
 */
function handleNotificationAction(data) {
  console.log('[Push] Handling action:', data);

  switch (data.type) {
    case 'pdf_ready':
      // Navigate to report page
      if (data.reportUrl) {
        window.location.href = '/report.html';
      }
      break;

    case 'ai_complete':
      // Navigate to transcription status page
      window.location.href = '/transcription-status.html';
      break;

    case 'processing_started':
      // Navigate to dashboard
      window.location.href = '/dashboard.html';
      break;

    default:
      // Default action - open dashboard
      window.location.href = '/dashboard.html';
  }
}

/**
 * Get current device token
 * @returns {string|null}
 */
function getToken() {
  return fcmToken;
}

/**
 * Check if notifications are enabled (permission granted)
 * @returns {Promise<boolean>}
 */
async function areNotificationsEnabled() {
  if (!isAvailable()) {
    return false;
  }

  try {
    const result = await PushNotifications.checkPermissions();
    return result.receive === 'granted';
  } catch (error) {
    console.error('[Push] Error checking permissions:', error);
    return false;
  }
}

/**
 * Request notification permission
 * @returns {Promise<boolean>} True if granted
 */
async function requestPermission() {
  if (!isAvailable()) {
    return false;
  }

  try {
    const result = await PushNotifications.requestPermissions();
    return result.receive === 'granted';
  } catch (error) {
    console.error('[Push] Error requesting permission:', error);
    return false;
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translate(-50%, 0);
      opacity: 1;
    }
    to {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Auto-initialize when user logs in
if (isAvailable()) {
  // Check if user is authenticated
  const isAuthenticated = document.cookie.includes('supabase-auth-token');
  if (isAuthenticated) {
    initialize();
  }
}

// Export functions
export {
  initialize,
  isAvailable,
  getToken,
  areNotificationsEnabled,
  requestPermission,
  handleNotificationAction,
};
