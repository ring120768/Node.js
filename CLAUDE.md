# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant Node.js application for UK traffic accident victims to complete legal incident reports.

| | |
|---|---|
| **Stack** | Node.js 18+, Express, Supabase (PostgreSQL/Auth/Storage/Realtime), Adobe PDF Services, OpenAI |
| **Version** | 2.1.0 |
| **Location** | UK (DD/MM/YYYY, £ GBP, GMT/BST, +44, British English) |
| **Flow** | Custom HTML Forms (Pages 1-12) → Image Processing → PDF (18 pages, 213 fields) → Email |

---

## Commands

```bash
# Development
nvm use && npm install     # Node 18.18+ from .nvmrc
npm run dev                # Hot-reload server (nodemon)
npm start                  # Production server

# Testing
npm test                   # Jest with coverage (60% threshold)
npm test -- path/to/test   # Single test file
npm run test:watch         # Watch mode

# Code Quality
npm run lint               # ESLint (auto-fix)
npm run format             # Prettier
npm run depcheck           # Find unused dependencies
npm run audit              # Security vulnerabilities
npm run deps:update        # Update minor versions (ncu)

# Validation
npm run validate:lockfile      # Package-lock sync
npm run validate:pdf-mapping   # PDF field mappings

# Integration Tests
node test-form-filling.js [user-uuid]   # PDF generation
node test-security-wall.js              # Page authentication
node scripts/test-supabase-client.js    # Database connection

# Utilities
npm run health             # API health check
npm run clean              # Clear caches and temp files
node verify-tables.js      # Schema verification
node apply-missing-tables.js  # Apply missing schema
```

---

## Architecture

### Middleware Ordering (CRITICAL)

Order in `src/app.js` matters - don't change it:

```
1. express.json() with verify   ← Raw body capture FIRST
2. express.urlencoded()
3. helmet, cors, compression
4. Protected page routes        ← BEFORE static files
5. express.static
6. Webhook routes               ← Use raw body for signature
7. Central router
```

**Why:** Raw body capture must happen before JSON parsing for webhook signature verification. Protected pages must intercept before static file serving.

### Server-Side Page Authentication

Protected pages require server-side auth BEFORE serving HTML:

```javascript
// src/app.js - pageAuth middleware blocks request with 401 if invalid
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});
```

**Protected pages:** `dashboard.html`, `transcription-status.html`, `incident.html`, `incident-form-page*.html`, `report.html`, `declaration.html`

### Webhook Signature Verification

**Must use `req.rawBody`** captured before JSON parsing:

```javascript
// Signature verification uses raw body, NOT JSON.stringify(req.body)
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = hmac.digest('base64');
```

**Pattern:** Verify signature → Send 200 OK immediately → Process async

### Mobile File Upload Pattern

Mobile browsers lose file handles when app backgrounds. Solution:

```
POST /api/images/temp-upload
  → Store in temp_uploads (24hr expiry)
  → Return temp_upload_id

POST /api/signup/submit
  → Move from temp_uploads to user_documents
  → Delete temp_upload record
```

Daily cron job cleans up expired temp_uploads.

### Graceful Shutdown

Singleton protection in `index.js` prevents duplicate starts:

```javascript
if (global.__APP_STARTED__) {
  process.exit(0);  // Prevents EADDRINUSE on Replit
}
global.__APP_STARTED__ = true;
```

### Hybrid PDF Generation (IMPORTANT)

The 18-page PDF uses **two different rendering methods**:

| Pages | Method | Service | Content |
|-------|--------|---------|---------|
| 1-12 | Adobe Form Fill | `adobePdfFormFillerService.js` | User data, images, form fields |
| 13-16 | Puppeteer HTML→PDF | `adobePdfFormFillerService.js` | AI summary, transcription, DVLA reports |
| 17-18 | Adobe Form Fill | `adobePdfFormFillerService.js` | Declaration, signatures |

**Why hybrid?** Pages 13-16 contain dynamic, variable-length content (AI-generated summaries, transcripts) that doesn't fit fixed PDF form fields. Puppeteer renders HTML templates to PDF pages, which are then merged with the form-filled pages.

**Key files:**
- Form filling: `src/services/adobePdfFormFillerService.js`
- HTML templates for pages 13-16: Generated dynamically with Handlebars
- Merge logic: pdf-lib combines all pages into final document

**Fallback:** If Adobe unavailable, entire PDF generated via pdf-lib (lower quality but functional).

---

## File Organisation

```
/src                # Application core
  /controllers      # Request handlers
  /middleware       # Auth, CORS, error handling, pageAuth
  /routes           # Route definitions (central router in index.js)
  /services         # Business logic (PDF, images, AI, cronManager)
  /utils            # Helpers (logger, validators, response)
  /websocket        # Real-time updates
  /config           # Configuration
  app.js            # Express setup (middleware ordering critical)

/lib                # Shared utilities (reusable)
  /services         # Email, GDPR, auth services
  /data             # dataFetcher.js - database abstractions
  /generators       # Email, PDF templates

/public             # Static assets
  *.html            # Page templates (incident-form-page1-12.html)

/migrations         # Database migrations (numbered, with rollbacks)
/scripts            # Utility scripts
/pdf-templates      # PDF form templates
/credentials        # Adobe credentials (not in Git)

index.js            # Entry point + WebSocket init + graceful shutdown
```

**`/src` vs `/lib`:** Use `/src` for application-specific code (references domain tables). Use `/lib` for generic, reusable code (could be npm package).

---

## Database

### Key Tables

| Table | Purpose | Primary Key |
|-------|---------|-------------|
| `user_signup` | Personal info, vehicle, insurance | `create_user_id` (UUID) |
| `incident_reports` | Accident details (170+ columns) | `id` |
| `incident_other_vehicles` | Other vehicles involved | `id` |
| `incident_witnesses` | Witness information | `id` |
| `user_documents` | Images, processing status | `id` |
| `temp_uploads` | Temporary uploads (24hr TTL) | `id` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` |
| `completed_incident_forms` | Final PDF records | `id` |

### Row Level Security

All tables have RLS enabled. Users access own data via anon key.
**Exception:** Webhooks use service role key (bypasses RLS).

### Soft Delete (GDPR)

```javascript
// Soft delete pattern
.update({ deleted_at: new Date().toISOString() })

// Queries exclude soft-deleted
.select('*').is('deleted_at', null)
```

**Retention:** 7 years for legal documents

---

## API Structure

```
Authentication:
POST   /auth/signup, /auth/login, /auth/logout

Incident Forms (Pages 1-12):
POST   /api/signup/submit
POST   /api/incident-form/*
POST   /api/images/temp-upload

User Data:
GET    /api/user-documents, /api/incident-reports, /api/profile

Witnesses & Vehicles:
GET/POST /api/witnesses/:userId
GET/POST /api/other-vehicles/:userId
GET    /api/dvla/lookup?registration=XX11XXX

AI & Transcription:
POST   /api/transcription/transcribe
POST   /api/ai/analyze-incident

PDF:
POST   /api/pdf/generate

GDPR:
POST   /api/gdpr/export, /api/gdpr/delete-account

Health:
GET    /healthz, /livez, /readyz

Webhooks:
POST   /webhooks/github
```

All `/api/*` routes require `requireAuth` middleware (except webhooks and health).

---

## Environment Variables

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server (bypasses RLS)
OPENAI_API_KEY=sk-xxx
GITHUB_WEBHOOK_SECRET=xxx
```

**Optional (graceful fallback):**
```bash
PDF_SERVICES_CLIENT_ID=xxx           # Falls back to pdf-lib
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx
DVLA_API_KEY=xxx
CRON_ENABLED=true                    # Set false to disable cron jobs
```

---

## Migrations

**Pattern:** Forward migration + rollback script

```
migrations/
├── 001_migration_name.sql          # Forward
└── 001_migration_name_rollback.sql # Rollback
```

**Rules:**
- Always create rollback scripts
- Test rollback immediately after forward
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Never modify applied migrations
- Run `verify-tables.js` after schema changes

---

## Testing

**Coverage thresholds (enforced):** 60% branches, functions, lines, statements

**Test organisation:** Co-located in `__tests__/` directories within `/src`, or `*.test.js`/`*.spec.js` at root.

Prefer fakes over live Supabase/AWS/Adobe calls; gate external requests behind flags or mocks.

---

## Common Issues

**EADDRINUSE:**
```bash
lsof -ti:5000 | xargs kill -9
# Or: npm run dev (singleton protection handles it)
```

**Webhook signature failed:** Check `GITHUB_WEBHOOK_SECRET` matches GitHub settings

**Supabase connection:** `node scripts/test-supabase-client.js`

**PDF generation issues:** `node test-form-filling.js [uuid]` for diagnostics

---

## Code Style

- ES6+ with CommonJS (require/exports)
- 2-space indent, single quotes, semicolons
- camelCase for variables/functions, kebab-case for filenames
- Functions under 50 lines
- Always validate inputs, sanitise output

```javascript
// Error handling pattern
try {
  const result = await operation();
  logger.info('Success', { result });
  return result;
} catch (error) {
  logger.error('Failed', { error: error.message });
  throw new Error('User-friendly message');
}
```

---

## Avoiding Over-Engineering

**Principle:** Fix the actual problem, not imaginary ones.

### Before Adding Code, Ask:

1. **Does the existing system already handle this?** (Check dataFetcher, services, existing patterns)
2. **Am I duplicating data?** (One source of truth - don't write to multiple tables for the same purpose)
3. **Is this a fallback for a path that already works?** (If primary path works, don't add redundant fallbacks)
4. **Am I solving today's problem or a hypothetical future one?**

### Red Flags (Stop and Reconsider):

- Adding columns to store data that's already accessible elsewhere
- Writing to multiple tables when one would suffice
- Creating "just in case" fallback mechanisms
- Adding abstraction layers for single-use code
- "Future-proofing" without a concrete requirement

### The Litmus Test:

> "If I remove this code, will something actually break for a real user?"
>
> If the answer is "no" or "I'm not sure", the code probably shouldn't exist.

---

## Git Workflow

**Format:** `type: description`
**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

**Never commit:** `.env`, `credentials/`, `node_modules/`, `test-output/`, `coverage/`

PRs should include: lint output, test output, and note any migrations or PDF mapping updates.

---

## Design System

**Page colour variations (intentional):**
- Pages 1 & 12: Blue (`#2e6a9d`) - Impact/attention
- Pages 2-11: Deep Teal (`#0E7490`) - Consistent forms
- Pages 13-18: White - Legal document format (PDF only)

Do not "fix" these to match - they're deliberate design choices.

---

## Future Work: Witnesses & Vehicles Appendix

**Status:** Planned (not yet implemented)

**Background:** The main incident report PDF (18 pages, 213 fields) currently includes basic witness and other vehicle fields. However, complex incidents may involve multiple witnesses and vehicles that exceed the main form's capacity.

**Plan:**
- Create a **separate appendix PDF** for detailed witnesses and vehicles data
- Use existing template: `pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf`
- The main PDF will continue to capture primary witness/vehicle info
- Appendix will be generated only when additional entries exist in:
  - `incident_witnesses` table (multiple witnesses)
  - `incident_other_vehicles` table (multiple vehicles)

**Code Reference:**
- Methods already exist in `src/services/adobePdfFormFillerService.js`:
  - `appendWitnessPages()` - Template for witness appendix pages
  - `appendVehiclePages()` - Template for vehicle appendix pages
- These are currently not called from the main generation flow

**Data Collection:**
- Database tables `incident_witnesses` and `incident_other_vehicles` are **fully functional**
- Data collection process is complete and should NOT be modified
- Only PDF generation needs implementing when this feature is prioritised

---

**Last Updated:** 2025-12-26
**Version:** 2.1.0
