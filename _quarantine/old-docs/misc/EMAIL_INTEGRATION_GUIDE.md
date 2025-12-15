# Email System Integration Guide

## Current Status

✅ **Email service fully implemented** (`lib/emailService.js`)
✅ **12 professional HTML templates** (`templates/emails/`)
❌ **Not integrated** - No controller calls email service yet
❌ **No environment variables** - SMTP credentials not configured

---

## Testing Strategy (BEFORE Deployment)

### Why Test Locally First?

1. **Email is environment-independent** - Works same on localhost and Railway
2. **Faster debugging** - Immediate console logs, test SMTP connection
3. **No deployment cycle** - Fix template/config issues without redeploy
4. **Separate concerns** - Railway deployment focuses on Puppeteer/WebSocket
5. **Free testing** - Gmail SMTP free for development

---

## Quick Start: Test Email System

### Step 1: Configure SMTP (5 minutes)

**Add to Replit Secrets (or `.env`):**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
TEST_EMAIL=your-email@gmail.com  # Optional: where to send test emails
```

**Get Gmail App Password:**
1. Visit: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Copy 16-character password (like: `abcd efgh ijkl mnop`)
4. Use as `SMTP_PASS`

⚠️ **IMPORTANT:** Use App Password, NOT your Gmail password!

### Step 2: Run Email Tests

```bash
node test-email-system.js
```

**Expected Output:**
```
========================================
📧 Email System Test Suite
========================================

[1/5] Checking environment variables...
✅ All environment variables present

Test emails will be sent to: your-email@gmail.com

[2/5] Testing Subscription Welcome Email...
✅ Subscription welcome sent: <message-id>

[3/5] Testing 90-Day Incident Notice...
✅ 90-day notice sent: <message-id>

[4/5] Testing Deletion Warning (7 days)...
✅ 7-day warning sent: <message-id>

[5/5] Testing Legacy PDF Email...
✅ PDF email sent to user: <message-id>
✅ PDF email sent to accounts: <message-id>

========================================
📊 Test Summary
========================================

✅ Email system is working!
📬 Check your inbox at: your-email@gmail.com
📁 You should have received 4-5 test emails
```

**Verify:**
- Check inbox for 4-5 test emails
- Verify professional appearance
- Check spam folder if missing
- Confirm all links work
- Test on mobile device

---

## Integration Points (After Local Testing)

### 1. PDF Generation Complete (Most Important)

**File:** `src/controllers/pdf.controller.js` or wherever PDF generation completes

**Current Code (Approximate):**
```javascript
async function generatePdf(req, res) {
  // ... PDF generation logic ...

  // Save to Supabase
  const { data, error } = await supabase
    .from('completed_incident_forms')
    .insert({ ... });

  // ❌ EMAIL NOT SENT HERE

  res.json({ success: true });
}
```

**Add Email Integration:**
```javascript
const emailService = require('../lib/emailService');

async function generatePdf(req, res) {
  try {
    // ... PDF generation logic ...
    const pdfBuffer = await pdfService.fillPdfForm(data);

    // Save to Supabase
    const { data: savedData, error } = await supabase
      .from('completed_incident_forms')
      .insert({
        create_user_id: userId,
        pdf_url: pdfUrl,
        generated_at: new Date()
      });

    // ✅ SEND PDF EMAIL TO USER AND ACCOUNTS
    if (process.env.EMAIL_ENABLED === 'true') {
      const userEmail = req.user.email; // From auth middleware

      await emailService.sendEmails(
        userEmail,
        pdfBuffer,
        userId
      );

      logger.info('✅ Incident report emailed', { userId, userEmail });
    }

    res.json({ success: true, pdfUrl });

  } catch (error) {
    logger.error('PDF generation failed', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
```

### 2. User Signup (Welcome Email)

**File:** `src/controllers/auth.controller.js`

**After successful signup:**
```javascript
const emailService = require('../lib/emailService');

async function signUp(req, res) {
  try {
    // Create user in Supabase Auth
    const { data: authData, error } = await supabase.auth.signUp({ ... });

    // ✅ SEND WELCOME EMAIL
    if (process.env.EMAIL_ENABLED === 'true') {
      await emailService.sendSubscriptionWelcome(authData.user.email, {
        userName: req.body.first_name,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      });
    }

    res.json({ success: true, user: authData.user });
  } catch (error) {
    logger.error('Signup failed', error);
    res.status(500).json({ error: 'Signup failed' });
  }
}
```

### 3. Incident Submitted (90-Day Notice)

**File:** `src/controllers/signup.controller.js` or wherever incident is finalized

**After incident submission:**
```javascript
const emailService = require('../lib/emailService');

async function submitIncident(req, res) {
  try {
    // Save incident
    const { data: incident, error } = await supabase
      .from('incident_reports')
      .insert({ ... });

    // Calculate deletion date (90 days from now)
    const deletionDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // ✅ SEND 90-DAY NOTICE
    if (process.env.EMAIL_ENABLED === 'true') {
      await emailService.sendIncident90DayNotice(req.user.email, {
        userName: req.user.first_name,
        incidentId: incident.id,
        submittedDate: new Date(),
        deletionDate: deletionDate,
        daysRemaining: 90,
        exportUrl: `${process.env.APP_URL}/api/gdpr/export?userId=${req.user.id}`
      });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Incident submission failed', error);
    res.status(500).json({ error: 'Submission failed' });
  }
}
```

### 4. Scheduled Deletion Warnings (Cron Job)

**File:** `src/jobs/deletionWarnings.js` (create new file)

```javascript
const emailService = require('../lib/emailService');
const logger = require('../utils/logger');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Send deletion warnings at 60, 30, 7, and 1 day before deletion
 * Run daily via cron job
 */
async function checkAndSendWarnings() {
  try {
    logger.info('🔔 Checking for deletion warnings...');

    const today = new Date();

    // Calculate warning dates (60, 30, 7, 1 day before deletion)
    const warningDays = [60, 30, 7, 1];

    for (const days of warningDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      // Find incidents with deletion date = targetDate
      const { data: incidents, error } = await supabase
        .from('incident_reports')
        .select('*, user_signup!inner(email, first_name)')
        .eq('deletion_date', targetDate.toISOString().split('T')[0])
        .is('deleted_at', null);

      if (error) throw error;

      logger.info(`Found ${incidents.length} incidents with ${days} days until deletion`);

      // Send warning email to each user
      for (const incident of incidents) {
        await emailService.sendIncidentDeletionWarning(
          incident.user_signup.email,
          {
            userName: incident.user_signup.first_name,
            incidentId: incident.id,
            submittedDate: incident.created_at,
            deletionDate: incident.deletion_date,
            exportUrl: `${process.env.APP_URL}/api/gdpr/export?userId=${incident.create_user_id}`
          },
          days
        );

        logger.info(`✅ ${days}-day warning sent`, {
          incidentId: incident.id,
          email: incident.user_signup.email
        });
      }
    }

  } catch (error) {
    logger.error('❌ Deletion warning job failed', error);
  }
}

module.exports = { checkAndSendWarnings };
```

**Set up cron job in `index.js`:**
```javascript
const cron = require('node-cron');
const { checkAndSendWarnings } = require('./src/jobs/deletionWarnings');

// Run daily at 9am GMT
cron.schedule('0 9 * * *', () => {
  logger.info('🕐 Running daily deletion warning check');
  checkAndSendWarnings();
});
```

---

## Environment Variables

### Required for Email

```bash
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_USER=noreply@carcrashlawyerai.co.uk
SMTP_PASS=your-gmail-app-password

# Email Feature Flag (disable in dev, enable in prod)
EMAIL_ENABLED=true

# URLs for email links
APP_URL=https://app.carcrashlawyerai.com
DASHBOARD_URL=https://app.carcrashlawyerai.com/dashboard
BILLING_URL=https://app.carcrashlawyerai.com/billing
```

### Optional Environment Variables

```bash
# Override default "from" name
EMAIL_FROM_NAME="Car Crash Lawyer AI"

# Test mode (send all emails to TEST_EMAIL instead of real users)
TEST_EMAIL=dev@carcrashlawyerai.co.uk
```

---

## Production Checklist

Before enabling emails in production:

- [ ] Test all 12 email templates locally (`node test-email-system.js`)
- [ ] Verify emails look professional on mobile and desktop
- [ ] Check spam score (use mail-tester.com)
- [ ] Set up professional SMTP (not Gmail for production!)
  - Consider: SendGrid, Mailgun, AWS SES, Postmark
- [ ] Configure SPF/DKIM/DMARC records for domain
- [ ] Set `EMAIL_ENABLED=true` in Railway environment
- [ ] Test on production (send to your own email first)
- [ ] Monitor email delivery logs
- [ ] Set up cron job for deletion warnings

---

## SMTP Providers Comparison

### Gmail (Development Only)
- ✅ Free
- ✅ Easy setup
- ❌ 500 emails/day limit
- ❌ May flag as spam
- ❌ Not professional for business

### SendGrid (Recommended for Production)
- ✅ 100 emails/day free tier
- ✅ Professional deliverability
- ✅ Email analytics
- ✅ Easy integration
- 💰 $20/month for 50k emails

### Mailgun (Alternative)
- ✅ 5,000 emails/month free
- ✅ Good deliverability
- ✅ Pay-as-you-go
- 💰 $35/month for 50k emails

### AWS SES (Cheapest at Scale)
- ✅ $0.10 per 1,000 emails
- ✅ Unlimited free tier (AWS customers)
- ⚠️ Requires AWS account
- ⚠️ More complex setup

---

## Testing Timeline

**Local Testing (Do This Now):**
1. Configure Gmail SMTP (5 min)
2. Run `node test-email-system.js` (2 min)
3. Verify 4-5 emails received (5 min)
4. Test on mobile device (2 min)
5. Fix any template issues (15-30 min)

**Total: 30-45 minutes before deployment**

**After Railway Deployment:**
1. Add SMTP env vars to Railway
2. Set `EMAIL_ENABLED=true`
3. Test one email in production
4. Monitor logs for errors

---

## Email Templates Available

| Template | Trigger | Purpose |
|----------|---------|---------|
| `subscription-welcome.html` | User signs up | Welcome new subscribers |
| `incident-90day-notice.html` | Incident submitted | Inform user of 90-day retention |
| `incident-warning-60days.html` | 60 days before deletion | First warning |
| `incident-warning-30days.html` | 30 days before deletion | Urgent warning |
| `incident-warning-7days.html` | 7 days before deletion | Critical warning |
| `incident-warning-1day.html` | 1 day before deletion | Final notice |
| `incident-deleted.html` | Data deleted | Confirmation of deletion |
| `subscription-expiring-30days.html` | 30 days before renewal | Renewal reminder |
| `subscription-renewed.html` | Subscription renewed | Confirmation |
| `gdpr-data-exported.html` | User exports data | Export confirmation |
| `gdpr-data-deleted.html` | Data deletion requested | GDPR deletion notice |
| `gdpr-account-deleted.html` | Account deleted | Account closure confirmation |

---

## Quick Command Reference

```bash
# Test email system locally
node test-email-system.js

# Check email templates
ls -1 templates/emails/

# Test specific template (interactive)
node -e "
const emailService = require('./lib/emailService');
emailService.sendSubscriptionWelcome('your@email.com', {
  userName: 'Test User',
  subscriptionStartDate: new Date(),
  subscriptionEndDate: new Date(Date.now() + 365*24*60*60*1000)
}).then(console.log);
"
```

---

## Summary

✅ **Email system is production-ready**
✅ **Professional HTML templates**
✅ **Test locally in 30 minutes**
⏭️ **Integrate after Railway deployment**

**Recommended Order:**
1. Test emails locally NOW (30 min)
2. Deploy to Railway (Option A)
3. Add email integration to controllers
4. Enable `EMAIL_ENABLED=true` in production
5. Test one email in production
6. Set up cron job for deletion warnings

---

**Last Updated:** 2025-11-22
**Status:** Ready for local testing
