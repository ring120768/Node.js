# Email Flow Documentation

**Last Updated:** 2026-01-01

## Overview

When a user completes an incident report, the system sends **3 primary emails** (potentially 4 if AI processing fails):

---

## 1. Image Download Links Email

**Trigger:** After incident form submission (Page 12 completed)
**Function:** `sendImageDownloadLinks()` in `lib/emailService.js` line 788
**Called From:** `src/controllers/pdf.controller.js` (endpoint: `/send-image-links/:userId`)

### Recipients
- **User only** (their email address from signup)

### Purpose
Sends download links for all uploaded images (vehicle photos, damage photos, documents, etc.)

### Content Includes
- Categorised download links for all images:
  - Vehicle images
  - Damage images
  - Other vehicle images
  - Documents
  - Location images
- Signed URLs valid for subscription duration (or 90 days default)
- Expiry date clearly shown
- Upload timestamps for each image

### Subject Line
`Your Uploaded Images - Car Crash Lawyer AI`

### Attachments
None (contains download links instead)

### When Sent
- Immediately after user submits Page 12 (final incident form page)
- Non-blocking (doesn't delay form submission response)
- Only sent if user has uploaded images

### Example Email Structure
```
Dear [User Name],

Your uploaded images are ready for download:

🚗 Vehicle Images
- Front view (uploaded 01/01/2026) [Download]
- Rear view (uploaded 01/01/2026) [Download]

💥 Damage Images
- Front bumper damage (uploaded 01/01/2026) [Download]

⚠️ Important: These links expire on [expiry date]
```

---

## 2. 90-Day Data Retention Notice

**Trigger:** After incident form submission (Page 12 completed)
**Function:** `sendIncident90DayNotice()` in `lib/emailService.js` line 187
**Called From:** `src/controllers/incidentForm.controller.js` (Page 12 submission handler)

### Recipients
- **User only**

### Purpose
GDPR compliance - notify user of 90-day data retention policy + PDF processing status

### Content Includes
- **Processing status notice** - Report being generated (2-3 minutes)
- **What user will receive** - 18-page PDF, AI summary, images, DVLA reports
- Incident ID
- Submission date
- **Deletion date** (90 days from submission)
- Days remaining (always 90 on initial send)
- Explanation of data retention policy
- Contact information for data requests

### Subject Line
`Important: Your Data Retention Notice - Car Crash Lawyer AI`

### Attachments
None

### When Sent
- Immediately after Page 12 submission
- Fire-and-forget (non-blocking)
- Only sent if `EMAIL_ENABLED=true` in environment

### Example Email Structure
```
Dear [User Name],

Thank you for submitting your incident report. We're currently processing
your comprehensive legal documentation.

⏳ Your Report is Being Generated
Your incident report is currently being processed and will be sent to your
email address when completed (typically within 2-3 minutes).

What you'll receive:
• Comprehensive 18-page legal incident report (PDF)
• AI-generated summary and analysis
• All uploaded images and documentation
• DVLA vehicle reports (if applicable)

🚨 CRITICAL: 90-DAY DATA RETENTION
Your incident data will be AUTOMATICALLY DELETED on: [Date + 90 days]
(90 days from now)

Incident ID: [UUID]
Submitted: [Date]
Scheduled Deletion: [Date + 90 days]

Under UK GDPR, we will retain your data for 90 days...

To request early deletion or export your data, contact us at...
```

---

## 3. PDF Incident Report Email (Primary)

**Trigger:** After PDF generation completes successfully
**Function:** `sendEmails()` in `lib/emailService.js` line 365
**Called From:** `src/controllers/pdf.controller.js` (PDF queue processor)

### Recipients
- **User** (email from signup)
- **Accounts Department** (`accounts@carcrashlawyerai.com` or `ACCOUNTS_EMAIL` env var)

### Purpose
Deliver the completed 18-page legal incident report PDF

### Content Includes
- Greeting with user's email name
- Report ID (user UUID)
- Generation timestamp (UK format)
- Total pages: 17 (displayed as 17, actually 18 pages)
- Next steps checklist:
  1. Contact insurance provider
  2. Keep report for records
  3. Seek medical attention if needed
  4. Consider legal consultation
- GDPR confidentiality notice
- Emergency contact info (999)

### Subject Lines
- **To User:** `Traffic Accident Legal Report - [Date]`
- **To Accounts:** `[ACCOUNTS COPY] Traffic Accident Legal Report - [Date]`

### Attachments
- **Incident_Report_[UUID]_[Date].pdf** (compressed, ~200-500 KB)

### When Sent
- After PDF generation completes (2-3 minutes after Page 12 submission)
- After PDF stored in Supabase Storage
- After `completed_incident_forms` record created
- Both emails sent sequentially (user first, then accounts)

### Email Flow
```
1. User email sent → Wait for success
2. If user email succeeds → Send accounts copy
3. If accounts fails → Log warning but still return success
4. Update completed_incident_forms (sent_to_user, sent_to_accounts flags)
5. Update incident_reports (pdf_sent_at timestamp)
```

### Example Email Structure
```
[Purple/Blue Gradient Header]
Car Crash Lawyer AI
Traffic Accident Legal Report

Your Incident Report is Ready

Dear [user email prefix],

Your comprehensive traffic accident legal report has been generated...

Important Information:
- Report ID: [UUID]
- Generated: 01/01/2026, 14:30:00
- Total Pages: 17

[Attachment: Incident_Report_[UUID]_2026-01-01.pdf]

Next Steps:
1. Contact your insurance provider immediately
2. Keep this report for your records
3. Seek medical attention if needed
4. Consider legal consultation if required

[Footer with UK GDPR notice]
Emergency Contact: 999 (UK Emergency Services)
```

---

## 4. AI Processing Notification (Fallback Only)

**Trigger:** If PDF pages 13-16 (AI summary/transcription) fail to render
**Function:** `sendAiProcessingEmail()` in `lib/emailService.js` line 496
**Called From:** `src/controllers/pdf.controller.js` (if Puppeteer fails)

### Recipients
- **User**
- **Accounts Department**

### Purpose
Notify that AI pages are still being processed (fallback notification)

### Content Includes
- User name
- Incident ID
- Explanation that AI summary is still processing
- Promise to email full report when complete
- GDPR notice

### Subject Line
`Incident Report Processing - Car Crash Lawyer AI`

### Attachments
None (notification only)

### When Sent
- **Only if** Puppeteer fails to render pages 13-16
- Rare occurrence (fallback scenario)
- System will retry PDF generation via queue

### Example Email Structure
```
Car Crash Lawyer AI
Incident Report Processing

Hello [User Name],

Your incident report is still being processed. We are finalizing
the AI summary pages and will email the full report once processing
is complete.

Incident ID: [UUID]

[Footer with GDPR notice]
```

---

## Email Sending Configuration

### Service Provider
**Resend** (HTTP-based API) - Replaced nodemailer due to Railway's blocked SMTP ports

### From Address
```
RESEND_FROM_EMAIL=Car Crash Lawyer AI <noreply@carcrashlawyerai.com>
```

Fallback (development/testing):
```
Car Crash Lawyer AI <onboarding@resend.dev>
```

### Environment Variables

**Required:**
```bash
RESEND_API_KEY=re_xxxxx                    # Resend API key
RESEND_FROM_EMAIL=noreply@carcrashlawyerai.com  # Verified sender domain
```

**Optional:**
```bash
ACCOUNTS_EMAIL=accounts@carcrashlawyerai.com    # Accounts copy recipient
EMAIL_ENABLED=true                              # Enable/disable emails
```

### Email Delivery Guarantees

**User Email (Primary):**
- If fails → Entire PDF process marked as failed
- Error logged with full details
- Admin notification triggered
- Email queued for retry

**Accounts Email (Secondary):**
- If fails → Warning logged but process continues
- User email success takes priority
- No retry for accounts copy

---

## Complete Timeline

**When user completes incident report (Page 12 submission):**

```
T+0s:    Page 12 form submitted
         ├─ Incident record created in database
         ├─ PDF generation queued (status: pending)
         └─ Response sent to user (200 OK)

T+1s:    Email #1: Image Download Links sent ✉️
         └─ Non-blocking (fire-and-forget)

T+2s:    Email #2: 90-Day Retention Notice sent ✉️
         └─ Non-blocking (fire-and-forget)

T+10s:   PDF queue processor starts
         ├─ Fetch data from 6 database tables
         ├─ Generate pages 1-12 (Adobe form fill)
         ├─ Generate pages 13-16 (Puppeteer HTML→PDF)
         ├─ Generate pages 17-18 (Adobe form fill)
         ├─ Merge all pages with pdf-lib
         ├─ Compress PDF
         ├─ Upload to Supabase Storage
         └─ Create completed_incident_forms record

T+120s:  Email #3: PDF Report sent to user ✉️
         ├─ User email sent first
         ├─ If success → Email #3b: PDF copy to accounts ✉️
         ├─ Update sent_to_user flag
         ├─ Update sent_to_accounts flag
         └─ Update pdf_sent_at timestamp

T+121s:  PDF queue marked "completed"
         └─ User has received all 3 emails ✅
```

**If AI pages fail (rare):**
```
T+120s:  Email #4: AI Processing Notice sent ✉️
         ├─ Sent to user + accounts
         ├─ PDF queue marked "failed"
         └─ Retry scheduled
```

---

## Error Handling

### User Email Fails
```javascript
if (!userResult.success) {
  console.error(`❌ Failed to send to user: ${userResult.error}`);
  return userResult;  // THROW - entire process fails
}
```

**Impact:**
- PDF generation marked as "failed" in queue
- `completed_incident_forms.sent_to_user = false`
- `incident_reports.pdf_sent_at = NULL`
- Email queued for retry in `email_retry_queue`
- Admin notification sent
- User can retry from dashboard

### Accounts Email Fails
```javascript
if (!accountsResult.success) {
  console.warn(`⚠️ Failed to send accounts copy: ${accountsResult.error}`);
  // Continue - don't fail the entire process
}
```

**Impact:**
- Warning logged only
- `completed_incident_forms.sent_to_accounts = false`
- User email still succeeds
- Process continues normally
- No retry for accounts copy

### Image Email Fails
```javascript
if (images.length === 0) {
  console.log('No images found for user, skipping email');
  return { success: false, reason: 'no_images' };
}
```

**Impact:**
- Logged but not critical
- PDF process continues normally
- User may not have uploaded images

---

## Database Updates

### After Successful Email Delivery

**`completed_incident_forms` table:**
```sql
UPDATE completed_incident_forms SET
  sent_to_user = true,              -- User email succeeded
  sent_to_accounts = true,          -- Accounts email succeeded
  email_status = {
    "user": "sent",
    "accounts": "sent",
    "userEmailId": "msg_xxx",       -- Resend message ID
    "accountsEmailId": "msg_yyy"    -- Resend message ID
  },
  email_attempts = 1,
  updated_at = NOW()
WHERE id = [form_id];
```

**`incident_reports` table:**
```sql
UPDATE incident_reports SET
  pdf_sent_at = NOW(),              -- Mark PDF as sent
  pdf_send_in_progress = false      -- Clear lock
WHERE id = [incident_id];
```

**`pdf_generation_queue` table:**
```sql
UPDATE pdf_generation_queue SET
  status = 'completed',
  completed_at = NOW(),
  last_error = NULL
WHERE id = [queue_id];
```

---

## Testing

### Verify All Emails Sent

**Check completed_incident_forms:**
```sql
SELECT
  id,
  incident_id,
  sent_to_user,
  sent_to_accounts,
  email_status,
  created_at
FROM completed_incident_forms
WHERE create_user_id = '[user-uuid]'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
```
sent_to_user      | true
sent_to_accounts  | true
email_status      | {"user": "sent", "accounts": "sent", ...}
```

**Check incident_reports:**
```sql
SELECT
  id,
  pdf_sent_at,
  pdf_send_in_progress
FROM incident_reports
WHERE create_user_id = '[user-uuid]'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
```
pdf_sent_at           | 2026-01-01 14:30:00+00 (NOT NULL)
pdf_send_in_progress  | false
```

### Test Email Reception

After completing incident form, user should receive:

1. ✅ **Image Download Links** (within seconds)
2. ✅ **90-Day Retention Notice** (within seconds)
3. ✅ **PDF Report with Attachment** (within 2-3 minutes)

Accounts department should receive:

4. ✅ **PDF Report Copy** (within 2-3 minutes)

---

## Common Issues

### User Not Receiving PDF Email

**Check:**
1. `pdf_generation_queue.status` = "completed" ✅
2. `completed_incident_forms` record exists ❌
3. `sent_to_user` flag = false ❌

**Likely Causes:**
- Database insert failed (check `incident_id` column exists)
- PDF storage upload failed
- Email sending failed (check Resend API key)
- Resend domain not verified

**Fix:**
- Check Railway logs for `🚨 CRITICAL` errors
- Verify Resend domain verified in Resend dashboard
- Check `RESEND_API_KEY` environment variable
- Retry email from dashboard

### Accounts Not Receiving Copy

**Check:**
1. User email succeeded ✅
2. `sent_to_accounts` = false ❌

**Likely Causes:**
- `ACCOUNTS_EMAIL` environment variable not set
- Resend rate limit reached
- Invalid accounts email address

**Fix:**
- Set `ACCOUNTS_EMAIL=accounts@carcrashlawyerai.com`
- Check Resend dashboard for delivery status
- User email still succeeds (not critical)

### Image Email Not Sent

**Check:**
1. User uploaded images ✅
2. Images have `status = 'completed'` ✅
3. Email endpoint called ❌

**Likely Causes:**
- Frontend didn't call `/send-image-links/:userId` endpoint
- User has no images uploaded
- Email service unavailable

**Fix:**
- Not critical - user gets images in PDF
- Check frontend dashboard.html for endpoint call
- Verify images exist in `user_documents` table

---

## Environment Variables Summary

```bash
# Required for all emails
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Car Crash Lawyer AI <noreply@carcrashlawyerai.com>

# Optional
ACCOUNTS_EMAIL=accounts@carcrashlawyerai.com
EMAIL_ENABLED=true  # Set false to disable all emails
```

---

## Related Files

| File | Purpose |
|------|---------|
| `lib/emailService.js` | All email sending functions |
| `src/controllers/pdf.controller.js` | PDF generation & email orchestration |
| `src/controllers/incidentForm.controller.js` | Page 12 submission (triggers emails 1 & 2) |
| `src/services/pdfQueueService.js` | PDF queue processor |
| `templates/emails/` | Email HTML templates (if used) |

---

**Last Updated:** 2026-01-01
**Version:** 2.1.0
