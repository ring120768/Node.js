# WhatsApp Business Cloud API Setup Guide

## Overview

WhatsApp Business Cloud API provides **1000 FREE messages/month**, then ~£0.01-0.05 per message.

**What you'll need:**
- Facebook Business Manager account (you already have this! ✅)
- UK phone number (for WhatsApp Business account)
- Message templates approved by Meta (24-48 hours)

**Notification flow:**
```
PDF Ready
    ↓
1. Try Push Notification (if user has app - instant)
    ↓
2. Try WhatsApp (if user has phone number - instant)  ← NEW!
    ↓
3. Send Email (always sent - PRIMARY notification)
```

---

## Step 1: Access Meta Business Suite

1. Go to **https://business.facebook.com/**
2. Log in with your Facebook Business account
3. Select your business (or create one if needed)
4. Navigate to **"All tools"** → **"WhatsApp Manager"**

---

## Step 2: Set Up WhatsApp Business Account

### 2.1 Create WhatsApp Business Account

1. In WhatsApp Manager, click **"Get Started"**
2. Click **"Create a WhatsApp Business Account"**
3. Select **"Cloud API"** (NOT the old WhatsApp Business API)
4. Choose **"Use existing Facebook Business account"**
5. Click **"Continue"**

### 2.2 Add Phone Number

**⚠️ Important:** This phone number will be your WhatsApp Business number.

1. Click **"Add phone number"**
2. Enter a UK phone number:
   - **NOT your personal WhatsApp number**
   - Can be a new SIM card or virtual number
   - Format: +44 7700 900123
3. Select **"Text message"** verification
4. Enter the 6-digit code you receive
5. Click **"Continue"**

**💡 Tip:** You can use a virtual UK number from:
- Twilio (pay-as-you-go)
- Vonage (virtual numbers)
- Google Voice UK (if available)

### 2.3 Complete Business Profile

1. **Business name:** "Car Crash Lawyer AI"
2. **Category:** Select "Legal Services" or "Professional Services"
3. **Description:** "AI-powered legal documentation for UK traffic accidents"
4. **Website:** https://carcrashlawyerai.co.uk
5. **Business email:** admin@carcrashlawyerai.com
6. Click **"Save"**

---

## Step 3: Get API Credentials

### 3.1 Phone Number ID

1. In WhatsApp Manager, go to **"API Setup"**
2. You'll see **"Phone number ID"** - Copy this
3. Format: `123456789012345`

**Save this:** You'll need it for `.env` file

### 3.2 Access Token (Temporary)

**⚠️ This is a temporary token - we'll create a permanent one next**

1. On the same page, find **"Temporary access token"**
2. Click **"Copy"**
3. This token expires in 24 hours

### 3.3 Create Permanent Access Token

**For production, create a System User with permanent token:**

1. Go to **Business Settings** → **"Users"** → **"System Users"**
2. Click **"Add"** → Create system user:
   - Name: "WhatsApp API User"
   - Role: "Admin"
3. Click **"Add Assets"** → **"Apps"**
4. Select your WhatsApp app
5. Toggle **"Manage app"** permission ON
6. Click **"Generate New Token"**
7. Select permissions:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
8. Click **"Generate Token"**
9. **IMPORTANT:** Copy this token immediately (you can't see it again!)

**Save this:** You'll need it for `.env` file

### 3.4 Business Account ID (Optional - for monitoring)

1. Go to **Business Settings** → **"Business Info"**
2. Copy **"Business Manager ID"**
3. Format: `123456789012345`

**Save this:** Optional, for usage monitoring

---

## Step 4: Create Message Templates

**⚠️ CRITICAL:** WhatsApp requires pre-approved templates. You CANNOT send freeform messages.

### 4.1 Navigate to Message Templates

1. In WhatsApp Manager, go to **"Message Templates"**
2. Click **"Create Template"**

### 4.2 Create "PDF Ready" Template

**Template 1: pdf_ready_notification**

1. **Template name:** `pdf_ready_notification`
2. **Category:** "Utility"
3. **Languages:** English (UK)
4. **Header:** None
5. **Body:**
   ```
   ✅ Your Car Crash Lawyer AI report is ready! {{1}}
   ```
   - Click **"Add Variable"** for `{{1}}` (user's name)
6. **Footer:** None
7. **Buttons:** None (or add "View Report" button later)
8. **Example values:**
   - {{1}}: John
9. Click **"Submit"**

**Status:** Pending approval (24-48 hours)

---

### 4.3 Create "AI Analysis Complete" Template

**Template 2: ai_complete_notification**

1. **Template name:** `ai_complete_notification`
2. **Category:** "Utility"
3. **Languages:** English (UK)
4. **Body:**
   ```
   🤖 We've finished analyzing your incident. {{1}}
   ```
   - Variable {{1}}: User's name
5. **Example values:**
   - {{1}}: John
6. Click **"Submit"**

**Status:** Pending approval

---

### 4.4 Create "Processing Started" Template

**Template 3: processing_started_notification**

1. **Template name:** `processing_started_notification`
2. **Category:** "Utility"
3. **Languages:** English (UK)
4. **Body:**
   ```
   📋 We're processing your incident report. You'll receive your PDF shortly.
   ```
   - No variables
5. Click **"Submit"**

**Status:** Pending approval

---

### 4.5 Create Generic Template (Optional)

**Template 4: generic_notification**

1. **Template name:** `generic_notification`
2. **Category:** "Utility"
3. **Languages:** English (UK)
4. **Body:**
   ```
   {{1}}
   ```
   - Variable {{1}}: Custom message
5. **Example values:**
   - {{1}}: Your document is ready
6. Click **"Submit"**

---

## Step 5: Configure Environment Variables

### 5.1 Add to `.env` File

Add these lines to `/Users/ianring/Node.js/.env`:

```bash
# WhatsApp Business Cloud API (1000 free messages/month)
WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID_HERE
WHATSAPP_ACCESS_TOKEN=YOUR_PERMANENT_ACCESS_TOKEN_HERE
WHATSAPP_BUSINESS_ACCOUNT_ID=YOUR_BUSINESS_ACCOUNT_ID_HERE  # Optional

# Enable/disable WhatsApp notifications
WHATSAPP_ENABLED=true
```

**Replace:**
- `YOUR_PHONE_NUMBER_ID_HERE` → Phone Number ID from Step 3.1
- `YOUR_PERMANENT_ACCESS_TOKEN_HERE` → Permanent token from Step 3.3
- `YOUR_BUSINESS_ACCOUNT_ID_HERE` → Business Account ID from Step 3.4 (optional)

### 5.2 Add to Railway Variables

1. Go to **Railway Dashboard** → Your project
2. Navigate to **"Variables"** tab
3. Add the same variables:
   ```
   WHATSAPP_PHONE_NUMBER_ID=123456789012345
   WHATSAPP_ACCESS_TOKEN=EAAxxxx...
   WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
   WHATSAPP_ENABLED=true
   ```
4. Click **"Save"**
5. Railway will automatically redeploy

---

## Step 6: Wait for Template Approval

**Timeline:** 24-48 hours (usually faster)

**Check status:**
1. Go to WhatsApp Manager → **"Message Templates"**
2. Look for status:
   - 🟡 **Pending:** Still under review
   - 🟢 **Approved:** Ready to use! ✅
   - 🔴 **Rejected:** Needs modification

**If rejected:**
- Read rejection reason
- Modify template per guidelines
- Resubmit

**Common rejection reasons:**
- Too promotional (use "Utility" category, not "Marketing")
- Contains URLs in body (put in buttons instead)
- Unclear variable placeholders

---

## Step 7: Test WhatsApp Integration

### 7.1 Verify Configuration

```bash
# Check if WhatsApp is configured
node -e "
const whatsapp = require('./lib/services/whatsappService');
console.log('WhatsApp configured:', whatsapp.isConfigured());
"
```

Expected output: `WhatsApp configured: true`

### 7.2 Test Phone Number Formatting

```bash
# Test UK phone number formatting
node -e "
const whatsapp = require('./lib/services/whatsappService');
console.log(whatsapp.formatPhoneNumber('07700 900123'));  // +447700900123
console.log(whatsapp.formatPhoneNumber('+44 7700 900123')); // +447700900123
console.log(whatsapp.formatPhoneNumber('7700900123'));   // +447700900123
"
```

### 7.3 Send Test Message (After Template Approval)

**⚠️ Only works after templates are approved!**

```bash
# Test sending WhatsApp message
node -e "
const whatsapp = require('./lib/services/whatsappService');

(async () => {
  const result = await whatsapp.sendPdfReadyNotification(
    '+44 7700 900123',  // Your test phone number
    'John'              // Test user name
  );
  console.log('Result:', result);
})();
"
```

Expected output:
```json
{
  "success": true,
  "messageId": "wamid.HBgLNDQ3NzAwOTAwMTIzFQIAERgSNkQ3MTdCMjRBMzA4RUMwNjI3AA=="
}
```

**Check your phone:** You should receive WhatsApp message!

---

## Step 8: Complete Incident Report Test

**Full end-to-end test:**

1. **Start incident report** on production site
2. **Complete all pages** (1-12 with images)
3. **Wait for PDF generation** (~2-3 minutes)
4. **Expected notifications:**

   ✅ **Push notification** (if you have app installed)
   ✅ **WhatsApp message** (to your phone number)  ← NEW!
   ✅ **Email** (always sent as backup)

**Notification timeline:**
```
PDF generation complete
    ↓  Immediate
Push notification sent (if app installed)
    ↓  Immediate
WhatsApp message sent (if templates approved)
    ↓  Immediate
Email sent (always)
```

---

## Troubleshooting

### ❌ "WhatsApp not configured" in logs

**Check:**
1. `.env` file has `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`
2. Railway variables are set correctly
3. Railway redeployed after adding variables

**Fix:**
```bash
# Verify .env file
cat .env | grep WHATSAPP

# Expected output:
# WHATSAPP_PHONE_NUMBER_ID=123456789012345
# WHATSAPP_ACCESS_TOKEN=EAAxxxx...
```

### ❌ "Template not found" error

**Cause:** Template not approved yet or wrong template name

**Fix:**
1. Check template status in WhatsApp Manager
2. Wait for approval (24-48 hours)
3. Verify template name matches exactly:
   - `pdf_ready_notification` (not `pdf-ready-notification`)
   - Case-sensitive!

### ❌ "Invalid phone number format" error

**Cause:** Phone number not in E.164 format (+44xxxxxxxxxx)

**Fix:**
- Ensure `user_signup.phone_number` is stored with UK country code
- Format: `+447700900123` (no spaces, no dashes)
- The service auto-formats various UK formats, but database should store E.164

### ❌ WhatsApp message not received

**Check:**
1. **Templates approved?** (WhatsApp Manager → Message Templates)
2. **User has phone number?** (Supabase → user_signup table)
3. **User's phone has WhatsApp?** (Must have WhatsApp installed)
4. **Railway logs:**
   ```bash
   railway logs | grep WhatsApp
   ```

   Look for:
   ```
   💬 WhatsApp message sent successfully
   ```

### ❌ "Access token expired" error

**Cause:** Using temporary token (expires in 24 hours)

**Fix:**
- Create permanent token (Step 3.3)
- Update `.env` and Railway variables
- Redeploy

### ❌ Rate limit errors

**Cause:** Exceeded Meta's rate limits

**Limits:**
- **80 messages per second** (unlikely to hit)
- **1000 free messages per month** (then paid)

**Fix:**
- Check usage in WhatsApp Manager → Analytics
- Upgrade to paid tier if needed (very cheap: ~£0.01-0.05/message)

---

## Cost Monitoring

### Check Monthly Usage

1. Go to **WhatsApp Manager** → **"Analytics"**
2. View **"Message Templates"** tab
3. See message count for current month

**Free tier:** 1000 messages/month
**After free tier:** ~£0.01-0.05 per message (much cheaper than SMS!)

### Stay Within Free Tier

**Estimated usage:**
- 50 incident reports/month → 50 WhatsApp messages
- Well within 1000 free messages! ✅

**If you hit 1000/month:**
- Costs ~£0.01-0.05 per message
- Still much cheaper than SMS (~£0.05-0.10/SMS)
- Email always sent as free backup

---

## Message Template Guidelines

**✅ DO:**
- Use "Utility" category for transaction/service updates
- Keep messages concise and clear
- Use British English for UK customers
- Include company name ("Car Crash Lawyer AI")
- Test with example values before submitting

**❌ DON'T:**
- Use "Marketing" category (higher rejection rate)
- Include URLs in body text (use buttons instead)
- Use promotional language ("Buy now!", "Limited offer!")
- Include pricing in templates (against WhatsApp policy)
- Send unsolicited messages (user must opt-in via signup form)

---

## Security Best Practices

**🔒 Protect your Access Token:**
- Never commit to Git (already in `.gitignore`)
- Rotate token every 90 days (Business Settings → System Users)
- Use permanent token (not temporary)
- Store in Railway environment variables (encrypted)

**🔒 Phone Number Privacy:**
- Only use phone numbers users provided during signup
- Don't share phone numbers with third parties
- GDPR compliance: User can request deletion

**🔒 Message Content:**
- Don't include sensitive personal data in messages
- Don't include full incident details
- Direct users to secure portal for full report

---

## Next Steps After Setup

1. **Wait for template approval** (24-48 hours)
2. **Test with your phone number** (Step 7)
3. **Deploy to Railway** (variables already set!)
4. **Complete full incident report** (end-to-end test)
5. **Monitor usage** in WhatsApp Manager Analytics

---

## Quick Reference

| What | Where to Find |
|------|---------------|
| **WhatsApp Manager** | https://business.facebook.com/wa/manage/ |
| **Business Settings** | https://business.facebook.com/settings/ |
| **Message Templates** | WhatsApp Manager → Message Templates |
| **API Setup** | WhatsApp Manager → API Setup |
| **Analytics/Usage** | WhatsApp Manager → Analytics |
| **System Users** | Business Settings → Users → System Users |
| **Phone Number ID** | WhatsApp Manager → API Setup |
| **Access Token** | Business Settings → System Users → Generate Token |

---

## Support

**WhatsApp Business API Docs:**
- https://developers.facebook.com/docs/whatsapp/cloud-api/

**Meta Business Help:**
- https://www.facebook.com/business/help/

**Template Guidelines:**
- https://developers.facebook.com/docs/whatsapp/message-templates/guidelines

---

**Last Updated:** 2026-01-06
**Status:** Ready for setup
**Estimated Setup Time:** 30-45 minutes (excluding 24-48hr template approval)
