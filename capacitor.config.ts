import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carcrashlawyerai.app',
  appName: 'Car Crash Lawyer AI',
  webDir: 'public',

  // Server configuration - loads your hosted web app
  server: {
    // Production URL - the canonical domain (Railway custom domain)
    url: 'https://www.carcrashlawyerai.com',
    cleartext: false,
    // Marks this webview as the native app so the canonical-host redirect
    // middleware leaves it alone (see src/middleware/security.js).
    appendUserAgent: 'CarCrashLawyerAIApp',
    // Allow navigation to these domains
    allowNavigation: [
      'www.carcrashlawyerai.com',
      'carcrashlawyerai.com',
      'car-crash-lawyer-ai-production.up.railway.app',
      '*.railway.app',
      'checkout.stripe.com',  // For Stripe payment redirect
      'js.stripe.com',
    ],
    // Fallback page when network fails - shows offline.html from bundled assets
    errorPath: 'offline.html',
  },

  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 5000,  // Increased from 2000ms to allow network loading
      launchAutoHide: true,
      backgroundColor: '#0ea5e9',  // Your brand blue
      showSpinner: true,  // Show loading spinner for better UX
      spinnerColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    Camera: {
      // Use system camera UI for better UX
    },

    StatusBar: {
      style: 'LIGHT',  // Light text on dark background
      backgroundColor: '#0ea5e9',
    },

    // Browser plugin for Stripe checkout redirect
    Browser: {
      // Will open Stripe checkout in system browser
    },
  },

  // iOS-specific configuration
  ios: {
    scheme: 'CarCrashLawyerAI',
    contentInset: 'automatic',
    backgroundColor: '#0ea5e9',
    // Enable Face ID / Touch ID
    // Permissions are set in Info.plist
  },

  // Android-specific configuration
  android: {
    allowMixedContent: false,
    backgroundColor: '#0ea5e9',
    // Build settings
    buildOptions: {
      keystorePath: undefined,  // Set during release build
      keystoreAlias: undefined,
    },
  },

  // Logging for development
  loggingBehavior: 'production',  // 'debug' for development
};

export default config;
