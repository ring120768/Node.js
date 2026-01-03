# Car Crash Lawyer AI - Mobile App Store Transition Plan

**Document Version:** 1.0
**Created:** January 2026
**Target Launch:** Q2 2026

---

## Executive Summary

This document outlines the transition from web-only to App Store (iOS) and Google Play (Android) distribution. The app is currently a **web application** with:
- Express.js backend on Railway
- HTML/CSS/JS frontend (static files)
- Supabase for database and auth
- Stripe Buy Buttons for payments (already integrated)
- £4.99-£85/year subscription tiers

### Recommended Approach: **Capacitor WebView Wrapper**

Rather than rebuilding as native apps (6+ months), we'll wrap the existing web app using **Capacitor** (by Ionic) to create native iOS and Android apps. This approach:
- Reuses 95% of existing code
- Provides native features (push notifications, camera, etc.)
- Satisfies Apple's "minimum functionality" requirements
- Estimated timeline: **6-8 weeks**

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Platform Requirements](#2-platform-requirements)
3. [Payment Strategy](#3-payment-strategy)
4. [Technical Implementation](#4-technical-implementation)
5. [App Store Submissions](#5-app-store-submissions)
6. [Timeline & Milestones](#6-timeline--milestones)
7. [Cost Breakdown](#7-cost-breakdown)
8. [Risks & Mitigations](#8-risks--mitigations)

---

## 1. Current State Analysis

### What We Have
| Component | Status | Mobile Ready? |
|-----------|--------|---------------|
| Frontend (HTML/CSS/JS) | Responsive design | Yes |
| Backend API (Express) | REST API | Yes |
| Authentication (Supabase) | Email/password | Yes |
| Payments (Stripe) | Buy Buttons | Needs adaptation |
| Push notifications | Not implemented | Needs building |
| Camera access | Browser-based | Needs native wrapper |
| Offline support | Minimal | Needs enhancement |

### Current Payment Integration
```html
<!-- Already using Stripe Buy Buttons -->
<stripe-buy-button
  buy-button-id="buy_btn_1RnkFJDjVI87TYBmIck9tYYL"
  publishable-key="pk_live_51RgiH5DjVI87TYBm..."
/>
```

**Pricing Tiers:**
- Standard: £4.99/year
- Premium: £9.99/year
- Family: £35.00/year (4 users)
- Business: £85.00/year (10 users)

---

## 2. Platform Requirements

### 2.1 Apple App Store (iOS)

**Developer Account:**
- Apple Developer Program: £79/year
- Requires D-U-N-S number (free, takes 2-3 weeks)
- UK-based company registration acceptable

**WebView App Requirements (Guideline 4.2):**
Apple will **reject** simple WebView wrappers. We must add:

| Requirement | Implementation |
|-------------|----------------|
| Native navigation | Tab bar with Home, Report, History, Settings |
| Push notifications | APNs via Capacitor Push plugin |
| Offline functionality | Cache recent incidents, show offline banner |
| Native camera | Capacitor Camera plugin (already needed for photos) |
| Biometric auth | Face ID/Touch ID for login |
| Native sharing | Share incident reports via iOS share sheet |

**In-App Purchase (UK Market):**
- Apple IAP **NOT mandatory** in UK as of late 2025
- CMA "Strategic Market Status" designation allows alternatives
- **We can use Stripe** for UK users
- May need to support Apple IAP for other markets

### 2.2 Google Play Store (Android)

**Developer Account:**
- One-time fee: $25 (approx. £20)
- No D-U-N-S required
- Verification takes 1-2 days

**WebView Requirements:**
- Less strict than Apple
- Must pass Google Play Protect security scan
- Must comply with User Data policy
- Must have privacy policy URL

**Payment Integration:**
- Google allows Stripe in US/UK markets (as of Oct 2025)
- Alternative billing enrollment deadline: 28 Jan 2026
- **We can use Stripe** directly in-app

---

## 3. Payment Strategy

### 3.1 Recommended: Stripe-First Approach (UK Market)

Given that your primary market is UK and both Apple/Google now permit alternative payments:

```
UK Users (Primary Market)
├── iOS: Stripe Checkout (external link) → 0% Apple fee*
├── Android: Stripe in-app → 0% Google fee
└── Web: Stripe Buy Buttons (existing) → No change

* Subject to potential future fee per Epic v Apple ruling
```

### 3.2 Implementation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   USER TAPS "SUBSCRIBE"                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Detect Platform/Region │
              └─────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌─────────┐    ┌─────────────┐  ┌─────────────┐
      │ iOS UK  │    │ Android UK  │  │   Web UK    │
      └────┬────┘    └──────┬──────┘  └──────┬──────┘
           │                │                │
           ▼                ▼                ▼
    ┌──────────────────────────────────────────────┐
    │           STRIPE CHECKOUT SESSION             │
    │   (Same backend, same webhooks, unified)      │
    └──────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Stripe Webhook        │
              │   POST /api/stripe/hook │
              └─────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Update user_signup    │
              │   subscription_status   │
              │   subscription_end_date │
              └─────────────────────────┘
```

### 3.3 Backend Changes Required

**New files needed:**
```
src/
├── controllers/
│   └── stripe.controller.js    # NEW: Checkout sessions, webhooks
├── routes/
│   └── stripe.routes.js        # NEW: /api/stripe/*
└── services/
    └── subscriptionService.js  # NEW: Subscription lifecycle management
```

**Database additions:**
```sql
-- Add to user_signup table
ALTER TABLE user_signup ADD COLUMN IF NOT EXISTS
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_tier TEXT,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  stripe_subscription_id TEXT;
```

### 3.4 Stripe Webhook Events to Handle

```javascript
// Essential webhook events
const STRIPE_EVENTS = [
  'checkout.session.completed',     // New subscription
  'customer.subscription.updated',  // Plan change
  'customer.subscription.deleted',  // Cancellation
  'invoice.paid',                   // Renewal success
  'invoice.payment_failed',         // Renewal failed
];
```

---

## 4. Technical Implementation

### 4.1 Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APPS                          │
├─────────────────────────────────────────────────────────┤
│  Capacitor 6.x (WebView wrapper framework)              │
│  ├── @capacitor/ios                                     │
│  ├── @capacitor/android                                 │
│  ├── @capacitor/push-notifications                      │
│  ├── @capacitor/camera                                  │
│  ├── @capacitor/share                                   │
│  ├── @capacitor/haptics                                 │
│  ├── @capacitor/splash-screen                           │
│  └── @capacitor/browser (for Stripe checkout redirect)  │
├─────────────────────────────────────────────────────────┤
│  Existing Web App (served via WebView)                  │
│  ├── HTML/CSS/JS frontend                               │
│  ├── Express.js backend (Railway)                       │
│  └── Supabase (auth, database, storage)                 │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Project Structure Changes

```
/Node.js/                        # Existing
├── public/                      # Existing frontend
├── src/                         # Existing backend
├── ios/                         # NEW: Capacitor iOS project
│   └── App/
│       ├── App.xcodeproj
│       └── App/
│           ├── Info.plist
│           └── AppDelegate.swift
├── android/                     # NEW: Capacitor Android project
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/...
├── capacitor.config.ts          # NEW: Capacitor config
└── package.json                 # Updated with Capacitor deps
```

### 4.3 Native Features Implementation

#### Push Notifications
```typescript
// public/js/native-features.js
import { PushNotifications } from '@capacitor/push-notifications';

async function initPushNotifications() {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', async (token) => {
    // Send token to backend
    await fetch('/api/user/push-token', {
      method: 'POST',
      body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() })
    });
  });
}
```

#### Biometric Authentication
```typescript
import { NativeBiometric } from 'capacitor-native-biometric';

async function authenticateWithBiometrics() {
  const result = await NativeBiometric.isAvailable();
  if (result.isAvailable) {
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock Car Crash Lawyer AI',
      title: 'Biometric Login',
    });
    return true;
  }
  return false;
}
```

#### Native Camera (Enhanced)
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Camera,
  });
  return image.base64String;
}
```

### 4.4 Offline Support

```javascript
// public/js/offline-manager.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Cache critical data
const CACHE_NAME = 'ccla-v1';
const CACHED_URLS = [
  '/',
  '/dashboard.html',
  '/incident-form-page1.html',
  '/css/main.css',
  '/js/app.js',
];
```

### 4.5 Stripe Checkout Flow (Mobile)

```javascript
// public/js/payment.js
import { Browser } from '@capacitor/browser';

async function startSubscription(tier) {
  // Create checkout session on backend
  const response = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier,
      userId: currentUser.id,
      successUrl: 'https://carcrashlawyerai.com/payment-success',
      cancelUrl: 'https://carcrashlawyerai.com/subscribe',
    })
  });

  const { checkoutUrl } = await response.json();

  // Open Stripe Checkout in system browser (required by Apple)
  await Browser.open({ url: checkoutUrl });
}
```

---

## 5. App Store Submissions

### 5.1 Apple App Store Checklist

**Assets Required:**
| Asset | Specification |
|-------|---------------|
| App Icon | 1024x1024 PNG, no transparency |
| Screenshots | 6.7" (1290x2796), 6.5" (1284x2778), 5.5" (1242x2208) |
| iPad Screenshots | 12.9" (2048x2732) if supporting iPad |
| App Preview Video | Optional, 15-30 seconds, H.264 |
| App Description | Max 4000 chars |
| Keywords | 100 chars, comma-separated |
| Privacy Policy URL | Required, must be accessible |
| Support URL | Required |

**Privacy Declarations (App Privacy "Nutrition Labels"):**
```
Data Collected:
├── Contact Info (email, name, phone) - Linked to identity
├── Location (approximate) - Used for accident reports
├── Photos - Used for vehicle damage documentation
├── Identifiers (user ID) - App functionality
└── Usage Data - Analytics
```

**Review Notes for Apple:**
```
Demo Account:
Email: reviewer@carcrashlawyerai.com
Password: [provide test credentials]

Notes:
- This app helps UK drivers document car accidents
- Subscription required for full functionality
- Uses Stripe for payments (permitted under UK CMA ruling)
- Native features: Push notifications, Camera, Face ID, Share
```

### 5.2 Google Play Checklist

**Assets Required:**
| Asset | Specification |
|-------|---------------|
| App Icon | 512x512 PNG |
| Feature Graphic | 1024x500 PNG |
| Screenshots | Min 2, max 8 per device type |
| Phone Screenshots | 16:9 or 9:16 aspect ratio |
| Short Description | Max 80 chars |
| Full Description | Max 4000 chars |
| Privacy Policy URL | Required |

**Content Rating Questionnaire:**
- Violence: None
- Sexual Content: None
- User-Generated Content: Yes (photos, statements)
- Personal Information: Yes (collected for service)

**Data Safety Section:**
```
Data Collected:
├── Personal info (name, email, phone, address)
├── Financial info (payment processed via Stripe)
├── Location (for accident reports)
├── Photos/videos (accident documentation)
└── App activity
```

---

## 6. Timeline & Milestones

### Phase 1: Foundation (Weeks 1-2)
- [x] Research complete (this document)
- [ ] Apple Developer account setup
- [ ] Google Play Console setup
- [ ] Capacitor project initialisation
- [ ] Stripe backend integration (webhooks, checkout sessions)

### Phase 2: Native Features (Weeks 3-4)
- [ ] Push notifications (APNs + FCM)
- [ ] Biometric authentication
- [ ] Native camera integration
- [ ] Offline mode / service worker
- [ ] Native share functionality
- [ ] Tab bar navigation

### Phase 3: Payment Integration (Week 5)
- [ ] Stripe Checkout flow (mobile)
- [ ] Subscription status sync
- [ ] Webhook handlers
- [ ] Receipt validation
- [ ] Subscription management UI

### Phase 4: Testing & Polish (Week 6)
- [ ] iOS TestFlight beta
- [ ] Android internal testing
- [ ] Performance optimisation
- [ ] Crash reporting (Sentry)
- [ ] Analytics (Posthog or similar)

### Phase 5: Submission (Weeks 7-8)
- [ ] App Store assets preparation
- [ ] Privacy policy updates
- [ ] App Store submission
- [ ] Google Play submission
- [ ] Review response handling
- [ ] Launch!

---

## 7. Cost Breakdown

### One-Time Costs
| Item | Cost |
|------|------|
| Apple Developer Program (annual) | £79 |
| Google Play Console (lifetime) | £20 |
| D-U-N-S Number | Free |
| **Total One-Time** | **£99** |

### Ongoing Costs
| Item | Cost |
|------|------|
| Apple Developer (annual renewal) | £79/year |
| Push notification service (OneSignal free tier) | £0 |
| Sentry (crash reporting, free tier) | £0 |
| **Total Annual** | **£79/year** |

### Payment Processing Fees
| Platform | Fee Structure |
|----------|---------------|
| Stripe (UK) | 1.5% + 20p per transaction |
| Apple IAP (if required) | 15-30%* |
| Google Play (if required) | 15-30%* |

*Only applies if we're forced to use platform IAP for certain markets

### Revenue Comparison (1000 subscribers at £9.99/year)

| Method | Revenue | Fees | Net |
|--------|---------|------|-----|
| Stripe Only | £9,990 | ~£200 (2%) | £9,790 |
| Apple IAP (30%) | £9,990 | £2,997 | £6,993 |
| Apple IAP (15%)* | £9,990 | £1,499 | £8,491 |

*15% rate applies after year 1 or for Small Business Program

**Recommendation:** Use Stripe for UK market (permitted), saves ~£1,500-£2,800 per 1000 subscribers annually.

---

## 8. Risks & Mitigations

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Apple rejects WebView app | Launch blocked | Add robust native features (push, biometrics, offline) |
| Stripe disallowed in future | Payment disruption | Have Apple IAP as fallback, monitor regulations |
| App Store review delays | Launch delayed | Submit early, have reviewer notes ready |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Push notification issues | Reduced engagement | Test thoroughly on real devices |
| Performance on older devices | Poor reviews | Test on iPhone 8 / Android 8+ |
| Offline mode bugs | Data loss | Implement sync queue, test extensively |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google Play rejection | Minor delay | Less strict than Apple, easy to fix |
| Rating system changes | Minor adjustment | Monitor app store policy updates |

---

## Appendix A: Stripe Integration Code

### Backend: stripe.controller.js

```javascript
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs from Stripe Dashboard
const PRICE_IDS = {
  standard: 'price_xxx_standard',
  premium: 'price_xxx_premium',
  family: 'price_xxx_family',
  business: 'price_xxx_business',
};

async function createCheckoutSession(req, res) {
  const { tier, userId, successUrl, cancelUrl } = req.body;

  try {
    // Get or create Stripe customer
    const { data: user } = await supabase
      .from('user_signup')
      .select('email, stripe_customer_id')
      .eq('create_user_id', userId)
      .single();

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await supabase
        .from('user_signup')
        .update({ stripe_customer_id: customerId })
        .eq('create_user_id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { userId, tier },
    });

    res.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout' });
  }
}

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }

  res.json({ received: true });
}

async function handleCheckoutComplete(session) {
  const { userId, tier } = session.metadata;
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  await supabase
    .from('user_signup')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      subscription_start_date: new Date(subscription.current_period_start * 1000),
      subscription_end_date: new Date(subscription.current_period_end * 1000),
      stripe_subscription_id: subscription.id,
    })
    .eq('create_user_id', userId);

  // Send welcome email
  await emailService.sendSubscriptionWelcome(session.customer_email, { tier });
}

module.exports = { createCheckoutSession, handleWebhook };
```

---

## Appendix B: Capacitor Configuration

### capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carcrashlawyerai.app',
  appName: 'Car Crash Lawyer AI',
  webDir: 'public',
  server: {
    // Production: load from hosted URL
    url: 'https://carcrashlawyerai.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0ea5e9',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    scheme: 'CarCrashLawyerAI',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
```

---

## Appendix C: Migration Checklist

### Database Migration Required

```sql
-- Migration: xxx_add_stripe_subscription_fields.sql

ALTER TABLE user_signup
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_stripe_customer
ON user_signup(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN user_signup.stripe_customer_id IS 'Stripe customer ID for recurring billing';
COMMENT ON COLUMN user_signup.subscription_status IS 'active, cancelled, past_due, inactive';
COMMENT ON COLUMN user_signup.subscription_tier IS 'standard, premium, family, business';
```

---

## Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Set up developer accounts** - Apple (£79) + Google (£20)
3. **Create Stripe Products** - Set up subscription products in Stripe Dashboard
4. **Begin implementation** - Start with Phase 1 tasks

---

*Document maintained by Car Crash Lawyer AI development team*
