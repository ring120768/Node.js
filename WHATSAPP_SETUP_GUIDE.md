# WhatsApp Business Platform Setup Guide
**For: Car Crash Lawyer AI**
**WhatsApp Number:** 07496 834683
**Date:** 8th January 2026

---

## Why Meta WhatsApp Business Platform?

✅ **Lower costs** - Free user-initiated conversations (24hr window)
✅ **Template messages** - £0.03-0.05 per message (vs Twilio £0.08+)
✅ **Advertising integration** - Click-to-WhatsApp ads on Facebook/Instagram
✅ **Analytics** - Built into Facebook Business Manager
✅ **Scalability** - Better pricing at high volumes
✅ **Brand control** - Custom templates, verified business profile

---

## Phase 1: Meta Business Manager Setup (15 minutes)

### Step 1: Create Facebook Business Manager Account

1. Go to: https://business.facebook.com
2. Click **"Create Account"**
3. Enter:
   - **Business Name:** Beat the Bookie Ltd (or Car Crash Lawyer AI)
   - **Your Name:** Ian Ring
   - **Business Email:** accounts@carcrashlawyerai.com
4. Click **"Submit"**

### Step 2: Verify Your Business

**Option A: Business Documents (Fastest)**
1. Go to: Business Settings → Business Info → Verification
2. Upload one of:
   - Companies House certificate (Beat the Bookie Ltd)
   - Business bank statement
   - Utility bill with business address
3. Verification takes 1-3 business days

**Option B: Business Phone (Alternative)**
1. Use: +44 7496 834683
2. Receive verification code via SMS
3. Instant verification (but limited features until document verified)

---

## Phase 2: WhatsApp Business Platform Setup (20 minutes)

### Step 1: Add WhatsApp to Business Manager

1. In Business Manager, go to: **Settings → Accounts → WhatsApp Accounts**
2. Click **"Add"** → **"Create a new WhatsApp Business Account"**
3. Enter:
   - **WhatsApp Business Account Name:** Car Crash Lawyer AI
   - **WhatsApp Business Display Name:** Car Crash Lawyer AI
   - **Category:** Legal Services
   - **Description:** Professional legal documentation for UK traffic accidents
   - **Website:** https://carcrashlawyerai.co.uk

### Step 2: Add Your Phone Number

1. Click **"Add Phone Number"**
2. Enter: **+44 7496 834683**
3. Select: **Voice call** or **SMS** for verification code
4. Enter the 6-digit code received
5. ✅ Number is now verified

**Important:** This number will be used ONLY for WhatsApp Business API. Don't use it for personal WhatsApp.

### Step 3: Create WhatsApp Business Profile

1. Go to: WhatsApp Manager → Business Profile
2. Complete:
   - **Profile Photo:** Upload your app icon (512×512)
   - **About:** "Professional legal documentation for UK traffic accident victims. GDPR compliant."
   - **Address:** Your registered business address
   - **Email:** accounts@carcrashlawyerai.com
   - **Website:** https://carcrashlawyerai.co.uk
   - **Business Hours:** Mon-Fri 9am-5pm GMT

---

## Phase 3: Create Message Templates (30 minutes)

WhatsApp requires **pre-approved templates** for business-initiated messages. User replies are free for 24 hours.

### Template 1: Photo Upload Confirmation

**Template Name:** `photo_upload_confirmation`
**Category:** Transactional
**Language:** English (UK)

```
Hi {{1}},

Great news! We've received your photos for your traffic accident report.

📸 Photos uploaded: {{2}}
📅 Date: {{3}}

Your detailed PDF report will be ready in 2-3 minutes. We'll send it to your email and WhatsApp.

Need help? Reply to this message.

Car Crash Lawyer AI
```

**Variables:**
1. `{{1}}` - User's first name
2. `{{2}}` - Number of photos (e.g., "5")
3. `{{3}}` - Upload date (DD/MM/YYYY)

---

### Template 2: PDF Report Ready

**Template Name:** `pdf_report_ready`
**Category:** Transactional
**Language:** English (UK)

```
Hi {{1}},

Your traffic accident report is ready! 📄

✅ 18-page professional PDF
✅ All your photos included
✅ AI-generated summary

Download your report:
{{2}}

This report has been sent to:
📧 {{3}}

Your data will be securely stored for 90 days as per GDPR regulations.

Questions? Just reply to this message.

Car Crash Lawyer AI
```

**Variables:**
1. `{{1}}` - User's first name
2. `{{2}}` - PDF download link
3. `{{3}}` - User's email address

---

### Template 3: 90-Day GDPR Retention Notice

**Template Name:** `gdpr_retention_notice`
**Category:** Transactional
**Language:** English (UK)

```
Hi {{1}},

This is a reminder about your traffic accident report created on {{2}}.

🗂️ Data Retention Notice
Your personal data and accident report will be securely stored for 90 days to comply with UK legal documentation requirements.

After 90 days:
✅ All photos will be permanently deleted
✅ Personal information will be anonymised
✅ Your report will be archived (anonymous)

Need a copy? Download now:
{{3}}

Questions about data privacy? Reply to this message.

Car Crash Lawyer AI
```

**Variables:**
1. `{{1}}` - User's first name
2. `{{2}}` - Report creation date (DD/MM/YYYY)
3. `{{3}}` - PDF download link

---

### Template 4: Processing Status Update

**Template Name:** `processing_status`
**Category:** Transactional
**Language:** English (UK)

```
Hi {{1}},

Your report is being processed...

{{2}}% complete

⏳ Estimated time: {{3}} minutes

We're creating your professional 18-page PDF with all your photos and details.

You'll receive it via email and WhatsApp when ready.

Car Crash Lawyer AI
```

**Variables:**
1. `{{1}}` - User's first name
2. `{{2}}` - Progress percentage (e.g., "50")
3. `{{3}}` - Estimated minutes remaining

---

### Template 5: Welcome Message (Optional - for Click-to-WhatsApp Ads)

**Template Name:** `welcome_message`
**Category:** Marketing
**Language:** English (UK)

```
Hi! Welcome to Car Crash Lawyer AI 👋

We help UK traffic accident victims create professional legal documentation in minutes.

✅ Free 18-page PDF report
✅ AI-powered analysis
✅ GDPR compliant
✅ No hidden fees

Ready to start?
Visit: https://carcrashlawyerai.co.uk

Questions? Just reply to this message.

Car Crash Lawyer AI
```

---

## Phase 4: Submit Templates for Approval

1. Go to: WhatsApp Manager → Message Templates
2. Click **"Create Template"**
3. For each template above:
   - Enter template name (lowercase, underscores only)
   - Select category (Transactional or Marketing)
   - Select language: **English (UK)**
   - Paste template text
   - Mark variable positions with `{{1}}`, `{{2}}`, etc.
   - Add sample values for review
4. Click **"Submit"**

**Approval time:** Usually 2-24 hours. You'll get email notification.

**Pro tip:** Transactional templates get approved faster than Marketing templates.

---

## Phase 5: Get API Credentials

### Step 1: Create System User

1. Go to: Business Settings → Users → System Users
2. Click **"Add"** → **"Create System User"**
3. Enter:
   - **Name:** Car Crash Lawyer AI API
   - **Role:** Admin
4. Click **"Create System User"**

### Step 2: Generate Access Token

1. Click on the system user you just created
2. Click **"Generate New Token"**
3. Select:
   - **App:** (Create new app or select existing)
   - **Permissions:** `whatsapp_business_messaging`, `whatsapp_business_management`
   - **Expiration:** Never
4. Click **"Generate Token"**
5. **Copy the token immediately** (you won't see it again!)

### Step 3: Get Your Credentials

You'll need these for `.env`:

```bash
WHATSAPP_PHONE_NUMBER_ID=123456789012345   # From WhatsApp Manager → Phone Numbers
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098  # From WhatsApp Manager → Settings
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxx     # From system user token (above)
WHATSAPP_VERIFY_TOKEN=your_random_secret   # Create your own (for webhooks)
WHATSAPP_API_VERSION=v21.0                 # Current version (check docs)
```

**Where to find IDs:**
- **Phone Number ID:** WhatsApp Manager → Phone Numbers → Click your number → See "Phone number ID"
- **Business Account ID:** WhatsApp Manager → Settings → See "WhatsApp Business Account ID"

---

## Phase 6: Set Up Webhooks (for Two-Way Messaging)

### Step 1: Create Webhook Endpoint in Your App

Your app needs to handle:
- Message delivery status (sent, delivered, read, failed)
- Incoming user messages (replies, questions)
- User opt-outs

The webhook URL will be: `https://carcrashlawyerai.co.uk/webhooks/whatsapp`

### Step 2: Configure Webhook in Meta

1. Go to: WhatsApp Manager → Configuration → Webhooks
2. Click **"Configure"**
3. Enter:
   - **Callback URL:** `https://carcrashlawyerai.co.uk/webhooks/whatsapp`
   - **Verify Token:** (Same as `WHATSAPP_VERIFY_TOKEN` in `.env`)
4. Subscribe to:
   - ✅ `messages` (incoming user messages)
   - ✅ `message_status` (delivery updates)
5. Click **"Verify and Save"**

---

## Phase 7: Click-to-WhatsApp Ads (Advertising Benefits!)

Once setup is complete, you can create Facebook/Instagram ads that:

1. **Click-to-WhatsApp Ads** - Users click ad → Opens WhatsApp with pre-filled message
2. **Automated Responses** - Auto-reply with welcome message template
3. **Conversion Tracking** - Track users from ad click → WhatsApp → Form completion
4. **Retargeting** - Retarget users who messaged but didn't complete form

**Setup:**
1. Go to: Facebook Ads Manager
2. Create new campaign → **Messages** objective
3. Choose: **WhatsApp** as messaging app
4. Select your verified WhatsApp number
5. Choose welcome template: `welcome_message`
6. Target: UK users, age 25-65, interests: legal services, car insurance

**Budget suggestion:** Start with £5/day, test for 1 week

---

## Testing Before Going Live

### Test Mode (Safe Testing)

1. Go to: WhatsApp Manager → API Setup → Test Mode
2. Enable test mode
3. Add test numbers (your personal WhatsApp)
4. Send test messages
5. Verify templates display correctly
6. Test webhook delivery

### Production Checklist

Before going live:
- ✅ Business verified in Facebook Business Manager
- ✅ All message templates approved
- ✅ API credentials saved in `.env` (encrypted!)
- ✅ Webhooks configured and tested
- ✅ WhatsApp Business Profile complete (photo, about, hours)
- ✅ Test messages sent successfully
- ✅ User reply handling tested
- ✅ Error handling in place (rate limits, failures)

---

## Costs (Meta WhatsApp Business Platform)

**Free:**
- User-initiated conversations (24hr window after user messages you)
- Webhook setup and configuration
- Template creation and approval

**Paid:**
- **Service conversations:** £0.0352 per conversation (business-initiated)
- **Utility conversations:** £0.0176 per conversation (notifications, OTPs)
- **Authentication:** £0.0088 per conversation (login codes)

**What's a "conversation"?**
- 24-hour window after first message
- Multiple messages in same window = 1 conversation
- Your use case = "Utility" category (£0.0176 per user)

**Monthly estimate:**
- 100 users/month × 3 messages each = 100 conversations
- 100 × £0.0176 = **£1.76/month**
- vs Twilio: 300 messages × £0.08 = **£24/month**

**Savings: ~92% cheaper than Twilio!**

---

## Next Steps

1. ✅ Create Facebook Business Manager account
2. ✅ Verify your business (1-3 days)
3. ✅ Add WhatsApp Business Account
4. ✅ Verify phone number: +44 7496 834683
5. ✅ Submit message templates for approval (2-24 hours)
6. ✅ Generate API credentials
7. ✅ Configure webhooks
8. ✅ Test in test mode
9. ✅ Go live!

**Total setup time:** ~2 hours (spread over 2-3 days for approvals)

**Questions?** Check: https://developers.facebook.com/docs/whatsapp/cloud-api

---

**Created:** 8th January 2026
**App:** Car Crash Lawyer AI
**WhatsApp:** 07496 834683
**Platform:** Meta WhatsApp Business Platform (Cloud API)
