# Google Play Console Setup Guide

**For:** Car Crash Lawyer AI
**Version:** 1.0
**Date:** 7th January 2026

---

## 📋 Before You Start

### What You'll Need

✅ **Google Account** - Personal or business Gmail account
✅ **Payment Method** - Debit/credit card for £25 one-time registration fee
✅ **Developer Information:**
- Legal business name: Car Crash Lawyer AI
- Developer email: admin@carcrashlawyerai.com
- Website: https://carcrashlawyerai.co.uk
- Privacy policy URL: https://car-crash-lawyer-ai-production.up.railway.app/privacy-policy.html

✅ **App Files Ready:**
- AAB file: `/Users/ianring/Node.js/android/app/build/outputs/bundle/release/app-release.aab` (22MB)
- Keystore: `/Users/ianring/Node.js/android/carcrashlawyerai-release.keystore`

✅ **Content Prepared:**
- All listing content in: `docs/GOOGLE_PLAY_STORE_LISTING.md`
- Screenshots: Need to capture 4-6 from app
- App icon: Need to create 512x512 PNG
- Feature graphic: Need to create 1024x500 image

---

## Step 1: Create Google Play Console Account

### 1.1 Register Your Account

1. **Go to Google Play Console**
   - Visit: https://play.google.com/console/signup
   - Sign in with your Google account

2. **Accept Developer Agreement**
   - Read the Google Play Developer Distribution Agreement
   - Check the box "I have read and agree to..."
   - Click "Continue to payment"

3. **Pay Registration Fee**
   - One-time fee: £25 (approximately, may vary slightly)
   - Enter payment details
   - Click "Complete purchase"

4. **Complete Developer Profile**
   ```
   Developer name: Car Crash Lawyer AI
   Email address: admin@carcrashlawyerai.com
   Website: https://carcrashlawyerai.co.uk

   Developer type: Individual / Organization (choose appropriate)
   ```

5. **Verify Email**
   - Check admin@carcrashlawyerai.com inbox
   - Click verification link from Google Play

⏱️ **Time:** 10-15 minutes
💰 **Cost:** £25 one-time fee

---

## Step 2: Create New Application

### 2.1 Start New App

1. **Click "Create app"** in Play Console dashboard

2. **Fill in Basic Details:**
   ```
   App name: Car Crash Lawyer AI
   Default language: English (United Kingdom)
   App or game: App
   Free or paid: Free
   ```

3. **Declarations:**
   - ✅ I confirm this app complies with Google Play's Developer Program Policies
   - ✅ I confirm this app complies with US export laws
   - ✅ I acknowledge that this app is subject to a publicly available government-issued national security classification

4. **Click "Create app"**

---

## Step 3: Set Up Store Listing

### 3.1 App Details Section

Navigate to: **Main store listing** in left sidebar

**Copy content from `docs/GOOGLE_PLAY_STORE_LISTING.md`:**

1. **App name:**
   ```
   Car Crash Lawyer AI
   ```

2. **Short description** (80 chars max):
   ```
   Document traffic accidents with AI-powered legal report generation
   ```

3. **Full description** (4000 chars max):
   - Copy the entire "Full Description" section from GOOGLE_PLAY_STORE_LISTING.md (lines 23-138)
   - Paste into full description field
   - Current count: 3,847 characters ✅

### 3.2 Graphics and Media

**Required Assets:**

1. **App icon** (512 x 512 px, PNG, 32-bit)
   - **TODO:** Create using brand colors (#0ea5e9 blue)
   - Square, transparent background
   - Should show clearly at small sizes

2. **Feature graphic** (1024 x 500 px, JPG or PNG)
   - **TODO:** Create banner-style graphic
   - See design suggestions in GOOGLE_PLAY_STORE_LISTING.md (lines 416-438)

3. **Screenshots** (Min 2, Recommended 4-8)
   - **Dimensions:** 1080 x 1920 px (9:16 ratio)
   - **Format:** PNG or JPG
   - **TODO:** Capture from Android app
   - See screenshot guide in GOOGLE_PLAY_STORE_LISTING.md (lines 376-413)

### 3.3 Categorization

```
Category: Productivity
Tags: accident report, car crash, legal documentation, incident report, insurance claim, traffic accident, UK legal
```

### 3.4 Contact Details

```
Email: admin@carcrashlawyerai.com
Website: https://carcrashlawyerai.co.uk
Phone: [Optional - add if you want support calls]

Privacy Policy URL: https://car-crash-lawyer-ai-production.up.railway.app/privacy-policy.html
```

**Click "Save" after each section**

---

## Step 4: Complete Data Safety Section

Navigate to: **App content → Data safety**

### 4.1 Data Collection Declaration

**Does your app collect or share any of the required user data types?**
- ✅ Yes

**Is all of the user data collected by your app encrypted in transit?**
- ✅ Yes (using HTTPS/TLS)

**Do you provide a way for users to request that their data is deleted?**
- ✅ Yes (GDPR Article 17 - Right to Erasure)

### 4.2 Data Types Collected

Copy from GOOGLE_PLAY_STORE_LISTING.md (lines 204-260):

**Personal Information:**
- ✅ Name
- ✅ Email address
- ✅ Phone number
- ✅ User address
- ✅ Date of birth

**Photos and Videos:**
- ✅ Photos (user-uploaded accident evidence)

**Location:**
- ✅ Approximate location
- ✅ Precise location (What3Words - optional)

**Files and Documents:**
- ✅ Files and docs (incident reports)

### 4.3 Data Usage

**For each data type, specify:**

**Purpose:** App functionality (creating legal incident report)

**Optional/Required:** Required

**Sharing:** Not shared with third parties

**Retention:** 7 years (legal requirement) - can be deleted on request

### 4.4 Data Security Practices

- ✅ Data is encrypted in transit (HTTPS)
- ✅ Data is encrypted at rest (Supabase)
- ✅ Users can request data deletion
- ✅ Users can view their data
- ✅ You follow a data retention and deletion policy

**Click "Submit" when complete**

---

## Step 5: Content Rating

Navigate to: **App content → Content rating**

### 5.1 Start Questionnaire

1. **Click "Start questionnaire"**
2. **Select "IARC questionnaire"** (International Age Rating Coalition)
3. **Enter email:** admin@carcrashlawyerai.com

### 5.2 Answer Questions

Copy answers from GOOGLE_PLAY_STORE_LISTING.md (lines 262-331):

**Category:** Utility

**Violence:** No
**Sexual content:** No
**Profanity:** No
**Drugs/Alcohol/Tobacco:** No
**Gambling:** No

**User Interaction Features:**
- ✅ Users can share location with app (accident location - optional)
- ✅ Users can share personal info with app (for report generation)
- ❌ Users cannot interact with each other

**Data Collection:**
- ✅ Collects personal information
- ✅ Data is encrypted
- ✅ Users can request deletion

**Location Access:**
- ✅ Yes (optional - for recording accident location)

**Camera Access:**
- ✅ Yes (for documenting vehicle damage and accident scene)

### 5.3 Review and Submit

1. Review your answers
2. **Click "Submit"**
3. Rating will be: **PEGI 3** or **PEGI 12** (suitable for general audiences)

---

## Step 6: Set Up App Access

Navigate to: **App content → App access**

**Does your app restrict access to some users?**
- ❌ No (all features available to all users)

**Click "Save"**

---

## Step 7: Ads Declaration

Navigate to: **App content → Ads**

**Does your app contain ads?**
- ❌ No (currently ad-free)

**Click "Submit"**

---

## Step 8: Target Audience

Navigate to: **App content → Target audience and content**

### 8.1 Target Age Groups

**Select age ranges your app is designed for:**
- ✅ 18+ (Adults only)

**Why 18+?**
- Legal documentation requires understanding of legal concepts
- Collects personal information requiring consent capacity
- Deals with accident scenarios

### 8.2 Store Presence

**What type of app do you have?**
- ❌ Not a kids app
- ✅ Age-restricted app (18+)

**Click "Save"**

---

## Step 9: News App Declaration

Navigate to: **App content → News apps**

**Is your app a news app?**
- ❌ No

**Click "Save"**

---

## Step 10: COVID-19 Contact Tracing

Navigate to: **App content → COVID-19 contact tracing**

**Is your app a contact tracing app?**
- ❌ No

**Click "Submit"**

---

## Step 11: Data Deletion

Navigate to: **App content → Data deletion**

**Provide a web link or email address for users to request deletion:**

```
Email: privacy@carcrashlawyerai.com
Subject: GDPR Data Deletion Request

Alternative: In-app settings → Profile → Request Data Deletion
```

**Click "Submit"**

---

## Step 12: Upload App Bundle (AAB)

### 12.1 Create Internal Testing Release First

Navigate to: **Release → Testing → Internal testing**

1. **Click "Create new release"**

2. **Upload AAB:**
   ```bash
   # AAB file location
   /Users/ianring/Node.js/android/app/build/outputs/bundle/release/app-release.aab

   # File size: 22MB
   # Signed with: carcrashlawyerai-release.keystore
   ```

3. **Drag and drop** or **click Browse** to upload AAB

4. **Release name:** Version 1.0 (Build 1)

5. **Release notes:**
   ```
   🎉 Welcome to Car Crash Lawyer AI!

   Create professional legal incident reports for UK traffic accidents.

   Features:
   ✅ Complete 12-page guided incident report
   ✅ Upload and organize accident photos
   ✅ AI-powered incident analysis
   ✅ Professional 18-page PDF reports
   ✅ GDPR-compliant data handling
   ✅ 7-year secure data retention

   This is our initial release. We're committed to helping UK accident victims document incidents properly.

   Questions or issues? Email admin@carcrashlawyerai.com

   Thank you for using Car Crash Lawyer AI! 🚗⚖️
   ```

6. **Click "Save"** → **Review release** → **Start rollout to Internal testing**

### 12.2 Add Internal Testers

1. **Create email list:**
   ```
   test-group@carcrashlawyerai.com
   yourname+test@gmail.com
   colleague@example.com
   ```

2. **Add testers** in Internal testing → Testers tab

3. **Share opt-in URL** with testers

⏱️ **Processing time:** 20-30 minutes for Google to process AAB

---

## Step 13: Internal Testing Phase

### 13.1 Wait for Processing

- Google Play will review AAB for compliance
- Processing usually takes 20-30 minutes
- You'll receive email notification when ready

### 13.2 Test Installation

1. **Testers open opt-in URL** on Android device
2. **Opt in** to internal testing
3. **Install from Play Store**
4. **Test thoroughly** using `docs/BETA_TESTER_GUIDE.md`

### 13.3 Testing Checklist

Use the checklist in BETA_TESTER_GUIDE.md:

- [ ] Sign up and login works
- [ ] All 12 form pages complete correctly
- [ ] Photo upload functions properly
- [ ] PDF generation completes (2-3 min)
- [ ] Email with PDF arrives
- [ ] No crashes or freezes
- [ ] Works on different Android versions (7.0+)

**Recommended testing duration:** 5-7 days minimum

---

## Step 14: Production Release

### 14.1 Prepare for Production

**Prerequisites:**
- ✅ Internal testing complete (5-7 days)
- ✅ No critical bugs found
- ✅ Tester feedback addressed
- ✅ All store listing content complete
- ✅ All required graphics uploaded

### 14.2 Create Production Release

Navigate to: **Release → Production → Create new release**

1. **Select AAB** (same one from internal testing if no changes)

2. **Release notes:**
   ```
   🎉 Car Crash Lawyer AI - Version 1.0

   Your comprehensive incident documentation tool for UK traffic accidents.

   📋 Features:
   • Complete 12-page guided incident report
   • Smart photo upload and organization
   • AI-powered analysis via OpenAI
   • Professional 18-page PDF reports via email
   • GDPR-compliant data handling
   • 7-year secure retention
   • Offline capable (sync when online)

   🇬🇧 UK-Specific:
   • UK date format and addresses
   • British postcodes
   • What3Words integration
   • DVLA vehicle lookup
   • England & Wales legal framework

   ⚖️ Important: This is not a law firm. We do not provide legal advice. Always consult a qualified solicitor.

   📧 Support: admin@carcrashlawyerai.com
   ```

3. **Click "Save"** → **Review release**

### 14.3 Submit for Review

1. **Review all sections** for completeness:
   - ✅ Store listing
   - ✅ Content rating
   - ✅ Data safety
   - ✅ All required declarations
   - ✅ Screenshots and graphics

2. **Click "Send for review"**

### 14.4 Review Timeline

**Google's review process:**
- ⏱️ Initial review: 24-48 hours typically
- 🔄 May request changes (respond within 7 days)
- ✅ Approval notification via email
- 📱 Live on Play Store within hours of approval

---

## Step 15: Post-Launch Monitoring

### 15.1 Monitor Dashboard

**Check daily for first week:**
- Installs and uninstalls
- Crashes and ANRs (Application Not Responding)
- User reviews and ratings
- Pre-launch report warnings

### 15.2 Respond to Reviews

**Best practices:**
- Respond to all reviews within 24-48 hours
- Thank users for positive feedback
- Address issues in negative reviews professionally
- Never argue or be defensive

**Example responses:**

**Positive review:**
```
Thank you so much! We're delighted Car Crash Lawyer AI helped you document your incident properly. If you ever need support, we're here at admin@carcrashlawyerai.com 🚗⚖️
```

**Negative review:**
```
We're sorry you experienced [issue]. This isn't the experience we want for our users. We've fixed [specific issue] in the latest update. Please email admin@carcrashlawyerai.com so we can help directly. Thank you for the feedback!
```

### 15.3 Update Strategy

**Plan regular updates:**
- Bug fixes: As needed (critical within 24-48 hours)
- Minor updates: Monthly (new features, improvements)
- Major updates: Quarterly (significant new functionality)

---

## 🚨 Common Issues & Solutions

### Issue: AAB Upload Fails

**Error:** "Upload failed" or "Invalid signature"

**Solution:**
1. Verify AAB is signed with release keystore
2. Check file size (max 150MB for initial upload)
3. Ensure versionCode is unique (higher than any previous)
4. Try uploading from different browser

### Issue: Content Rating Incomplete

**Error:** "Complete content rating before publishing"

**Solution:**
- Ensure IARC questionnaire fully completed
- Check all required questions answered
- Click "Submit" (not just Save)
- Wait for rating certificate (may take few minutes)

### Issue: Screenshots Rejected

**Error:** "Screenshots don't meet requirements"

**Solution:**
- Verify exact dimensions: 1080 x 1920 px
- Ensure 9:16 aspect ratio
- Check file size (max 8MB per image)
- Remove any non-app content (browser chrome, device frames)
- Use actual app screenshots, not mockups

### Issue: Privacy Policy URL Invalid

**Error:** "Invalid privacy policy URL"

**Solution:**
- Ensure URL is publicly accessible
- Test in incognito browser window
- Must use HTTPS (not HTTP)
- URL must be live before submission
- Check URL exactly matches: https://car-crash-lawyer-ai-production.up.railway.app/privacy-policy.html

### Issue: Review Delayed/Rejected

**Common reasons:**
- Incomplete store listing
- Missing required permissions declarations
- Privacy policy doesn't match app behavior
- Screenshots don't show actual app
- Violates content policies

**Solution:**
- Review rejection email carefully
- Address specific issues mentioned
- Resubmit with detailed changelog
- Contact Play Console support if unclear

---

## ✅ Final Pre-Submission Checklist

### Store Listing
- [ ] App name: Car Crash Lawyer AI ✅
- [ ] Short description (80 chars) ✅
- [ ] Full description (4000 chars) ✅
- [ ] App icon (512x512 PNG) ⚠️ **NEEDS CREATION**
- [ ] Feature graphic (1024x500) ⚠️ **NEEDS CREATION**
- [ ] 4-6 screenshots (1080x1920) ⚠️ **NEEDS CAPTURE**
- [ ] Category: Productivity ✅
- [ ] Contact email: admin@carcrashlawyerai.com ✅
- [ ] Privacy policy URL ✅
- [ ] Website URL ✅

### App Content
- [ ] Data safety completed ✅
- [ ] Content rating (IARC) completed ✅
- [ ] Target audience (18+) set ✅
- [ ] Ads declaration (No ads) ✅
- [ ] App access (No restrictions) ✅
- [ ] Data deletion policy provided ✅

### Technical
- [ ] AAB file ready (22MB) ✅
- [ ] versionCode: 1 ✅
- [ ] versionName: "1.0" ✅
- [ ] Signed with release keystore ✅
- [ ] minSdkVersion: 24 (Android 7.0) ✅
- [ ] targetSdkVersion: 34 (Android 14) ✅

### Testing
- [ ] Internal testing completed (5-7 days minimum)
- [ ] No critical bugs
- [ ] All features working
- [ ] Tested on real devices
- [ ] Tester feedback addressed

### Legal
- [ ] Privacy policy live ✅
- [ ] Terms of service live ✅
- [ ] GDPR compliance verified ✅
- [ ] Proper disclaimers (not a law firm) ✅
- [ ] No misleading claims ✅

---

## 📞 Support Resources

### Google Play Console Help
- **Help Center:** https://support.google.com/googleplay/android-developer
- **Policy Center:** https://play.google.com/about/developer-content-policy/
- **Release Process:** https://support.google.com/googleplay/android-developer/answer/9859348

### Your Resources
- **Store listing content:** `docs/GOOGLE_PLAY_STORE_LISTING.md`
- **Beta tester guide:** `docs/BETA_TESTER_GUIDE.md`
- **Privacy policy:** https://car-crash-lawyer-ai-production.up.railway.app/privacy-policy.html
- **Terms of service:** https://car-crash-lawyer-ai-production.up.railway.app/terms-of-service.html

### Contact
- **Email:** admin@carcrashlawyerai.com
- **Website:** https://carcrashlawyerai.co.uk

---

## 🎯 Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Play Console account setup | 15 mins | ⏳ Ready to start |
| Store listing completion | 30 mins | ✅ Content prepared |
| Create graphics (icon + feature) | 2-4 hours | ⚠️ **TODO** |
| Capture screenshots | 1 hour | ⚠️ **TODO** |
| Upload AAB to internal testing | 30 mins | ✅ File ready |
| AAB processing | 20-30 mins | Auto |
| Internal testing phase | 5-7 days | Recommended |
| Production submission | 15 mins | After testing |
| Google review | 24-48 hours | Auto |
| **Total to live:** | **7-9 days** | |

---

**Document Created:** 7th January 2026
**For:** Car Crash Lawyer AI v1.0
**Next Steps:** Create app icon and feature graphic, then capture screenshots

**Good luck with your Play Store launch! 🚀**
