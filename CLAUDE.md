# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**Car Crash Lawyer AI** is a GDPR-compliant Node.js web application that helps UK traffic accident victims complete legal incident reports. The system integrates Typeform webhooks, OpenAI transcription, Adobe PDF Services, and Supabase to generate comprehensive 17-page legal PDF reports.

**Version:** 2.1.0
**Runtime:** Node.js >=18.18
**Database:** Supabase (PostgreSQL)
**Location:** UK (DD/MM/YYYY, £ GBP, British English)

## Development Commands

### Essential Commands

```bash
# Development
npm run dev              # Start with nodemon hot-reload
npm start                # Production server

# Testing
npm test                 # Run Jest test suite
npm run lint             # ESLint code checking
npm run format           # Prettier code formatting

# Validation Scripts
node test-adobe-pdf.js                    # Test Adobe PDF Services integration
node test-form-filling.js [user-uuid]     # Test PDF generation with real data
node scripts/test-supabase-client.js      # Verify Supabase connection
node scripts/monitor-image-processing.js  # Monitor image processing status
node scripts/retry-failed-images.js       # Retry failed image uploads

# Health Checks
curl http://localhost:5000/healthz       # Basic health
curl http://localhost:5000/readyz        # Readiness with DB check
```

### Running Single Tests

```bash
# Run specific test file
npm test -- path/to/test.js

# Run tests matching pattern
npm test -- --testNamePattern="webhook"

# Watch mode for TDD
npm run test:watch
```

## Architecture Overview

### Request Flow

**User Signup via Typeform:**
```
Typeform → POST /webhooks/typeform → webhook.controller.js
  → ImageProcessorV2.processTypeformImage() (async)
  → Supabase user_signup + user_documents tables
  → Redirect to /payment-success.html
```

**PDF Generation:**
```
POST /api/pdf/generate → pdf.controller.js
  → lib/dataFetcher.fetchAllData(userId) (fetch from 6 tables)
  → src/services/adobePdfFormFillerService.fillPdfForm() (150+ fields)
  → src/services/adobePdfService.compressPdf() (40-70% reduction)
  → Store in Supabase Storage + completed_incident_forms table
  → Email to user via lib/emailService.js
```

**Audio Transcription:**
```
POST /api/transcription/transcribe → transcription.controller.js
  → Upload to Supabase Storage
  → Create transcription_queue record
  → src/services/agentService.js (background processing)
  → OpenAI Whisper API transcription
  → GPT-4 summary generation
  → WebSocket broadcast to frontend
```

### Key Architectural Patterns

**Database Schema:**
- Primary key across all tables: `create_user_id` (UUID from Typeform)
- All tables have RLS policies enabled (service role bypasses for webhooks)
- Soft deletes via `deleted_at` column (GDPR compliance)
- 7-year retention policy for legal documents

**Image Processing Pipeline:**
- V2 processor uses database-driven status tracking (`pending` → `processing` → `completed`/`failed`)
- Automatic retry with exponential backoff (max 3 retries)
- Error categorization: AUTH_ERROR, NOT_FOUND, TIMEOUT, RATE_LIMIT, etc.
- Permanent API URLs replace expiring Typeform URLs: `/api/user-documents/{uuid}/download`

**PDF Form Filling:**
- Uses pdf-lib to fill 150+ form fields across 17 pages
- Field mapping documented in `ADOBE_FORM_FILLING_GUIDE.md`
- Data sources: user_signup, incident_reports, dvla_vehicle_info_new, ai_transcription, ai_summary
- Form flattening prevents editing after generation

**Error Handling Standard:**
```javascript
// All services follow this pattern
try {
  const result = await riskyOperation();
  logger.info('Operation completed', { result });
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new Error('User-friendly message');
}
```

### Critical Tables

| Table | Primary Purpose | Key Columns |
|-------|----------------|-------------|
| `user_signup` | Personal info, vehicle, insurance | email, name, car_registration_number, driving_license_number |
| `incident_reports` | Accident details (131+ columns) | medical info, weather, vehicle damage, other drivers |
| `user_documents` | Image processing status | status, retry_count, error_code, storage_path, public_url |
| `dvla_vehicle_info_new` | DVLA lookup results | make, model, colour, year_of_manufacture |
| `ai_transcription` | OpenAI Whisper transcripts | transcript_text, audio_duration, language |
| `ai_summary` | GPT-4 summaries | summary_text, transcription_id |
| `completed_incident_forms` | Final PDF records | pdf_url, email_sent_at, storage_path |

**All tables include:**
- `create_user_id` (foreign key to user_signup)
- `created_at`, `updated_at` (timestamps)
- `deleted_at` (soft delete)
- `gdpr_consent` (legal compliance)

### Directory Structure

```
/src/
  controllers/    # Request handlers (thin layer)
  services/       # Business logic (image processing, AI, GDPR)
  middleware/     # Auth, CORS, rate limiting, error handling
  routes/         # API route definitions
  utils/          # Logger, validators, helpers

/lib/
  dataFetcher.js     # Fetch data from 6 tables for PDF generation
  emailService.js    # Send emails via nodemailer
  pdfGenerator.js    # Legacy fallback (pdf-lib only)
  generators/        # Email templates, PDF utilities

/public/            # 18 HTML pages (landing, dashboard, forms)
/scripts/           # Cron jobs, testing, migrations
/pdf-templates/     # Car-Crash-Lawyer-AI-Incident-Report.pdf (150+ fields)
/credentials/       # Adobe credentials (NOT in Git)
```

## Common Development Scenarios

### Adding a New Database Column

1. **Update Supabase schema** (dev environment auto-execute):
```sql
ALTER TABLE user_signup ADD COLUMN new_field TEXT;
```

2. **Update RLS policies if needed**:
```sql
-- Example: Allow users to update their own new field
CREATE POLICY "Users update own new_field"
ON user_signup FOR UPDATE
USING (auth.uid() = create_user_id::uuid);
```

3. **Update dataFetcher.js if used in PDFs**:
```javascript
// lib/dataFetcher.js already uses SELECT '*', no change needed
```

4. **Update PDF field mapping** (if displaying in PDF):
```javascript
// src/services/adobePdfFormFillerService.js
this.setFieldValue(form, 'new_field', data.user.new_field);
```

5. **Document in ADOBE_FORM_FILLING_GUIDE.md**

### Processing Typeform Webhooks

**Critical requirements:**
- Signature verification MUST use `req.rawBody` (captured in app.js)
- Service role key required (bypasses RLS)
- Return 200 OK within 5 seconds (Typeform timeout)
- Process images async after response sent

**Pattern:**
```javascript
// 1. Verify signature immediately
const isValid = verifyTypeformSignature(req.rawBody, signature);
if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

// 2. Extract data
const { create_user_id, answers } = extractTypeformData(req.body);

// 3. Send 200 OK quickly
res.status(200).json({ received: true });

// 4. Process async (don't await in webhook handler)
processImagesAsync(create_user_id, imageUrls).catch(logger.error);
```

### Image Processing Workflow

**When Typeform sends image URLs:**
```javascript
// ImageProcessorV2 handles everything
await imageProcessorV2.processTypeformImage({
  userId: create_user_id,
  imageUrl: typeformUrl,
  documentType: 'driving_license_picture',
  sourceId: formId
});

// Process:
// 1. Insert user_documents record (status: pending)
// 2. Download from Typeform with retry logic
// 3. Upload to Supabase Storage bucket: user-documents
// 4. Generate permanent API URL: /api/user-documents/{uuid}/download
// 5. Update status to completed or failed
// 6. Automatic retry if failed (exponential backoff)
```

**Check processing status:**
```bash
node scripts/monitor-image-processing.js
```

**Retry failed images:**
```bash
node scripts/retry-failed-images.js --dry-run  # Preview
node scripts/retry-failed-images.js            # Execute
```

### Generating PDFs

**Full flow:**
```javascript
// 1. Fetch all data from Supabase
const data = await fetchAllData(createUserId);
// Returns: { user, incidents, currentIncident, dvla, images, imageUrls, metadata }

// 2. Fill PDF form
const adobeService = new AdobePdfFormFillerService();
const filledPdfBuffer = await adobeService.fillPdfForm(data);

// 3. Compress (optional but recommended)
const compressedBuffer = await adobePdfService.compressPdf(filledPdfBuffer);

// 4. Store in Supabase
const fileName = `incident-report-${createUserId}-${Date.now()}.pdf`;
await supabase.storage
  .from('completed-reports')
  .upload(fileName, compressedBuffer);

// 5. Email to user and accounts team
await emailService.sendCompletedReport(userEmail, pdfUrl);
```

**Testing:**
```bash
node test-form-filling.js [user-uuid]
```

## Environment Variables

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx       # For webhooks (bypasses RLS)
SUPABASE_ANON_KEY=xxx               # For client-side auth
OPENAI_API_KEY=sk-xxx               # Whisper + GPT-4
TYPEFORM_WEBHOOK_SECRET=xxx         # HMAC signature verification
```

**Optional (falls back gracefully):**
```bash
PDF_SERVICES_CLIENT_ID=xxx          # Adobe OAuth v4
PDF_SERVICES_CLIENT_SECRET=xxx      # Falls back to pdf-lib
WHAT3WORDS_API_KEY=xxx              # Location services
DVLA_API_KEY=xxx                    # UK vehicle lookups
```

**Application:**
```bash
NODE_ENV=production
PORT=5000
REQUEST_TIMEOUT=30000               # 30 seconds
APP_URL=https://your-domain.com
```

## Testing Strategy

### PDF Generation Tests
```bash
# Test Adobe SDK initialization
node test-adobe-pdf.js

# Test full form filling with real user data
node test-form-filling.js <create_user_id>
```

### Webhook Tests
```bash
# Test Typeform webhook processing
node scripts/test-typeform-webhook.js

# Test incident report webhook
node scripts/test-incident-webhook.js
```

### Database Tests
```bash
# Verify Supabase connection and RLS policies
node scripts/test-supabase-client.js

# Test database queries and relationships
node scripts/test-database.js
```

### Manual UI Testing
See `MANUAL_TESTING_GUIDE.md` for comprehensive UI test procedures.

## Security Considerations

**Webhook Signature Verification:**
```javascript
// CRITICAL: Use req.rawBody (not JSON parsed body)
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = hmac.digest('base64');
const receivedSignature = req.headers['typeform-signature'].replace('sha256=', '');

// Use timing-safe comparison
const expectedBuffer = Buffer.from(expectedSignature, 'base64');
const receivedBuffer = Buffer.from(receivedSignature, 'base64');
return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
```

**RLS Policy Pattern:**
```sql
-- Users can only access their own data
CREATE POLICY "Users view own records"
ON user_signup FOR SELECT
USING (auth.uid() = create_user_id::uuid);

-- Service role bypasses all RLS (for webhooks)
-- No policy needed for service_role
```

**Input Validation:**
```javascript
// All controllers use validator.js
const { isEmail, isUUID, isMobilePhone } = require('validator');

if (!isEmail(email)) {
  throw new Error('Invalid email format');
}

if (!isUUID(create_user_id)) {
  throw new Error('Invalid user ID');
}

if (!isMobilePhone(mobile, 'en-GB')) {
  throw new Error('Invalid UK phone number');
}
```

## GDPR Compliance

**Data retention:**
- Legal documents: 7 years from incident date
- User accounts: Delete after retention_until date
- Soft delete: Set `deleted_at`, don't remove rows immediately
- Audit all deletions in `audit_logs` table

**User rights:**
```javascript
// Right to data export
GET /api/gdpr/data-export?user_id={id}
// Returns all user data in JSON format

// Right to be forgotten
POST /api/gdpr/delete-account
// Soft deletes all records, schedules hard delete after 30 days

// Access audit log
GET /api/gdpr/audit-log?user_id={id}
```

**Scripts:**
```bash
# Check accounts ready for deletion
node scripts/auto-delete-expired-accounts.js --dry-run

# Send 30-day deletion warnings
node scripts/send-subscription-warnings.js
```

## Troubleshooting

### Adobe PDF Service Not Working

**Check:**
```bash
# 1. Credentials exist
echo $PDF_SERVICES_CLIENT_ID
echo $PDF_SERVICES_CLIENT_SECRET

# 2. Template exists
ls -la pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf

# 3. Test service
node test-adobe-pdf.js
```

**Fallback:** System automatically uses pdf-lib if Adobe credentials missing.

### Image Processing Failures

**Common causes:**
1. **AUTH_ERROR (401/403):** Typeform URL expired → Retry won't help, needs re-upload
2. **TIMEOUT:** Network issue → Automatic retry with exponential backoff
3. **STORAGE_UPLOAD_ERROR:** Supabase issue → Check storage quota

**Debug:**
```bash
node scripts/monitor-image-processing.js  # Check status
node scripts/retry-failed-images.js --dry-run  # Preview retries
```

### Webhook Signature Verification Failed

**Causes:**
1. `req.rawBody` not captured (check app.js middleware order)
2. Wrong secret in `.env`
3. Body modified before verification

**Fix:**
```javascript
// Ensure this runs BEFORE express.json()
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
```

### Supabase Connection Issues

**Check:**
```bash
# Test connection
node scripts/test-supabase-client.js

# Verify RLS policies
# Login to Supabase dashboard → Database → Policies
```

**Common issues:**
- Using anon key instead of service role key (webhooks need service role)
- RLS policy blocking query (check policy conditions)
- Network timeout (increase timeout in client config)

## Performance Notes

**Database queries:**
- `fetchAllData()` makes 5 parallel queries (user, incidents, dvla, images, transcription)
- Uses `.single()` for user table (enforces one result)
- Orders incidents by `created_at DESC` (most recent first)
- Generates signed URLs for images (valid 1 hour)

**PDF generation:**
- Average time: 2-3 seconds for 17-page form
- Compression reduces size by 40-70%
- Uses streams for large files to avoid memory issues

**Image processing:**
- Processes images async (non-blocking for webhooks)
- Retry strategy: 1min → 5min → 30min delays
- Max file size: 10MB (Supabase free tier)

**Rate limits:**
- Adobe PDF Services: 500 operations/month (free tier)
- OpenAI Whisper: Pay-per-use (track costs via dashboard)
- Supabase: 500MB database, 1GB storage (free tier)

## Code Quality Standards

**Logging:**
```javascript
const logger = require('./utils/logger');

logger.info('User created', { userId, email });
logger.success('PDF generated', { userId, duration });
logger.warn('Retry scheduled', { imageId, attempt });
logger.error('Processing failed', { error: error.message });
```

**Error responses:**
```javascript
// Consistent API error format
res.status(statusCode).json({
  error: {
    message: 'User-friendly message',
    code: 'ERROR_CODE',
    requestId: req.requestId
  }
});
```

**Code style:**
- 2 spaces indentation
- Single quotes for strings
- Semicolons required
- Line length <100 characters
- ES6+ features (async/await, destructuring, template literals)

## Related Documentation

- `README.md` - Quick start, API endpoints, deployment
- `ARCHITECTURE.md` - Detailed system architecture
- `ADOBE_FORM_FILLING_GUIDE.md` - Complete 150+ field mapping reference
- `QUICK_START_FORM_FILLING.md` - PDF generation quick start
- `IMPLEMENTATION_SUMMARY.md` - Latest implementation details
- `MANUAL_TESTING_GUIDE.md` - UI testing procedures
- `.claude/claude.md` - Claude Code global rules and standards

---

**Last Updated:** 2025-10-19
**For Questions:** Review `replit.md` for comprehensive system documentation
