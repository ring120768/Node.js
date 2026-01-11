# Google Play Console Setup Guide
**Car Crash Lawyer AI** - Android App Submission

## Prerequisites Checklist

✅ Google account with Play Console access
✅ £20 one-time developer registration fee paid
✅ App icon (512×512 PNG): `android/app-icon-512.png`
✅ Feature graphic (1024×500): `android/feature-graphic-1024x500.png`
✅ Screenshots (4-8 required): `android/screenshots/` (we have 5)
✅ AAB file signed and ready: `carcrashlawyerai-v1.0.aab`

---

## Step 1: Create New App in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create app"** button (top right)
3. Fill in the form:

### App Details

| Field | Value |
|-------|-------|
| **App name** | Car Crash Lawyer AI |
| **Default language** | English (United Kingdom) |
| **App or game** | App |
| **Free or paid** | Free |

### Declarations

- ✅ I declare this app complies with Google Play policies
- ✅ I declare this app complies with US export laws
- ✅ I acknowledge the developer account of this app may be subject to account information verification

4. Click **"Create app"**

---

## Step 2: Set Up Store Listing

Navigate to **Dashboard** → **Store presence** → **Main store listing**

### App Name & Description

**App name:**
```
Car Crash Lawyer AI
```

**Short description** (80 characters max):
```
UK traffic accident reporting for legal claims. GDPR compliant, secure, free.
```

**Full description** (4000 characters max):
```
Car Crash Lawyer AI helps UK traffic accident victims document incidents for legal claims and insurance purposes.

FEATURES:
• Guided 12-page incident report form
• Photo upload with AI analysis
• Voice transcription for witness statements
• DVLA vehicle lookup integration
• Professional 18-page PDF report generation
• Secure data storage with GDPR compliance
• Email delivery of completed reports

WHY USE CAR CRASH LAWYER AI?
Collecting evidence immediately after an accident is crucial for successful claims. Our app guides you through the complete process:

✓ Personal & vehicle details
✓ Accident circumstances (date, time, location)
✓ Weather & road conditions
✓ Injuries sustained
✓ Vehicle damage with photos
✓ Witness information
✓ Police involvement
✓ Other vehicles involved

SECURITY & PRIVACY:
• Bank-level encryption (TLS 1.3)
• GDPR compliant data handling
• 7-year secure retention
• Right to deletion
• No data sharing with third parties
• Hosted on UK servers

PROFESSIONAL REPORTS:
Your completed incident report is automatically compiled into a comprehensive 18-page PDF document including:
- All form data with legal formatting
- High-quality photo evidence
- AI-generated incident summary
- Voice transcription of witness statements
- DVLA vehicle verification reports
- Legal declaration and signature

FREE TO USE:
No subscription, no hidden fees. Complete and unlimited incident reports at no cost.

UK-SPECIFIC:
Built specifically for UK traffic law and insurance requirements:
• UK date format (DD/MM/YYYY)
• UK postcode validation
• UK phone number format
• UK vehicle registration lookup
• UK legal terminology

INSTANT ACCESS:
Reports delivered via email immediately after completion. Access your data anytime from the secure dashboard.

SUPPORT:
Email: accounts@carcrashlawyerai.com
Website: https://carcrashlawyerai.co.uk

Note: This app helps you document accidents. It does not provide legal advice. Consult a qualified solicitor for legal matters.
```

### Graphics

Upload these files from the project:

| Asset | File | Size | Required |
|-------|------|------|----------|
| **App icon** | `android/app-icon-512.png` | 512×512 | ✅ Yes |
| **Feature graphic** | `android/feature-graphic-1024x500.png` | 1024×500 | ✅ Yes |
| **Phone screenshots** | `android/screenshots/*.png` | Various | ✅ 4-8 images |

Screenshots to upload:
1. `screenshot-1-homepage.png` - Landing page
2. `screenshot-2-form-page.png` - Form entry
3. `screenshot-3-photo-upload.png` - Photo upload
4. `screenshot-4-dashboard.png` - User dashboard
5. `screenshot-5-form-progress.png` - Progress tracking

### Categorization

| Field | Value |
|-------|-------|
| **App category** | Productivity |
| **Tags** (optional) | accident, legal, insurance, uk, report |
| **Content rating** | Will set in next step |

### Contact Details

| Field | Your Value |
|-------|------------|
| **Email** | accounts@carcrashlawyerai.com |
| **Phone** (optional) | +44 7496 834683 |
| **Website** | https://carcrashlawyerai.co.uk |

### Privacy Policy

**Privacy policy URL:**
```
https://carcrashlawyerai.co.uk/privacy.html
```

✅ **Save draft** after filling each section

---

## Step 3: Content Rating

Navigate to **Policy** → **App content** → **Content rating**

### Questionnaire

Click **"Start questionnaire"** and select:

| Question | Answer |
|----------|--------|
| **Email address** | accounts@carcrashlawyerai.com |
| **App category** | Utility, Productivity, Communication or Other |

### Rating Questions

**Does your app contain:**

- ❌ Violence
- ❌ Sexual content
- ❌ Profanity
- ❌ Controlled substances
- ❌ Gambling
- ❌ User-generated content (UGC)
- ✅ **User interaction** (users can communicate with each other)
  - Via: Email (users can send documents to themselves)
- ❌ Shares user location
- ❌ Unrestricted web access

**Expected rating:** PEGI 3 / ESRB Everyone

Click **"Save"** → **"Submit"**

---

## Step 4: Data Safety

Navigate to **Policy** → **App content** → **Data safety**

### Data Collection

**Does your app collect or share user data?**
✅ Yes

### Data Types Collected

Select these data types:

#### Personal Info
- ✅ Name
- ✅ Email address
- ✅ Phone number
- ✅ Physical address (accident location, user address)

#### Photos and Videos
- ✅ Photos (accident/vehicle photos)

#### Files and Docs
- ✅ Files and docs (generated PDF reports)

#### App Activity
- ✅ App interactions (form progress tracking)

### Data Usage Purpose

For each data type selected, mark:

| Purpose | Selected |
|---------|----------|
| **App functionality** | ✅ Yes |
| **Analytics** | ❌ No |
| **Developer communications** | ✅ Yes (email delivery) |
| **Advertising or marketing** | ❌ No |
| **Fraud prevention, security, compliance** | ✅ Yes |

### Data Sharing

**Do you share user data with third parties?**
❌ No (data stays within the app and is only emailed to the user)

### Data Security

- ✅ Data is encrypted in transit (TLS)
- ✅ Data is encrypted at rest (Supabase encryption)
- ✅ Users can request data deletion (GDPR right to deletion)
- ✅ Committed to Google Play Families Policy (N/A - not targeting children)

### Data Retention

**Data retention policy:**
```
User data is retained for 7 years for legal compliance purposes. Users can request deletion of their data at any time via the app settings or by emailing accounts@carcrashlawyerai.com. Deleted data is permanently removed within 30 days.
```

Click **"Save"** → **"Submit"**

---

## Step 5: Target Audience

Navigate to **Policy** → **App content** → **Target audience**

**Age groups:**
- ✅ 18 and over (primary)

**Appeal to children?**
- ❌ No

**Store presence:**
- ✅ App available on Google Play

Click **"Save"**

---

## Step 6: News App Declaration

Navigate to **Policy** → **App content** → **News app**

**Is your app a news app?**
❌ No

Click **"Save"**

---

## Step 7: COVID-19 Contact Tracing/Status

Navigate to **Policy** → **App content** → **COVID-19 contact tracing and status**

**Is your app a COVID-19 contact tracing or status app?**
❌ No

Click **"Save"**

---

## Step 8: Government Apps

Navigate to **Policy** → **App content** → **Government**

**Is your app an official government app?**
❌ No

Click **"Save"**

---

## Step 9: App Access

Navigate to **Policy** → **App content** → **App access**

**Do users need special access to use your app?**
❌ No - app is freely accessible, no special credentials required

However, if you want to provide test credentials:

**Test account details** (optional):
```
Email: test@carcrashlawyerai.com
Password: [You can create this if needed for reviewers]
```

Click **"Save"**

---

## Step 10: Ads Declaration

Navigate to **Policy** → **App content** → **Ads**

**Does your app contain ads?**
❌ No

Click **"Save"**

---

## Step 11: Create Release (Internal Testing)

Navigate to **Release** → **Testing** → **Internal testing**

### Track Setup

1. Click **"Create new release"**
2. Upload AAB file:

```bash
File: /Users/ianring/Node.js/carcrashlawyerai-v1.0.aab
Version: 1.0 (automatically detected from AAB)
Version code: 10000 (automatically detected from AAB)
```

3. **Release name:**
```
v1.0 - Initial Release
```

4. **Release notes** (English (United Kingdom)):
```
Initial release of Car Crash Lawyer AI for Android.

Features:
- Complete guided incident report form (12 pages)
- Photo upload with AI analysis
- Voice transcription for witness statements
- DVLA vehicle lookup
- Professional PDF report generation
- Email delivery
- GDPR compliant data handling
- Secure biometric authentication

This is the first production-ready version of the app.
```

5. Click **"Save"** → **"Review release"**

### Review Screen

Check that all information is correct:
- ✅ Version name: 1.0
- ✅ Version code: 10000
- ✅ Target API level: 34 (Android 14)
- ✅ No errors or warnings

6. Click **"Start rollout to Internal testing"**

---

## Step 12: Add Internal Test Users

Navigate to **Release** → **Testing** → **Internal testing** → **Testers**

1. Click **"Create email list"**
2. **List name:** "Internal Testing"
3. Add email addresses (yourself + any team members):

```
your-email@example.com
team-member@example.com
```

4. Click **"Save changes"**
5. Copy the **"Opt-in URL"** - you'll need this to install the app

---

## Step 13: Install and Test

1. Open the **opt-in URL** on your Android device
2. Accept the invitation to become a tester
3. You'll be redirected to Play Store
4. Click **"Install"**
5. Test all major features:
   - ✅ App launches successfully
   - ✅ Form submission works
   - ✅ Photo upload works
   - ✅ PDF generation works
   - ✅ Email delivery works
   - ✅ No crashes or major bugs

**Test for 5-7 days minimum** before proceeding to production.

---

## Step 14: Production Release (After Testing)

Once internal testing is successful:

1. Navigate to **Release** → **Production**
2. Click **"Create new release"**
3. **Promote from:** Internal testing → v1.0
4. Update release notes if needed
5. **Countries/Regions:**
   - Select: **United Kingdom** (primary)
   - Optionally add: Ireland, Australia, New Zealand, Canada, South Africa (other English-speaking countries)
6. Click **"Save"** → **"Review release"**
7. Click **"Start rollout to Production"**

### Review Timeline

- **Review starts:** Immediately
- **Expected duration:** 1-7 days (typically 24-48 hours)
- **Status updates:** Via email and Play Console

---

## Step 15: Monitor Launch

After production release starts:

1. **Check dashboard daily** for:
   - App status (pending → approved/rejected)
   - User ratings and reviews
   - Crash reports
   - Installation metrics

2. **Respond to reviews** promptly
3. **Fix any critical bugs** and release updates as needed

---

## Important Notes

### Version Code Pattern

For future updates, increment version codes:
- `v1.0.0` → version code `10000`
- `v1.0.1` → version code `10001`
- `v1.1.0` → version code `10100`
- `v2.0.0` → version code `20000`

### Release Cycle

For future updates:
1. Develop new features
2. Update version in `android/app/build.gradle`
3. Build new AAB: `cd android && ./gradlew bundleRelease`
4. Upload to Internal testing
5. Test for 5-7 days
6. Promote to Production

### App URL

Once published, your app will be available at:
```
https://play.google.com/store/apps/details?id=com.carcrashlawyerai.app
```

---

## Troubleshooting

### Common Rejections

**Policy violations:**
- Ensure privacy policy URL is accessible
- Verify all data safety declarations are accurate
- Check screenshots don't contain placeholder text

**Technical issues:**
- Target API level too old (must be API 33+ for new apps)
- Missing app icon or graphics
- AAB signature issues (use same keystore for all releases)

### Getting Help

- **Play Console Help:** Click "?" icon in top-right corner
- **Email support:** Your issue will be in the console notification
- **Developer forum:** https://support.google.com/googleplay/android-developer/community

---

## Completion Checklist

Before submitting to production, verify:

- ✅ App name, description, and graphics finalized
- ✅ Content rating completed
- ✅ Data safety form completed
- ✅ All policy questions answered
- ✅ Privacy policy URL accessible
- ✅ Internal testing completed (5-7 days minimum)
- ✅ No critical bugs or crashes
- ✅ All major features tested and working
- ✅ Countries/regions selected
- ✅ Release notes written

**Good luck with your submission! 🚀**
