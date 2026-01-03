import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carcrashlawyerai.app',
  appName: 'Car Crash Lawyer AI',
  webDir: 'public',

  // Server configuration - loads your hosted web app
  server: {
    // Production URL - the app loads your Railway-hosted site
    url: 'https://carcrashlawyerai.co.uk',
    cleartext: false,
    // Allow navigation to these domains
    allowNavigation: [
      'carcrashlawyerai.co.uk',
      '*.carcrashlawyerai.co.uk',
      'checkout.stripe.com',  // For Stripe payment redirect
      'js.stripe.com',
    ],
  },

  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0ea5e9',  // Your brand blue
      showSpinner: false,
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
