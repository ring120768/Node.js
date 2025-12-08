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
node test-form-filling.js [user-uuid]   # Test PDF generation with real data
node test-security-wall.js              # Test page authentication
node scripts/test-supabase-client.js    # Test database connection

# Field Validation & Reconciliation
node scripts/verify-field-mappings.js   # Validate PDF→DB mappings
node scripts/reconcile-all-tables.js    # Check data integrity
```

**Note:** Several bash commands are auto-approved and don't require confirmation. See permissions policy in global `.claude/CLAUDE.md`.

See `README.md` for initial setup instructions and environment configuration.

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js web application for UK traffic accident victims to complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth + Storage + Realtime), Adobe PDF Services, OpenAI GPT-4, OpenAI Whisper

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1
**Current Branch**: feat/audit-prep
**Status**: ~90% complete, focusing on web launch first

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

**Flow:** Verify signature → Send 200 OK immediately → Process async

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

### 6. Mobile File Upload Pattern

**Problem:** Mobile browsers lose file handles when app backgrounds, causing ERR_UPLOAD_FILE_CHANGED

**Solution:** Immediate upload to temporary storage, then persist on form submission

```javascript
// Pattern: Immediate Temp Upload (src/controllers/tempImageUpload.controller.js)
POST /api/images/temp-upload
  ↓
1. Upload to temp_uploads table (24hr expiry)
2. Store session_id for tracking
3. Return temp_upload_id to frontend
  ↓
Frontend stores temp_upload_id in form data
  ↓
POST /api/signup/submit (or /api/incident-form/*)
  ↓
4. Move from temp_uploads to user_documents
5. Update storage bucket: temp-uploads → user-documents
6. Generate permanent API URL
7. Delete temp_upload record

// Cleanup: Cron job runs daily to delete temp_uploads > 24 hours
```

**Why this works:**
- File uploaded immediately while handle is valid
- Survives app backgrounding
- Session-based tracking (no auth required for temp upload)
- Automatic cleanup prevents storage bloat

**Tables:**
- `temp_uploads` - Temporary storage (24hr TTL)
- `user_documents` - Permanent storage (7yr retention)

---

### 7. Single-Phase AI Summary Architecture

**CRITICAL:** AI summary generation uses single-phase architecture with direct data access to prevent hallucinations.

```javascript
// Single-Phase AI Generation (GPT-4o, temp 0.2)
Database (3 tables: incident_reports, incident_other_vehicles, incident_witnesses)
  ↓
buildComprehensiveIncidentData()  // Fetch all 160+ fields
  ↓
JSON (structured data)
  ↓
generateSinglePhaseAiSummary(userId, incidentId, transcription)
  → GPT-4o receives raw structured JSON + database schema
  → Temperature 0.2 for factual accuracy
  → Generates comprehensive ai_summary field (800-2500 words)
  → Takes 30-60 seconds
  → Stores result in incident_reports.ai_summary
```

**Why this architecture:**
- **Direct Data Access:** GPT-4o receives raw structured data (160+ fields from 3 tables)
- **Database Schema Included:** Explicit field definitions prevent omissions
- **Factual Accuracy:** Temperature 0.2 ensures no hallucinations or invented facts
- **Source Attribution:** Clearly distinguishes form data (facts) vs transcription (perspective)
- **No Information Bottleneck:** Unlike old two-phase, AI sees all source data directly

**Key Database Fields:**
```sql
-- AI Summary Storage
ai_summary TEXT                  -- Comprehensive single-phase summary (800-2500 words)
form_data_summary_metadata JSONB -- Generation metadata (model, tokens, architecture)
voice_transcription TEXT         -- User's audio statement (optional)

-- Additional AI Analysis (8 fields)
ai_incident_summary          -- Overall incident summary
ai_liability_assessment      -- Fault and liability analysis
ai_vehicle_damage_analysis   -- Vehicle damage assessment
ai_injury_assessment         -- Injury severity and causation
ai_witness_credibility       -- Witness statement analysis
ai_evidence_quality          -- Evidence strength evaluation
ai_recommendations           -- Legal action recommendations
ai_closing_statement         -- Comprehensive closing statement
```

**Output Format:**
- **SECTION 1:** 10 structured subsections (Accident Circumstances, Vehicles, Witnesses, Medical, etc.)
- **SECTION 2:** 400-800 word narrative integrating form data + transcription

**Implementation Files:**
- `src/controllers/ai.controller.js` - `generateSinglePhaseAiSummary()` function (lines 1583-1968)
- `migrations/027_add_ai_analysis_fields.sql` - AI field migration

**Manual Generation Scripts:**
```bash
# Generate AI summary for specific user
node fix-missing-phase1-summary.js        # For missing summaries
node test-phase1-form-summary.js [uuid]   # Test generation
node audit-ai-summary-completeness.js     # Audit field coverage
```

**Test:** Generate PDF with `node test-form-filling.js [user-uuid]` to verify Page 15 displays both SECTION 1 & SECTION 2

---

### 8. Real-Time Updates Architecture

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

### 9. what3words Location Integration

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

**Exception:** Webhooks use service role key (bypasses RLS) because webhooks send data before user authentication.

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

### Recent Schema Changes

**Migration context:** Transitioning from Typeform to in-house HTML forms, plus AI analysis integration.

**Major additions:**
- 64 new fields across multiple tables for medical details, safety conditions, legal declarations
- 8 AI analysis fields for GPT-4 generated legal assessments (Nov 2025)
- TEXT[] array columns for multi-select checkboxes (medical symptoms, weather conditions, road features)
- New tables: `incident_other_vehicles`, `incident_witnesses` (normalized from incident_reports)

**Critical migrations:**
- `001_add_new_pdf_fields.sql` - Added 25 single-value columns
- `027_add_ai_analysis_fields.sql` - Added AI analysis fields for Pages 13-18
- See `/migrations` folder for complete migration history with rollback scripts

**Field mapping documentation:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `SCHEMA_ANALYSIS_SUMMARY.md` - Current schema state
- `MASTER_PDF_FIELD_MAPPING.csv` - Definitive PDF→DB mappings
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

**Validation:**
```bash
# Test complete PDF generation pipeline
node test-form-filling.js [user-uuid]

# Verify field mappings match schema
node scripts/verify-field-mappings.js

# Check data integrity across tables
node scripts/reconcile-all-tables.js
```

---

## API Structure

All API routes mounted in `src/routes/index.js`:

```
Authentication:
POST   /auth/signup              → User registration (creates Supabase Auth user)
POST   /auth/login               → User login
POST   /auth/logout              → Logout (clear cookies)

Signup Flow (Custom HTML Forms):
POST   /api/signup/submit        → Final signup submission
POST   /api/incident-form/*      → Multi-page incident form (Pages 1-12)
POST   /api/images/temp-upload   → Immediate image upload (mobile-friendly)
POST   /api/images/upload        → Post-signup image upload

User Data:
GET    /api/user-documents       → Get user's documents
GET    /api/user-documents/:uuid/download → Download document (permanent API URL)
GET    /api/incident-reports     → Get user's incident reports
GET    /api/profile              → Get user profile
POST   /api/profile              → Update profile

Safety & Assessment:
GET    /api/safety-status/:userId     → Get safety check status
POST   /api/safety-status/:userId     → Update safety check status

Witnesses & Other Vehicles:
GET    /api/witnesses/:userId          → Get witnesses
POST   /api/witnesses/:userId          → Create/update witness
GET    /api/other-vehicles/:userId     → Get other vehicles
POST   /api/other-vehicles/:userId     → Create/update other vehicle

DVLA Integration:
GET    /api/dvla/lookup?registration=XX11XXX  → UK vehicle lookup (GET-friendly)
POST   /api/other-vehicles/dvla-lookup        → DVLA lookup (POST, in context)

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
GET    /system-status            → Visual system status page

Webhooks:
POST   /webhooks/github          → GitHub repository events (signature verified)
GET    /webhooks/debug           → Webhook configuration status
```

**Authentication:** All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

**Note:** Typeform webhooks have been removed. Application now uses in-house HTML forms (Pages 1-12).

---

## Environment Variables

**⚠️ IMPORTANT:** All secrets stored in Replit Secrets (Tools → Secrets), never committed to Git.

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client-side auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server-side (bypasses RLS for webhooks)
OPENAI_API_KEY=sk-xxx                # Transcription/summarization/AI analysis
GITHUB_WEBHOOK_SECRET=xxx            # HMAC signature verification
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
  /routes
    /__tests__              # Route integration tests
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

### Integration Test Scripts

```bash
# Security & Authentication
node test-security-wall.js              # Verify pageAuth middleware

# PDF Services
node test-form-filling.js [user-uuid]   # Generate PDF with real data

# Database
node scripts/test-supabase-client.js    # Verify Supabase connection
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
  /services         # Business logic (PDF, images, emails, AI)
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

#### Page-Specific Styling

**IMPORTANT Color Scheme Variations:**
- **Pages 1 & 12:** Blue (`#2e6a9d`) - Deliberate design choice for impact and attention
- **Pages 2-11:** Deep Teal (`#0E7490`) - Consistent form styling
- **Pages 13-18:** White background - Legal document format (PDF-embedded only, no HTML forms)

**DO NOT** change Page 1 or Page 12 colors to match Pages 2-11, or Pages 13-18 styling. These are intentional design decisions.

**Accessibility Rating**: 🏆 **A+ (92/100)** - WCAG 2.1 AA: 95% compliant, AAA: 70% compliant

---

## Recent Work Context

### Two-Phase AI Summary Architecture (Complete ✅)

**Goal:** Prevent form data loss during AI analysis generation by splitting into two phases.

**Status:** ✅ Integration complete, 100% data retention achieved

**Implementation (Nov-Dec 2025):**
1. **Phase 1 - Basic Data Capture:** Save form data immediately (< 2s)
2. **Phase 2 - AI Analysis:** Generate AI summaries after submission (30-60s)
3. **Result:** No more timeout-related data loss

**Critical Achievements:**
- ✅ 100% data retention (was ~40% before due to timeouts)
- ✅ User experience improved (fast form submissions)
- ✅ AI analysis still comprehensive (8 fields, GPT-4)
- ✅ Proper error handling and retry logic

**Key Files:**
- `src/controllers/ai.controller.js` - Phase 2 endpoint
- `src/services/aiService.js` - GPT-4 integration
- `migrations/027_add_ai_analysis_fields.sql` - AI fields

**Test:** `node test-form-filling.js [user-uuid]`

### Field Reconciliation Project (Complete ✅)

**Goal:** Transition from Typeform to in-house HTML forms while maintaining data integrity.

**Status:** ✅ Field mapping complete, 100% passing validation tests

**Completed Work:**
1. **Field Analysis:** 99 HTML fields → 64 new DB fields identified
2. **Migrations:** 7-phase SQL rollout executed successfully
3. **PDF Mapping:** Pages 1-12 fully reconciled with database schema
4. **Testing:** 100% field validation passing across all pages
5. **Documentation:** Complete field mapping, schema analysis

**Key Files:**
- `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Complete 64-field analysis
- `MASTER_PDF_FIELD_MAPPING.csv` - Definitive PDF→DB field mappings
- `lib/generators/pdfFieldMapper.js` - PDF mapping logic

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

**Last Updated:** 2025-12-08
**Version:** 2.0.1
**Current Branch:** feat/audit-prep
**Maintained By:** Claude Code
