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
node test-emergency-api.js [user-uuid]  # Test emergency contacts API
```

### Emergency Contact System

**Data Format Issue:**
The `emergency_contact` field from Typeform contains pipe-delimited data:
```
"Emergency First name Last name | +447411005390 | email@example.com | Company Name"
```

**API Endpoint:**
```
GET /api/contacts/:userId
```

**Response handling:**
```javascript
// Controller automatically parses pipe-delimited format
function parseEmergencyContact(emergencyContactString) {
  if (emergencyContactString?.includes('|')) {
    const parts = emergencyContactString.split('|').map(p => p.trim());
    return parts[1]; // Phone number is at index 1
  }
  return emergencyContactString;
}

// Returns:
{
  emergency_contact: "+447411005390",           // Parsed from pipe-delimited string
  recovery_breakdown_number: "07411005390",     // Direct from database
  emergency_services_number: "999"              // Default or custom
}
```

**Frontend Integration Pattern:**
```javascript
// CRITICAL: Do NOT call setupEmergencyButtons() after loadUserData()
// It will overwrite the real handlers with placeholder "Please wait..." messages

async function loadUserData() {
  const response = await fetch(`/api/contacts/${userId}`);
  const contacts = await response.json();
  updateEmergencyButtons(); // Sets real handlers
}

// Initialization order matters:
await loadUserData();        // Calls updateEmergencyButtons() internally
// setupEmergencyButtons();  // ❌ NEVER call this here - it overwrites real handlers
setupLocationButton();
```

**Phone Number Format:**
Both UK local and international formats work with `tel:` links:
- `07411005390` (UK local format)
- `+447411005390` (International format)

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

### Dashboard Tests
```bash
# Find test user with data for dashboard testing
node scripts/find-test-user.js

# Test dashboard API endpoints (HTTP-based)
node scripts/test-dashboard-api.js [user-id]

# Validate dashboard data (direct database queries)
node scripts/validate-dashboard.js [user-id]
```

**Dashboard sections tested:**
- Incident Reports (`/api/incident-reports`)
- Images (`/api/user-documents` filtered for images)
- Dashcam Footage (`/api/user-documents` filtered for videos)
- Audio Transcriptions (`/api/transcription/history`)
- Generated Reports (`/api/pdf/status/:userId`)

**Quick dashboard audit:**
See `QUICK_DASHBOARD_TEST.md` for 5-minute test procedure and `DASHBOARD_AUDIT.md` for comprehensive 130-point checklist.

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

## Development Workflow Standards

### Git Commit and Push Protocol

**🔴 MANDATORY: Automatically commit and push to GitHub after EVERY completed and tested task**

This is a STANDARD PRACTICE that must be followed without asking for permission. When a task is completed and working correctly, Claude Code will automatically commit and push the changes.

1. **Automatic Commit Trigger - Do this after:**
✅ Completing a feature implementation that works
✅ Fixing a bug that's been verified
✅ Updating documentation
✅ Refactoring code that's been tested
✅ Adding tests that pass
✅ Any task marked as "completed" in todo list
✅ Resolving any user-reported issue

2. **Pre-commit Checklist (verify automatically):**
```javascript
// Before committing, ensure:
✓ Code runs without errors
✓ No syntax errors or crashes
✓ Tests pass (if applicable)
✓ Server starts successfully (if backend changes)
✓ Frontend loads without console errors (if UI changes)
```

3. **Commit Process:**
```bash
# Test the changes first
npm test  # If tests exist
npm start # Verify server runs

# If everything works, then commit:
git add <files>
git commit -m "type: Brief description

Detailed explanation:
- What was implemented/fixed
- How it was tested
- Any important technical details

Tested: ✓ Code runs without errors
Status: Working

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin <branch-name>
```

4. **Commit Message Format:**
- Types: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- First line: Brief summary (max 72 characters)
- Body: Include testing status and confirmation it works
- Always include Claude Code attribution

5. **❌ NEVER Commit:**
- Code with syntax errors
- Code that crashes on startup
- Code with failing tests
- Incomplete implementations
- Code with known runtime errors
- Sensitive data (API keys, credentials)
- Untested changes

6. **Example Commit After Task:**
```bash
# After fixing dashboard image display issue
git add public/dashboard.html fix-image-urls.js
git commit -m "fix: Resolve dashboard image viewing issue

- Fixed dashboard to use signed_url field from API
- Generated fresh signed URLs for expired images
- Created diagnostic script for testing
- Added auth bypass for testing

Tested: ✓ Images now display correctly in dashboard
Verified: ✓ API returns signed URLs, frontend renders them

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feat/audit-prep
```

7. **Verification After Push:**
```bash
git status  # Should show "Your branch is up to date"
git log -1  # Verify commit was created
```

**🔴 IMPORTANT:** This is NOT optional. Every completed task that works correctly MUST be committed and pushed immediately. Only skip if:
- User explicitly says "don't commit yet"
- Code has errors or doesn't work
- Task is incomplete

**Default behavior:** Complete task → Test it works → Commit & Push automatically

### Keep It Simple - Don't Over-Engineer

**IMPORTANT:** Always choose the simplest solution that solves the problem. Avoid over-engineering.

**Principles:**
1. **Start simple, add complexity only when needed**
   - Implement the minimum viable solution first
   - Add features/abstractions only when requirements demand it
   - Don't anticipate future needs that may never materialize

2. **Avoid premature optimization**
   - Write clear, working code first
   - Optimize only when performance issues are identified
   - Measure before optimizing

3. **Don't add unnecessary abstractions**
   - Avoid creating layers, classes, or patterns "just in case"
   - Use abstractions only when you have 3+ instances of duplication
   - Keep functions and modules focused and simple

4. **Favor readability over cleverness**
   - Write code that's easy to understand and maintain
   - Avoid complex one-liners or overly clever solutions
   - Comment when necessary, but prefer self-documenting code

5. **Question every addition**
   - Ask: "Is this really needed to solve the current problem?"
   - Ask: "Will this make the code simpler or more complex?"
   - When in doubt, leave it out

**Examples:**

❌ **Over-engineered:**
```javascript
// Creating a factory pattern for a single use case
class UserValidatorFactory {
  createValidator(type) {
    return new UserValidator(new EmailValidator(), new PhoneValidator());
  }
}
```

✅ **Simple and sufficient:**
```javascript
// Direct validation where needed
function validateUser(user) {
  if (!isEmail(user.email)) throw new Error('Invalid email');
  if (!isMobilePhone(user.phone, 'en-GB')) throw new Error('Invalid phone');
}
```

❌ **Over-engineered:**
```javascript
// Abstract repository pattern for simple CRUD
class GenericRepository<T> {
  // 200 lines of generic methods that may never be used
}
```

✅ **Simple and sufficient:**
```javascript
// Direct Supabase queries where needed
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

**Remember:** The best code is code that solves the problem clearly and simply. If you find yourself adding complexity, stop and ask if it's truly necessary.

## Documentation & Testing Best Practices

**IMPORTANT:** After completing a significant task, always consider creating documentation and test files. This ensures knowledge is captured and future changes don't break existing functionality.

### When to Create Documentation Files

**✅ ALWAYS create markdown documentation when:**

1. **Adding New Features or APIs**
   - Document endpoints, request/response formats
   - Include usage examples and common patterns
   - Example: `API_ENDPOINTS.md`, `AUTHENTICATION_GUIDE.md`

2. **Implementing Complex Data Flows**
   - Map data transformations and processing steps
   - Document field mappings (e.g., Typeform → Supabase)
   - Example: `TYPEFORM_SUPABASE_FIELD_MAPPING.md`

3. **Fixing Complex Bugs**
   - Document the issue, root cause, and solution
   - Include debugging procedures for similar issues
   - Example: `REPLIT_IMAGE_FIX.md`, `DASHBOARD_AUTH_FIX.md`

4. **Creating New Data Structures**
   - Document schema, relationships, and constraints
   - Include example data and edge cases
   - Example: `DATABASE_SCHEMA.md`, `USER_DOCUMENTS_STRUCTURE.md`

5. **Implementing Integration Points**
   - Document third-party API integrations
   - Include authentication, rate limits, error handling
   - Example: `ADOBE_PDF_INTEGRATION.md`, `OPENAI_INTEGRATION.md`

6. **Establishing New Patterns or Conventions**
   - Document coding standards, patterns, or workflows
   - Include examples and anti-patterns to avoid
   - Example: `ERROR_HANDLING_PATTERNS.md`, `IMAGE_PROCESSING_GUIDE.md`

**Documentation File Naming Convention:**
- Use UPPERCASE for major reference docs: `TYPEFORM_QUESTIONS_REFERENCE.md`
- Use descriptive names: `emergency-contact-api-fix.md` (for specific fixes)
- Group related docs in subdirectories: `docs/api/`, `docs/troubleshooting/`

**Documentation Content Structure:**
```markdown
# Title

**Purpose:** Brief description of what this document covers
**Created:** Date
**Last Updated:** Date

## Overview
High-level summary

## Problem/Context (if applicable)
What issue this addresses

## Solution/Implementation
Detailed explanation with code examples

## Usage Examples
Practical examples showing how to use

## Testing
How to verify it works

## Related Files
Links to relevant code files

## Notes/Gotchas
Important considerations or edge cases
```

### When to Create Test Files

**✅ ALWAYS create test files when:**

1. **Implementing New API Endpoints**
   - Create test script to verify endpoint works
   - Test success cases and error handling
   - Example: `test-emergency-api.js`, `test-pdf-generation.js`

2. **Fixing Bugs (Regression Tests)**
   - Create test that reproduces the bug
   - Verify fix prevents regression
   - Example: `test-emergency-buttons.js`, `test-image-urls.js`

3. **Adding Data Processing Logic**
   - Test data transformations and mappings
   - Verify edge cases and error handling
   - Example: `test-typeform-webhook.js`, `test-image-processor.js`

4. **Implementing UI Components**
   - Create HTML test page for visual verification
   - Test user interactions and state changes
   - Example: `test-emergency-buttons.html`, `test-dashboard-view.html`

5. **Adding Authentication/Authorization**
   - Test login flows, session management
   - Verify access controls work correctly
   - Example: `test-session-persistence.js`, `test-auth-middleware.js`

6. **Database Operations**
   - Test CRUD operations and queries
   - Verify RLS policies work as expected
   - Example: `test-supabase-client.js`, `test-database-queries.js`

**Test File Naming Convention:**
- Prefix with `test-`: `test-feature-name.js`
- Use descriptive names: `test-emergency-contact-parsing.js`
- HTML tests: `test-component-name.html`
- Place in root or `tests/` directory for easy discovery

**Test File Structure (JavaScript):**
```javascript
#!/usr/bin/env node
/**
 * Test Script: [Feature Name]
 * Purpose: [What this tests]
 * Usage: node test-feature.js [args]
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function testFeature() {
  console.log(colors.cyan, '\n🧪 Testing [Feature Name]\n');

  try {
    // Test setup
    console.log('1. Setup...');

    // Test execution
    console.log('2. Executing test...');
    const result = await yourFunction();

    // Verification
    if (result.success) {
      console.log(colors.green, '✅ Test passed!');
    } else {
      console.log(colors.red, '❌ Test failed!');
    }

  } catch (error) {
    console.log(colors.red, `❌ Error: ${error.message}`);
  }
}

testFeature().catch(console.error);
```

**Test File Structure (HTML):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test: [Feature Name]</title>
    <style>
        /* Test page styling */
        body { font-family: sans-serif; padding: 20px; }
        .test-section { margin: 20px 0; padding: 20px; border: 1px solid #ccc; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>🧪 Test: [Feature Name]</h1>

    <div class="test-section">
        <h2>Test Configuration</h2>
        <p>User ID: <span id="userId">test-user-id</span></p>
    </div>

    <div class="test-section">
        <h2>Test Actions</h2>
        <button onclick="runTest()">Run Test</button>
        <div id="results"></div>
    </div>

    <script>
        async function runTest() {
            const results = document.getElementById('results');
            results.innerHTML = '<p>Testing...</p>';

            try {
                // Test logic here
                const response = await fetch('/api/endpoint');
                const data = await response.json();

                results.innerHTML = `<p class="success">✅ Test passed!</p>
                                     <pre>${JSON.stringify(data, null, 2)}</pre>`;
            } catch (error) {
                results.innerHTML = `<p class="error">❌ Test failed: ${error.message}</p>`;
            }
        }
    </script>
</body>
</html>
```

### Documentation After Task Completion Workflow

**After successfully completing a task, follow this checklist:**

1. **✅ Code is working** - Verify functionality
2. **📝 Create/Update Documentation** - If task fits criteria above
3. **🧪 Create Test File** - If task fits criteria above
4. **✍️ Update Related Docs** - Add references in CLAUDE.md, README.md
5. **📤 Git Commit & Push** - Commit everything together

**Example Workflow:**
```bash
# 1. Complete the feature
# ... write code, test manually ...

# 2. Create documentation
# Create FEATURE_NAME_GUIDE.md with implementation details

# 3. Create test file
# Create test-feature-name.js to verify it works

# 4. Update references
# Add entry to CLAUDE.md Related Documentation section

# 5. Commit everything together
git add feature-code.js FEATURE_NAME_GUIDE.md test-feature-name.js CLAUDE.md
git commit -m "feat: Add feature with documentation and tests"
git push origin branch-name
```

### Real Examples from This Project

**Example 1: Emergency Contacts API Fix**
- ✅ Fixed API endpoint mismatch
- 📝 Documented fix in commit message (inline documentation)
- 🧪 Created `test-emergency-buttons.js` (command-line test)
- 🧪 Created `test-emergency-buttons.html` (browser test)
- Result: Issue documented, tests prevent regression

**Example 2: Typeform Documentation**
- ✅ Duplicated Typeform forms via API
- 📝 Created `TYPEFORM_SUPABASE_FIELD_MAPPING.md` (160+ fields)
- 📝 Created `TYPEFORM_QUESTIONS_REFERENCE.md` (complete UX flow)
- ✍️ Updated CLAUDE.md with references to both files
- Result: Complete documentation for critical data flow

**Example 3: Image Processing Pipeline**
- ✅ Implemented ImageProcessorV2
- 📝 Documented in CLAUDE.md (inline in Architecture section)
- 🧪 Created `test-image-processing.js`
- 🧪 Created `scripts/monitor-image-processing.js` (production tool)
- 🧪 Created `scripts/retry-failed-images.js` (recovery tool)
- Result: Well-documented, testable, maintainable system

### When Documentation is NOT Needed

**⚠️ Skip documentation for:**
- Trivial changes (typo fixes, formatting)
- Changes fully documented in commit message
- Temporary debug code or experiments
- Minor refactoring that doesn't change behavior
- Simple variable renames

**⚠️ Skip test files for:**
- Changes already covered by existing tests
- Simple configuration changes
- Documentation-only updates
- Obvious fixes that can't regress (e.g., fixing a typo)

### Benefits of This Approach

✅ **Knowledge Retention:** Solutions are documented for future reference
✅ **Regression Prevention:** Tests catch when changes break existing features
✅ **Faster Onboarding:** New developers can learn from documentation
✅ **Better Debugging:** Test files demonstrate correct behavior
✅ **Code Confidence:** Can refactor knowing tests will catch issues
✅ **Reduced Bus Factor:** Knowledge isn't trapped in one person's head

**Remember:** Good documentation and tests are investments that pay off many times over. Spend 15 minutes documenting now to save hours of confusion later.

## Related Documentation

### Core Documentation
- `README.md` - Quick start, API endpoints, deployment
- `ARCHITECTURE.md` - Detailed system architecture
- `.claude/claude.md` - Claude Code global rules and standards

### Form & Data Documentation (Critical for PDF Generation)
- `TYPEFORM_SUPABASE_FIELD_MAPPING.md` - **Complete mapping of all 160+ Typeform fields to Supabase database columns** (User Signup + Incident Report forms). Essential reference for understanding webhook processing, data structure, and field relationships. Includes pipe-delimited format documentation, image processing notes, and API endpoints.
- `TYPEFORM_QUESTIONS_REFERENCE.md` - **Actual question text and UX flow for all Typeform forms**. Documents exact question wording, field types, validation rules, conditional logic, and hidden fields as users see them. Critical for understanding user input, form flow, and data context when generating PDF reports.

### PDF Generation Documentation
- `ADOBE_FORM_FILLING_GUIDE.md` - Complete 150+ field mapping reference for PDF form filling
- `QUICK_START_FORM_FILLING.md` - PDF generation quick start guide

### Testing & Quality Assurance
- `MANUAL_TESTING_GUIDE.md` - UI testing procedures
- `DASHBOARD_AUDIT.md` - Comprehensive dashboard testing and audit guide (130-point checklist)
- `QUICK_DASHBOARD_TEST.md` - 5-minute dashboard test procedure
- `IMPLEMENTATION_SUMMARY.md` - Latest implementation details

---

**Last Updated:** 2025-10-21
**For Questions:** Review `replit.md` for comprehensive system documentation
