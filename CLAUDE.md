# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start Commands

```bash
# Development
npm run dev              # Hot-reload development server (nodemon watches for changes)
npm start                # Production server (no hot-reload)

# Testing
npm test                 # Run all Jest tests with coverage
npm test -- path/to/test.test.js  # Run single test file
npm run test:watch       # Run tests in watch mode (re-runs on file changes)
npm run lint             # ESLint code linting
npm run format           # Prettier code formatting

# Health Checks
curl http://localhost:5000/api/health   # Basic health check
curl http://localhost:5000/api/readyz   # Readiness check (with DB)

# Integration Test Scripts
node test-security-wall.js              # Test page authentication
node test-adobe-pdf.js                  # Test Adobe PDF Services
node test-form-filling.js [user-uuid]   # Test PDF generation with real data
node scripts/test-supabase-client.js    # Test database connection
node test-what3words.js                 # Test what3words API integration

# Field Validation & Reconciliation
node scripts/verify-field-mappings.js   # Validate PDF→DB mappings
node scripts/reconcile-all-tables.js    # Check data integrity

# Storage & Photo Testing
node check-storage-contents.js          # Verify Supabase Storage
node check-orphaned-files.js            # Find orphaned uploads
node verify-finalized-photos.js         # Verify photo persistence
node check-user-documents-records.js    # Check document records

# Page-Specific Debugging
node debug-page5.html                   # Debug specific form pages
node debug-page7.html
```

**Note:** Several bash commands are auto-approved and don't require confirmation:
- `node test-form-filling.js` - These are whitelisted in the permissions
- `git` commands (status, commit, reset with specific patterns)
- `node -e` for quick checks

See `README.md` for initial setup instructions and environment configuration.

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js web application for UK traffic accident victims to complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth + Storage + Realtime), Adobe PDF Services, OpenAI, Typeform webhooks

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1

---

## Critical Architecture Patterns

### 1. Server-Side Page Authentication (Security Wall)

**CRITICAL:** Protected HTML pages require server-side authentication BEFORE serving the HTML.

```javascript
// src/app.js - Protected pages served via pageAuth middleware
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// pageAuth middleware (src/middleware/pageAuth.js):
// 1. Extracts session token from cookies (access_token, refresh_token)
// 2. Verifies token with Supabase Auth API
// 3. Returns 401 HTTP redirect if invalid/missing
// 4. Attaches req.user and req.sessionToken if valid
```

**Why:** Server blocks request before serving HTML (401 response), not just client-side JavaScript checking.

**Protected pages:** `dashboard.html`, `transcription-status.html`, `incident.html`, all `incident-form-page*.html`

**Test:** `node test-security-wall.js`

---

### 2. Auth-First Signup Flow

User authentication happens on **Page 1**, NOT at the end of signup.

```
Page 1: signup-auth.html
  → POST /auth/signup (creates Supabase Auth user)
  → Sets cookies: access_token, refresh_token
  → User is AUTHENTICATED for Pages 2-12

Pages 2-12: incident-form-page1.html through page12.html
  → 12 separate pages for comprehensive incident details
  → Images upload immediately: POST /api/images/temp-upload
  → Stored in temp_uploads table (24hr expiry)

Page 12: Final Submission
  → POST /api/signup/submit
  → Moves temp files to permanent storage
```

**Why:** Mobile file handles expire when app backgrounds. Immediate upload prevents ERR_UPLOAD_FILE_CHANGED.

---

### 3. Webhook Signature Verification Pattern

**CRITICAL:** Must use `req.rawBody` captured BEFORE JSON parsing.

```javascript
// In src/app.js BEFORE any routes
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBodyBuffer = buf;
    req.rawBody = buf.toString('utf8');
  }
}));

// Then in webhook controller
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = hmac.digest('base64');
```

**Common mistakes:**
- ❌ Using `JSON.stringify(req.body)` instead of `req.rawBody`
- ❌ Adding body parser AFTER mounting webhook routes
- ❌ Parsing body before signature verification

**Flow:** Verify signature → Send 200 OK immediately (Typeform timeout = 5s) → Process images async

---

### 4. Middleware Ordering

**CRITICAL ORDER** in `src/app.js`:

```javascript
1.  express.json() with verify (raw body capture)
2.  express.urlencoded() with verify
3.  helmet, cors, compression
4.  requestId, requestTimeout
5.  httpsRedirect, wwwRedirect
6.  morgan (HTTP logging)
7.  requestLogger
8.  cookieParser
9.  Protected page routes (pageAuth middleware) ← BEFORE static files
10. Cache control headers (for HTML)
11. express.static (public/)
12. Rate limiters (API endpoints)
13. Webhook routes (/webhooks/*) ← MOUNTED FIRST in app.js
14. Central router (/) ← All other API routes
```

**Why this order:**
- Raw body capture MUST be first (webhooks need unmodified request body)
- Protected pages MUST come before static files (server-side auth intercepts requests)
- Webhooks MUST be mounted before other routes (signature verification depends on raw body)

---

### 5. Graceful Shutdown Pattern

**CRITICAL:** Singleton protection prevents EADDRINUSE errors on Replit.

```javascript
// index.js - Singleton protection
if (global.__APP_STARTED__) {
  console.log('App already started, ignoring duplicate request');
  process.exit(0);
}
global.__APP_STARTED__ = true;

// Graceful shutdown on SIGTERM/SIGINT
function gracefulShutdown(signal) {
  // 1. Stop accepting new connections
  // 2. Close WebSocket connections
  // 3. Unsubscribe from Realtime channels
  // 4. Stop cron jobs (cronManager.stop())
  // 5. Cleanup global state (__APP_STARTED__, __AGENT_RUNNING__)
  // 6. Force exit after 5s timeout
}
```

**Test:** Kill server with Ctrl+C and verify clean shutdown logs

---

### 6. Image Processing Pipeline (V2 with Status Tracking)

```javascript
// ImageProcessorV2 workflow (src/services/imageProcessorV2.js):
1. Create user_documents record (status: 'pending')
2. Update status to 'processing'
3. Download from Typeform URL (with retry logic)
4. Upload to Supabase Storage (bucket: 'user-documents')
5. Generate permanent API URL: /api/user-documents/{uuid}/download
6. Update status to 'completed' (or 'failed' with error categorization)

// Error categories for intelligent retry:
- AUTH_ERROR (401/403) - URL expired, don't retry
- NOT_FOUND (404) - Missing file, don't retry
- TIMEOUT - Network issue, retry with backoff
- RATE_LIMIT - Too many requests, retry with longer backoff
- STORAGE_UPLOAD_ERROR - Supabase issue, retry
```

**Why permanent API URLs:** Signed URLs expire (1 hour). API URLs generate fresh signed URLs on-demand.

---

### 7. Real-Time Updates Architecture

```javascript
// Backend (src/app.js - initializeRealtime())
Supabase Realtime (postgres_changes subscription)
  ↓
WebSocket Server (src/websocket/index.js)
  ↓
Broadcast to Connected Clients
  ↓
Frontend Updates (dashboard.html, transcription-status.html)
```

**Tables monitored:** `transcription_queue`, `ai_transcription`, `ai_summary`

---

### 8. what3words Location Integration

**Pattern:** Graceful fallback when API key unavailable.

```javascript
// Configuration-driven (src/config/index.js)
what3words: {
  apiKey: process.env.WHAT3WORDS_API_KEY,
  enabled: !!process.env.WHAT3WORDS_API_KEY
}

// All endpoints return 200 with fallback signal
if (!config.what3words.apiKey) {
  return res.status(200).json({
    success: false,
    message: 'Location service temporarily unavailable',
    fallback: true  // Frontend detects fallback mode
  });
}
```

**Endpoints:** POST `/api/location/what3words`, GET `/api/location/convert`, GET `/api/location/autosuggest`

**Test:** `node test-what3words.js`

---

### 9. AI Analysis Integration (Pages 13-18)

**Recent Addition (Nov 2025):** PDF now includes AI-powered legal analysis and transcription summary.

```javascript
// AI analysis flow for PDF Pages 13-18
Pages 13-14: AI Incident Analysis
  → Automatic generation via OpenAI GPT-4
  → Legal-grade analysis with factual, sincere tone
  → Stored in incident_reports (ai_* fields)

Page 15: Emergency Audio Transcription
  → OpenAI Whisper API transcription
  → Personal statement from user
  → Stored in ai_transcription table

Pages 16-17: Evidence URLs & DVLA Reports
  → Image URLs from Supabase Storage
  → Auto-fit font sizing for long URLs
  → DVLA vehicle information if available

Page 18: Comprehensive AI Analysis
  → Closing statement format
  → Liability assessment
  → Evidence summary
  → Legal recommendations
```

**Key Fields Added to `incident_reports`:**
```sql
-- AI Analysis fields (added Nov 2025 via migration 027)
ai_incident_summary TEXT
ai_liability_assessment TEXT
ai_vehicle_damage_analysis TEXT
ai_injury_assessment TEXT
ai_witness_credibility TEXT
ai_evidence_quality TEXT
ai_recommendations TEXT
ai_closing_statement TEXT
```

**Pattern:** Single API call generates all AI analysis sections, stored directly in `incident_reports` table (simplified architecture).

**Critical Implementation Details:**
- ✅ GPT-4 generates factual, sincere assessments (no "courtroom theatrics")
- ✅ Auto-fit font sizing for AI-generated long-form text
- ✅ Simplified schema: AI fields in main table, not separate junction table
- ✅ Emergency audio transcription integrated on Page 15

**Migration:** `migrations/027_add_ai_analysis_fields.sql`

**Documentation:**
- `ARCHITECTURAL_PLAN_PAGES_13-18.md` - Complete architectural design
- `PAGES_13-18_IMPLEMENTATION_SUMMARY.md` - Implementation status

**Test:** Test AI analysis generation as part of complete PDF generation flow

---

## High-Level Request Flow

```
Internet → index.js (HTTP server + WebSocket)
         ↓
      src/app.js (Express app)
         ↓
      Middleware Stack (see #4 above)
         ↓
      Routes:
         - /webhooks/* (mounted FIRST in app.js)
         - / (central router from src/routes/index.js)
         ↓
      Controllers (src/controllers/)
         ↓
      Services (src/services/)
         ↓
      External APIs / Supabase
```

---

## Database Architecture

### Row Level Security (RLS)

**All tables have RLS enabled.** Users can only access their own data via Supabase anon key.

**Exception:** Webhooks use service role key (bypasses RLS) because Typeform sends data before user authentication.

### Soft Delete Pattern (GDPR Compliance)

```javascript
// Soft delete
await supabase
  .from('user_documents')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', documentId);

// Queries exclude soft-deleted
await supabase
  .from('user_documents')
  .select('*')
  .is('deleted_at', null);
```

**Retention:** 7 years for legal documents (GDPR Article 6)

### Key Tables

| Table | Purpose | Primary Key | Critical Fields |
|-------|---------|-------------|-----------------|
| `user_signup` | Personal info, vehicle, insurance | `create_user_id` (UUID) | `email`, `gdpr_consent` |
| `incident_reports` | Accident details (170+ columns including AI fields) | `id` | `create_user_id` (indexed), `ai_*` fields |
| `incident_other_vehicles` | Other vehicles involved (65+ columns) | `id` | `create_user_id`, `vehicle_index` |
| `incident_witnesses` | Witness information (30+ columns) | `id` | `create_user_id`, `witness_index` |
| `user_documents` | Images, processing status | `id` | `status`, `retry_count`, `public_url` |
| `temp_uploads` | Temporary uploads (24hr expiry) | `id` | `session_id`, `created_at` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` | `create_user_id`, `transcript_text` |

### Recent Schema Changes (2025-10-30 to 2025-11-20)

**Migration context:** Transitioning from Typeform (160+ fields) to in-house HTML forms (99+ fields), plus AI analysis integration.

**Major additions:**
- 64 new fields across multiple tables for medical details, safety conditions, legal declarations
- 8 AI analysis fields for GPT-4 generated legal assessments (Nov 2025)
- TEXT[] array columns for multi-select checkboxes (medical symptoms, weather conditions, road features)
- New tables: `incident_other_vehicles`, `incident_witnesses` (normalized from incident_reports)

**Critical migrations:**
- `001_add_new_pdf_fields.sql` - Added 25 single-value columns
- `002_add_missing_ui_fields.sql` - Added medical/safety arrays
- `006_add_page_four_columns.sql` - Added vehicle damage/conditions columns
- `027_add_ai_analysis_fields.sql` - Added AI analysis fields for Pages 13-18
- See `/migrations` folder for complete migration history with rollback scripts

**Migration pattern:**
```sql
-- All migrations follow this pattern:
BEGIN;
  -- 1. Add columns with safe defaults
  ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS new_field TEXT;

  -- 2. Add helpful comments
  COMMENT ON COLUMN incident_reports.new_field IS 'Description from HTML form';

  -- 3. Log the change
  DO $$
  BEGIN
    RAISE NOTICE 'Migration complete: added new_field column';
  END $$;
COMMIT;
```

**Field mapping documentation:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `SCHEMA_ANALYSIS_SUMMARY.md` - Current schema state
- Use `/db` slash command for live schema

---

## PDF Field Mapping Architecture

**Pattern:** Centralized mapping in `lib/generators/pdfFieldMapper.js`

```javascript
// PDF field mapping follows this pattern:
Pages 1-18 → pdfFieldMapper.js → Database Tables
  ↓
Supports:
- Single-value fields (TEXT, DATE, BOOLEAN)
- Array fields (TEXT[] for checkboxes)
- Normalized tables (other_vehicles, witnesses)
- Image references (Supabase Storage URLs)
- AI-generated content (auto-fit font sizing)
```

**Critical Tables:**
- `incident_reports` - Main accident details (170+ columns including arrays and AI fields)
- `incident_other_vehicles` - Up to 5 other vehicles (65+ columns each)
- `incident_witnesses` - Up to 3 witnesses (30+ columns each)

**Array Field Handling:**
```javascript
// PostgreSQL array storage pattern
medical_symptoms: ['headache', 'neck_pain', 'back_pain']  // TEXT[]
weather_conditions: ['rain', 'fog']                        // TEXT[]
road_features: ['junction', 'roundabout']                  // TEXT[]

// Controller logic
const symptoms = req.body.medical_symptoms || [];
await supabase.from('incident_reports')
  .update({ medical_symptoms: symptoms });

// PDF mapping (array → checkboxes)
pdfFields['medical[headache]'] = symptoms.includes('headache');
pdfFields['medical[neck_pain]'] = symptoms.includes('neck_pain');
```

**Image Field Handling:**
```javascript
// Supabase Storage pattern
1. Upload: POST /api/images/temp-upload → temp_uploads table
2. Persist: POST /api/signup/submit → user_documents table
3. PDF Reference: Generate signed URL valid for 1 hour
4. API Endpoint: /api/user-documents/{uuid}/download (permanent)

// PDF expects format
pdfFields['vehicle_damage_photo_1'] = signedUrl1;
pdfFields['vehicle_damage_photo_2'] = signedUrl2;
```

**AI Analysis Field Handling:**
```javascript
// AI-generated long-form text with auto-fit font sizing
pdfFields['ai_incident_summary'] = incidentData.ai_incident_summary;
pdfFields['ai_liability_assessment'] = incidentData.ai_liability_assessment;
pdfFields['ai_closing_statement'] = incidentData.ai_closing_statement;

// Auto-fit font sizing applied in PDF template for long text fields
// URLs use font size 6-8 with multiline wrapping
```

**Validation:**
```bash
# Test complete PDF generation pipeline
node test-form-filling.js [user-uuid]

# Verify field mappings match schema
node scripts/verify-field-mappings.js

# Check data integrity across tables
node scripts/reconcile-all-tables.js
```

**Master Documentation:** `MASTER_PDF_FIELD_MAPPING.csv` contains definitive PDF field → database column mappings for all 18 pages.

---

## API Structure

All API routes mounted in `src/routes/index.js`:

```
Authentication:
POST   /auth/signup              → User registration (creates Supabase Auth user)
POST   /auth/login               → User login
POST   /auth/logout              → Logout (clear cookies)

Signup Flow:
POST   /api/signup/submit        → Final signup submission
POST   /api/images/temp-upload   → Immediate image upload (mobile-friendly)

User Data:
GET    /api/user-documents       → Get user's documents
GET    /api/incident-reports     → Get user's incident reports
GET    /api/profile              → Get user profile
POST   /api/profile              → Update profile

Transcription:
POST   /api/transcription/transcribe  → Upload audio (OpenAI Whisper)
GET    /api/transcription/history     → Get transcription history
GET    /api/transcription/:id         → Get specific transcription

AI Analysis:
POST   /api/ai/analyze-incident  → Generate AI analysis (GPT-4)

PDF:
POST   /api/pdf/generate         → Generate 18-page PDF report (170+ fields)

Location:
POST   /api/location/what3words  → Convert coordinates to words
GET    /api/location/convert     → GET version of coordinate conversion
GET    /api/location/autosuggest → Autocomplete for partial words

GDPR:
POST   /api/gdpr/export          → Export all user data
POST   /api/gdpr/delete-account  → Request account deletion

Health:
GET    /api/health               → Basic health check
GET    /api/readyz               → Readiness (with DB check)

Webhooks:
POST   /webhooks/typeform        → Typeform submissions (signature verified)
```

**Authentication:** All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

---

## Environment Variables

**⚠️ IMPORTANT:** All secrets stored in Replit Secrets (Tools → Secrets), never committed to Git.

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client-side auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server-side (bypasses RLS for webhooks)
OPENAI_API_KEY=sk-xxx                # Transcription/summarization/AI analysis
TYPEFORM_WEBHOOK_SECRET=xxx          # HMAC signature verification
```

**Optional (graceful fallback):**
```bash
PDF_SERVICES_CLIENT_ID=xxx           # Adobe PDF Services
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx               # Location services
DVLA_API_KEY=xxx                     # UK vehicle lookups
```

---

## Code Style

- **JavaScript:** ES6+, ES modules (import/export), destructuring, async/await
- **Formatting:** 2-space indentation, single quotes, semicolons, camelCase
- **Functions:** Keep under 50 lines, single responsibility
- **Security:** Always validate inputs, use parameterized queries, sanitize output

### Error Handling Pattern

```javascript
// Service layer
try {
  const result = await riskyOperation();
  logger.info('Operation succeeded', { result });
  return result;
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new Error('User-friendly message (never expose internals)');
}

// Controller layer
try {
  const data = await service.getData(userId);
  res.status(200).json({ success: true, data });
} catch (error) {
  logger.error('Controller error', error);
  res.status(500).json({
    success: false,
    error: 'An error occurred. Please try again.'
  });
}
```

---

## Common Gotchas

### Session Cookies

Cookies set with `sameSite=none` for Replit subdomains (*.replit.app). This is intentional - browsers treat subdomains as cross-site.

### WebSocket Connection

If changes don't appear:
1. Check WebSocket connection: `console.log(websocket.readyState)` (1 = OPEN)
2. Check server logs: `npm run dev` shows WebSocket connections
3. Manually refresh or use polling endpoint as fallback

### CSP Policy

Content Security Policy blocks inline event handlers (`onclick`, etc.). Always use event delegation:

```javascript
// ❌ NEVER
<button onclick="handleClick()">

// ✅ ALWAYS
document.addEventListener('click', (e) => {
  if (e.target.id === 'myButton') handleClick();
});
```

---

## Testing Guidelines

### Test Organization

```
/src
  /middleware
    /__tests__              # Middleware unit tests
      cors.integration.test.js
      corsConfig.test.js
      errorHandler.test.js
      validation.test.js
      webhookAuth.test.js
  /routes
    /__tests__              # Route integration tests
      cors-diagnostic.test.js
```

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run a single test file
npm test -- src/middleware/__tests__/errorHandler.test.js

# Run tests matching pattern
npm test -- --testPathPattern=cors

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Check code quality
npm run lint
npm run format
```

### Writing Tests

**Unit tests** - Business logic in services/utilities:
- Test edge cases and error conditions
- Mock external dependencies (Supabase, APIs)
- Keep tests focused (one assertion per test when possible)

**Integration tests** - API endpoints and middleware:
- Test complete request/response cycle
- Use actual middleware stack when possible
- Verify authentication, validation, error handling

**Test scripts** (node test-*.js) - End-to-end verification:
- Test external integrations (Adobe, Supabase, OpenAI)
- Use real credentials from .env
- Validate entire workflows (signup → PDF generation)

### Integration Test Scripts

```bash
# Security & Authentication
node test-security-wall.js              # Verify pageAuth middleware

# PDF Services
node test-adobe-pdf.js                  # Test Adobe PDF Services
node test-form-filling.js [user-uuid]   # Generate PDF with real data

# Database
node scripts/test-supabase-client.js    # Verify Supabase connection

# Location Services
node test-what3words.js                 # Test what3words API
```

**When to use:** After environment variable changes, before deploying, when debugging integration issues.

---

## File Organization

```
/src
  /controllers      # Request handlers (thin layer)
  /middleware       # Auth, CORS, error handling, validation
    /__tests__      # Middleware unit tests (Jest)
  /routes           # Route definitions (central router in index.js)
    /__tests__      # Route integration tests (Jest)
  /services         # Business logic (PDF, images, emails)
  /utils            # Helpers (logger, validators)
  /websocket        # Real-time updates (WebSocket server)
  /config           # Configuration (index.js)
  app.js            # Express app setup (middleware, routes)

/public
  /components       # Reusable UI components
  /js               # Utilities, initializers
  /css              # Styling (design-system.css)
  *.html            # Page templates (incident-form-page1.html through page12.html)

/lib
  /services         # Shared services (email, GDPR)
  /data             # Database queries (dataFetcher.js)
  /generators       # Email templates, PDF utilities

/migrations         # Database migrations (numbered, with rollbacks)
/scripts            # Utility scripts (field extraction, testing, analysis)

index.js            # HTTP server + WebSocket initialization + graceful shutdown
```

---

## Design System & Branding

### Color Palette

**Purpose**: Consistent, accessible color scheme optimized for users in stressful situations (accident victims).

#### Primary Colors (Pages 2-11)

| Color Name | Hex Code | Usage | CSS Variable |
|------------|----------|-------|--------------|
| **Deep Teal** | `#0E7490` | Header gradient start, accent color, links | `--grad-start`, `--accent` |
| **Deep Teal Dark** | `#0c6179` | Header gradient end, hover states | `--grad-end`, `--accent-hover` |
| **Warm Beige** | `#E8DCC4` | Page background | `--bg-light` |
| **Dark Gray** | `#4B5563` | Borders, dividers | `--border` |

#### Form Elements (Pages 2-11)

| Color Name | Hex Code | Usage | CSS Variable |
|------------|----------|-------|--------------|
| **Steel Gray** | `#CFD2D7` | Input field backgrounds (text, date, time, textarea) | `--input-bg` |
| **Cream Gray** | `#F5F1E8` | Form section containers, checkbox backgrounds | `--checkbox-bg`, `--container-bg` |
| **Silver** | `#C0C0C0` | Button backgrounds | `--button-bg` |
| **Silver Hover** | `#B0B0B0` | Button hover state | `--button-hover` |

#### Page-Specific Styling

**IMPORTANT Color Scheme Variations:**
- **Pages 1 & 12:** Blue (`#2e6a9d`) - Deliberate design choice for impact and attention
- **Pages 2-11:** Deep Teal (`#0E7490`) - Consistent form styling
- **Pages 13-18:** White background - Legal document format (PDF-embedded only, no HTML forms)

**DO NOT** change Page 1 or Page 12 colors to match Pages 2-11, or Pages 13-18 styling. These are intentional design decisions.

**Accessibility Rating**: 🏆 **A+ (92/100)** - WCAG 2.1 AA: 95% compliant, AAA: 70% compliant

---

## Recent Work Context (2025-10-30 to 2025-11-20)

### Field Reconciliation Project (Complete ✅)

**Goal:** Transition from Typeform to in-house HTML forms while maintaining data integrity.

**Status:** ✅ Field mapping complete, 100% passing validation tests

**Completed Work:**
1. **Field Analysis:** 99 HTML fields → 64 new DB fields identified
2. **Migrations:** 7-phase SQL rollout executed successfully
3. **PDF Mapping:** Pages 1-12 fully reconciled with database schema
4. **Testing:** 100% field validation passing across all pages
5. **Documentation:** Complete field mapping, schema analysis

**Critical Achievements:**
- ✅ Page 7: Other vehicle insurance fields (99% → 100%)
- ✅ Page 8: Other vehicle damage images (100% passing)
- ✅ Page 9: Witness information (3 witnesses supported, 100% passing)
- ✅ Page 10: Police & safety details (80% → 100% data retention fix)
- ✅ what3words: Location screenshots saved to Supabase Storage

**Validation Scripts:**
```bash
# Run comprehensive field validation
node test-form-filling.js [user-uuid]   # Test PDF generation
node scripts/verify-field-mappings.js    # Validate all mappings
node scripts/reconcile-all-tables.js     # Check data integrity
```

**Key Files:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis with PostgreSQL array strategy
- `MASTER_PDF_FIELD_MAPPING.csv` - Definitive PDF→DB field mappings
- `lib/generators/pdfFieldMapper.js` - PDF mapping logic (Pages 1-12)
- `migrations/` - 7-phase migration with rollback scripts

---

### AI Analysis Integration (Complete ✅)

**Goal:** Add OpenAI-powered legal document analysis for PDF Pages 13-18.

**Status:** ✅ Integration complete, all AI fields operational

**Implementation (Nov 2025):**
1. **Architecture Redesign:** Simplified schema with AI fields directly in `incident_reports`
2. **GPT-4 Integration:** Factual, sincere legal analysis (no "courtroom theatrics")
3. **Emergency Transcription:** Whisper API transcription on Page 15
4. **Auto-fit Fonts:** Dynamic font sizing for AI-generated long-form text
5. **Evidence URLs:** Image references with multiline wrapping (Pages 16-17)

**Critical Achievements:**
- ✅ Single API call generates all AI analysis sections
- ✅ Simplified database schema (8 AI fields in main table)
- ✅ Auto-fit font sizing for long URLs and AI text
- ✅ Emergency audio transcription integration
- ✅ Legal-grade closing statement generation

**Key Files:**
- `ARCHITECTURAL_PLAN_PAGES_13-18.md` - Complete architectural design
- `PAGES_13-18_IMPLEMENTATION_SUMMARY.md` - Implementation status
- `migrations/027_add_ai_analysis_fields.sql` - AI field migration
- `lib/generators/pdfFieldMapper.js` - Extended for Pages 13-18

**AI Analysis Fields (8 total):**
```sql
ai_incident_summary          -- Overall incident summary
ai_liability_assessment      -- Fault and liability analysis
ai_vehicle_damage_analysis   -- Vehicle damage assessment
ai_injury_assessment         -- Injury severity and causation
ai_witness_credibility       -- Witness statement analysis
ai_evidence_quality          -- Evidence strength evaluation
ai_recommendations           -- Legal action recommendations
ai_closing_statement         -- Comprehensive closing statement
```

**Next Phase:** Production deployment with AI analysis fully operational

**Branch:** `feat/audit-prep`

---

## Git Workflow

**Commit format:** `type: description`

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Never commit:** `.env`, `credentials/`, `node_modules/`, `test-output/`

**Branches:**
- `main` - Production
- `develop` - Development
- `feat/name` - Features
- `fix/name` - Bug fixes

---

**Last Updated:** 2025-11-21
**Version:** 2.0.1
**Current Branch:** feat/audit-prep
**Maintained By:** Claude Code
