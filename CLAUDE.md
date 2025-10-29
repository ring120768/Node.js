# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start Commands

```bash
# Development
npm run dev              # Hot-reload development server (uses nodemon)
npm start                # Production server

# Testing
npm test                 # Run Jest test suite with coverage
npm run lint             # ESLint code linting
npm run format           # Prettier code formatting

# Health Checks
curl http://localhost:5000/api/health   # Basic health check
curl http://localhost:5000/api/readyz   # Readiness check (with DB)

# Common Test Scripts
node test-security-wall.js              # Test page authentication
node test-adobe-pdf.js                  # Test Adobe PDF Services
node test-form-filling.js [user-uuid]   # Test PDF generation with real data
node scripts/test-supabase-client.js    # Test database connection
node test-what3words.js                 # Test what3words API integration
```

---

## Development Philosophy & Workflow

### Default Behavior

✅ **Just do it** - Action over asking for routine development work
✅ **Working > Perfect** - Solve today's problem, not hypothetical futures
✅ **Clarity > Cleverness** - Simple, maintainable code wins

### Workflow Process

**IMPORTANT: Follow these steps to maximize effectiveness:**

1. **Plan before coding** - Generate clear plan for requested work
2. **Refine and review** - Review plans before execution
3. **Small iterations** - Work in small changes (≤200 lines per diff)
4. **Test everything** - Require tests for every code change; include run instructions
5. **Integrate, don't duplicate** - Add to existing files instead of creating new ones
6. **Reference existing code** - Use codebase patterns instead of creating redundant implementations

### Anti-Patterns to Avoid

**Don't use these phrases:**
- ❌ "Production-ready code" (over-engineering trigger)
- ❌ "Enterprise-grade solution" (unnecessary complexity)
- ❌ "Future-proof implementation" (solving imaginary problems)
- ❌ "Scalable architecture" (unless specifically requested)

**Use these instead:**
- ✅ "Working code that does X"
- ✅ "Implementation handling cases: A, B, C"
- ✅ "Here's a validation script to test it"
- ✅ "Assumption: X, Y, Z (documented in code)"

**Note:** We're building for current requirements. Add complexity only when actually needed, not "just in case."

---

## Permissions & Execution Policy

### ✅ Auto-Execute (No Confirmation Needed)

**Development work:**
- Create, edit, delete, rename files
- Write/modify JavaScript, HTML, CSS, Node.js code
- Install packages, create configs
- Fix bugs, implement features, refactor code
- Add validation and error handling

**Database (Development):**
- Query development database
- Create/modify tables and schemas (dev environment)
- Set up RLS policies (dev environment)
- Upload files to Supabase Storage

**Git operations:**
- Commit to development/feature branches
- Create branches and pull requests
- Update documentation and issues

**MCP Tools (Pre-approved):**
- All web searches (Perplexity, Firecrawl, Ref)
- Documentation lookups
- Single URL scraping
- Code analysis and pattern searches

### ⚠️ Ask First

- Production database changes (INSERT, UPDATE, DELETE on prod)
- Pushing to main/master branch
- Deleting multiple files or tables (>3 items)
- Bulk operations (>10 records)
- Security or RLS policy changes in production
- Large-scale web scraping (cost implications)
- Any destructive operations

---

## Project Overview

**Car Crash Lawyer AI** is a GDPR-compliant Node.js web application helping UK traffic accident victims complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth), Adobe PDF Services, OpenAI, Typeform webhooks

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1

---

## Critical Architecture Patterns

### 1. Server-Side Page Authentication (Security Wall)

**CRITICAL:** Protected HTML pages require server-side authentication BEFORE serving the HTML. This is NOT just client-side JavaScript checking - auth happens at the middleware level.

```javascript
// src/app.js - Protected pages served via middleware
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// pageAuth middleware (src/middleware/pageAuth.js):
// 1. Extracts session token from cookies (sb-access-token, sb-auth-token)
// 2. Verifies token with Supabase Auth API
// 3. Returns 401 with login redirect if invalid/missing
// 4. Attaches req.user and req.sessionToken if valid
// 5. Calls next() to serve file
```

**Why this matters:**
- ❌ **Before:** Unauthenticated users could load protected HTML (saw blank state)
- ✅ **After:** Server blocks request before serving HTML (401 response)
- 🔒 **Security:** Auth check happens server-side, not just client-side
- 📱 **Mobile:** Prevents loading sensitive pages without proper authentication

**Protected pages:** `dashboard.html`, `transcription-status.html`, `incident.html`

**Test:** `node test-security-wall.js`

---

### 2. Auth-First Signup Flow

**CRITICAL DIFFERENCE:** User authentication happens on Page 1, NOT at the end of signup.

```
Page 1: Account Creation (signup-auth.html)
  → POST /auth/signup (Supabase Auth creates user, returns tokens)
  → Cookies set: access_token, refresh_token
  → Redirect to Page 2 (now authenticated)

Pages 2-9: Profile Completion (signup-form.html)
  → User ALREADY authenticated throughout
  → Images upload immediately when selected (mobile-friendly)
  → POST /api/images/temp-upload → temp_uploads table

Page 9: Final Submission
  → POST /api/signup/submit with temp image paths
  → Backend moves temp files to permanent storage
  → Creates user_signup + user_documents records
  → Redirect to dashboard (already authenticated)
```

**Why this approach?**
- Mobile file handles expire when app backgrounds (prevents ERR_UPLOAD_FILE_CHANGED)
- Immediate upload prevents data loss on navigation between pages
- Temp files stored separately with 24hr auto-expiry/cleanup

**Key files:** `public/signup-auth.html`, `public/signup-form.html`, `src/controllers/signup.controller.js`

---

### 3. Webhook Signature Verification Pattern

**CRITICAL:** Must use `req.rawBody` captured BEFORE JSON parsing, not the parsed body.

```javascript
// In src/app.js BEFORE express.json() middleware
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBody = buf.toString('utf8');  // Capture raw body
  }
}));

// Then in webhook controller
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');  // Use rawBody, not req.body
const expectedSignature = hmac.digest('base64');
```

**Why:** Signature is calculated on the raw bytes, not the parsed JSON. Using `req.body` will fail verification.

**Flow:**
```
1. Verify signature (req.rawBody + WEBHOOK_SECRET)
2. Send 200 OK immediately (Typeform timeout = 5 seconds)
3. Process images async (don't block response)
4. Create user_signup, user_documents records
```

**Key files:** `src/routes/webhook.routes.js`, `src/controllers/webhook.controller.js`

---

### 4. Image Processing Pipeline

The application uses an enhanced database-driven image processor with automatic retries.

```javascript
// ImageProcessorV2 workflow:
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

**Why permanent API URLs instead of signed URLs:**
- Signed URLs expire (typically 1 hour)
- API URLs work forever and generate fresh signed URLs on-demand
- Shareable links don't break after expiry
- Better user experience (no "link expired" errors)

**Key files:** `src/services/imageProcessorV2.js`, `src/services/imageRetryService.js`

---

### 5. Component-Based Dashboard Architecture

**Old approach:** 2,400-line monolithic dashboard.html
**New approach:** Modular components with clear separation of concerns

```
/public/components/
  dashboard-cards.js       # Reusable card component
  dashboard-cards.css      # Component styling
  dashboard-cards.html     # HTML template/example

Benefits:
- Single responsibility (easy to test/debug)
- Reusable across pages
- Scales without becoming spaghetti code
- Clear dependencies
```

**CSP Policy Impact:** Content Security Policy blocks inline event handlers (`onclick`, etc.). Always use event delegation:

```javascript
// ❌ NEVER: <button onclick="handleClick()">
// ✅ ALWAYS:
document.addEventListener('click', (e) => {
  if (e.target.id === 'myButton') handleClick();
});
```

**Key files:** `public/components/`, `public/css/design-system.css`

---

### 6. Graceful Shutdown Pattern

**CRITICAL:** The application uses singleton protection and graceful shutdown to prevent EADDRINUSE errors.

```javascript
// index.js - Singleton protection
if (global.__APP_STARTED__) {
  console.log('App already started, ignoring duplicate request');
  process.exit(0);
}
global.__APP_STARTED__ = true;

// Graceful shutdown on SIGTERM/SIGINT
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

function gracefulShutdown(signal) {
  // 1. Stop accepting new connections
  // 2. Close WebSocket connections
  // 3. Unsubscribe from Realtime channels
  // 4. Stop cron jobs
  // 5. Cleanup global state
  // 6. Force exit after 5s timeout
}
```

**Why this matters:**
- Prevents duplicate server instances on Replit
- Cleans up resources properly (WebSocket, DB connections, cron jobs)
- Avoids port binding conflicts
- Ensures clean restarts

**Test:** Kill server with Ctrl+C and verify clean shutdown logs

---

### 7. Raw Body Capture for Webhooks

**CRITICAL:** Webhook signature verification requires the raw request body BEFORE JSON parsing.

```javascript
// src/app.js - MUST be configured before any routes
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBodyBuffer = buf;           // Store as Buffer
    req.rawBody = buf.toString('utf8'); // Store as string
  }
}));

// Why both formats?
// - rawBodyBuffer: For Buffer.compare operations
// - rawBody: For crypto.createHmac().update()
```

**Common mistakes:**
- ❌ Adding body parser AFTER mounting webhook routes (raw body won't be captured)
- ❌ Using `JSON.stringify(req.body)` instead of `req.rawBody` (signatures won't match)
- ❌ Parsing body before signature verification (order matters!)

**Key files:** `src/app.js` (lines 80-96), `src/controllers/webhook.controller.js`

---

### 8. what3words Location Integration Pattern

**CRITICAL:** Location API integration with graceful fallback when API key is unavailable.

```javascript
// Configuration (src/config/index.js)
what3words: {
  apiKey: process.env.WHAT3WORDS_API_KEY,
  enabled: !!process.env.WHAT3WORDS_API_KEY  // Auto-disable if no key
}

// Controller pattern (all endpoints follow this)
async function convertToWhat3Words(req, res) {
  // 1. Validate input
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  // 2. Check API key availability (graceful fallback)
  if (!config.what3words.apiKey) {
    logger.warn('what3words API key not configured');
    return res.status(200).json({
      success: false,
      message: 'Location service temporarily unavailable',
      fallback: true  // Frontend can detect fallback mode
    });
  }

  // 3. Call what3words API
  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${config.what3words.apiKey}`;
    const response = await axios.get(url);

    return res.status(200).json({
      success: true,
      words: response.data.words,
      coordinates: { latitude, longitude },
      country: response.data.country
    });
  } catch (error) {
    // 4. Handle API errors gracefully
    logger.error('what3words API error:', error.message);
    return res.status(200).json({
      success: false,
      message: 'Location service error',
      fallback: true
    });
  }
}
```

**Why this pattern:**
- ✅ Application never crashes if what3words is unavailable
- ✅ Frontend receives clear fallback signal
- ✅ Configuration-driven (enabled/disabled via env var)
- ✅ Logs warnings when service unavailable (for debugging)
- ✅ API errors don't expose internals to frontend

**Environment setup:**
- **Development**: Add to Replit Secrets (Tools → Secrets)
- **Key**: `WHAT3WORDS_API_KEY`
- **Value**: `C0C4RX8X`
- **Restart required** after adding secret

**Available endpoints:**
- `POST /api/location/what3words` - Convert coordinates to words
- `GET /api/location/convert` - GET version of coordinate conversion
- `GET /api/location/autosuggest` - Autocomplete for partial words
- `GET /api/location/legacy` - Backward compatibility endpoint
- `POST /api/location/upload-image` - Upload location image with metadata

**Testing:**
```bash
# Test integration
node test-what3words.js

# Test single endpoint
curl -X POST http://localhost:5000/api/location/what3words \
  -H "Content-Type: application/json" \
  -d '{"latitude": 51.520847, "longitude": -0.195521}'

# Expected: {"success":true,"words":"filled.count.soap",...}
```

**Key files:** `src/controllers/location.controller.js`, `src/routes/location.routes.js`, `src/config/index.js`

---

## High-Level Architecture

### Request Flow

```
Internet → index.js (HTTP server + WebSocket)
         ↓
      src/app.js (Express app)
         ↓
      Middleware stack (CRITICAL ORDER):
         1. express.json() with verify (raw body capture)
         2. express.urlencoded() with verify
         3. Helmet (security headers)
         4. CORS (cross-origin)
         5. Compression
         6. Request ID
         7. Request timeout (30s)
         8. Morgan (HTTP logging)
         9. Cookie parser
        10. HTTPS/WWW redirects
        11. Request logger
        12. Protected page routes (pageAuth middleware)
        13. Cache control headers
        14. Static files (public/)
        15. Rate limiters (API endpoints)
         ↓
      Routes:
         - /webhooks/* (mounted FIRST in app.js, before other routes)
         - / (central router from src/routes/index.js)
         ↓
      Controllers (src/controllers/)
         ↓
      Services (src/services/)
         ↓
      External APIs / Database
```

**⚠️ CRITICAL ORDERING RULES:**

1. **Raw body capture MUST be first** - Webhooks need unmodified request body
2. **Webhooks MUST be mounted before other routes** - Signature verification depends on raw body
3. **Protected pages MUST come before static files** - Server-side auth check intercepts requests
4. **Rate limiters applied selectively** - Different limits for different endpoint groups

### Data Flow: User Signup

```
Typeform Submission
    ↓
POST /webhooks/typeform
    ↓
Signature Verification (HMAC SHA-256, req.rawBody)
    ↓
Extract Form Data (webhook.controller.js)
    ↓
Process Images (ImageProcessorV2)
    ├─ Create user_documents records (status: 'pending')
    ├─ Download from Typeform URLs
    ├─ Upload to Supabase Storage (user-documents bucket)
    ├─ Generate permanent API URLs
    └─ Update status to 'completed'
    ↓
Store User Data (user_signup table)
    ├─ Personal details
    ├─ Vehicle information
    ├─ Insurance details
    └─ Permanent image URLs
    ↓
Send 200 OK (within 5 seconds)
    ↓
Redirect User to /payment-success.html
    ↓
Frontend Fetches User Profile
    ↓
Display Personalized Welcome
```

### Real-Time Updates Architecture

```
Backend Changes (Supabase table updates)
    ↓
Supabase Realtime (postgres_changes subscription)
    ↓
WebSocket Server (src/websocket/index.js)
    ↓
WebSocket Broadcast to Connected Clients
    ↓
Frontend Updates (dashboard.html, transcription-status.html)
```

---

## Critical Database Patterns

### Row Level Security (RLS)

**All tables have RLS enabled.** Users can only access their own data via Supabase anon key.

**Exception:** Webhooks use service role key (bypasses RLS) because:
- Typeform sends data before user is authenticated
- No user session context during webhook processing
- Server-side validation ensures data integrity

### Soft Delete Pattern

All tables include `deleted_at` timestamp for GDPR compliance:

```javascript
// Soft delete (GDPR-compliant)
await supabase
  .from('user_documents')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', documentId);

// Queries exclude soft-deleted records
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
| `incident_reports` | Accident details | `id` | `create_user_id` (indexed) |
| `user_documents` | Images, processing status | `id` | `status`, `retry_count`, `public_url` |
| `temp_uploads` | Temporary uploads (24hr expiry) | `id` | `session_id`, `created_at` |
| `ai_transcription` | OpenAI Whisper transcripts | `id` | `create_user_id`, `transcript_text` |

---

## Environment Variables

**⚠️ IMPORTANT: All environment variables are securely stored in Replit Secrets**
- Never commit `.env` files to Git
- Access via Replit Secrets panel (Tools → Secrets)
- All secrets are encrypted and injected at runtime
- No need to create `.env` file - Replit handles this automatically

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx                # Client-side auth
SUPABASE_SERVICE_ROLE_KEY=xxx        # Server-side (bypasses RLS for webhooks)
OPENAI_API_KEY=sk-xxx                # Transcription/summarization
TYPEFORM_WEBHOOK_SECRET=xxx          # HMAC signature verification
```

**Optional (graceful fallback):**
```bash
PDF_SERVICES_CLIENT_ID=xxx           # Adobe PDF Services
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx               # Location services
DVLA_API_KEY=xxx                     # UK vehicle lookups
```

**Application:**
```bash
NODE_ENV=production
PORT=5000
REQUEST_TIMEOUT=30000
APP_URL=https://your-domain.com
```

**Accessing Secrets:**
- **In code:** `process.env.VARIABLE_NAME`
- **In Replit:** Tools → Secrets → Add new secret
- **Deployment:** Secrets automatically available in production

---

## Code Style & Patterns

### Error Handling

**Service layer:**
```javascript
try {
  const result = await riskyOperation();
  logger.info('Operation succeeded', { result });
  return result;
} catch (error) {
  logger.error('Operation failed', { error: error.message });
  throw new Error('User-friendly message (never expose internals)');
}
```

**Controller layer:**
```javascript
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

### Code Style Standards

- **JavaScript:** ES6+, ES modules (import/export), destructuring, async/await
- **Formatting:** 2-space indentation, single quotes, semicolons, camelCase
- **Functions:** Keep under 50 lines, single responsibility
- **Comments:** Explain WHY, not WHAT (code should be self-documenting)
- **Security:** Always validate inputs, use parameterized queries, sanitize output
- **Linting:** Run `npm run lint` after every commit
- **Formatting:** Run `npm run format` before committing

### Naming Conventions

- **Files:** camelCase (e.g., `userController.js`)
- **Components:** PascalCase (e.g., `DashboardCard`)
- **Variables/Functions:** camelCase (e.g., `getUserData`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_UPLOAD_SIZE`)
- **Database:** snake_case (e.g., `user_signup`, `created_at`)
- **Branches:** `feat/name`, `fix/name`, `docs/name`

---

## API Structure

All API routes mounted in `src/routes/index.js`:

```
Authentication:
POST   /auth/signup              → User registration
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
POST   /api/transcription/transcribe  → Upload audio
GET    /api/transcription/history     → Get transcription history
GET    /api/transcription/:id         → Get specific transcription

PDF:
POST   /api/pdf/generate         → Generate PDF report

GDPR:
POST   /api/gdpr/export          → Export all user data
POST   /api/gdpr/delete-account  → Request account deletion

Health:
GET    /api/health               → Basic health check
GET    /api/readyz               → Readiness (with DB check)

Webhooks:
POST   /webhooks/typeform        → Typeform submissions
```

**Authentication:** All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

---

## Common Gotchas

### Session Cookies

Cookies set with `sameSite=none` for Replit subdomains. This is intentional - don't change to `Lax`.

**Why:** Replit uses subdomains (*.replit.app) which browsers treat as cross-site. `sameSite=none` required for cookies to work.

### WebSocket Connection

Dashboard uses WebSocket for live updates. If changes don't appear:

1. Check WebSocket connection: `console.log(websocket.readyState)` (1 = OPEN)
2. Check server logs: `npm run dev` shows WebSocket connections
3. Manually refresh or use polling endpoint as fallback

### Image Upload on Mobile

Temp uploads solve "ERR_UPLOAD_FILE_CHANGED" issue:
1. User selects image → POST /api/images/temp-upload (immediate)
2. File stored in temp/session-id/filename
3. On form submit → backend moves temp → permanent (userId/filename)
4. Temp files auto-deleted after 24hrs (cron job)

**Why:** Mobile apps invalidate file handles when backgrounded. Immediate upload prevents data loss.

---

## Testing Guidelines

### Testing Requirements

**All new features require tests:**
- Unit tests for business logic
- Integration tests for API endpoints
- Provide clear instructions for running tests

**Test locally before submitting:**
```bash
npm test                    # Run all tests with coverage
npm run lint                # Check code quality
npm run format              # Format code
```

**Provide test results to Claude before next iteration**

### Test Structure
```
src/
├── middleware/
│   ├── __tests__/
│   │   ├── cors.integration.test.js
│   │   └── corsConfig.test.js
├── routes/
│   └── __tests__/
│       └── (route tests)
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
```

### Integration Test Scripts

The project includes several standalone test scripts for manual verification:

```bash
# Security & Authentication
node test-security-wall.js              # Verify pageAuth middleware blocks unauthenticated access

# PDF Services
node test-adobe-pdf.js                  # Test Adobe PDF Services connection
node test-form-filling.js [user-uuid]   # Generate PDF with real user data

# Database
node scripts/test-supabase-client.js    # Verify Supabase connection

# Webhooks
node scripts/test-github-webhook.js     # Test GitHub webhook signature verification
```

**When to use these:**
- After environment variable changes
- Before deploying to production
- When debugging integration issues
- To verify external service connectivity

---

## File Organization

```
/src
  /controllers      # Request handlers (thin layer)
  /middleware       # Auth, CORS, error handling, validation
  /routes           # Route definitions
  /services         # Business logic (PDF, images, emails)
  /utils            # Helpers (logger, validators)
  /websocket        # Real-time updates
  /config           # Configuration
  app.js            # Express app setup

/public
  /components       # Reusable UI components
  /js               # Utilities, initializers
  /css              # Styling
  *.html            # Page templates

/lib
  /services         # Shared services (email, GDPR)
  /data             # Database queries
  /generators       # Email templates, PDF utilities
```

---

## MCP Servers & Sub-Agents

This project leverages **Model Context Protocol (MCP) servers** for enhanced capabilities:

### Available MCP Servers

1. **Perplexity MCP** - Web research, current information
2. **Firecrawl MCP** - Web scraping, data extraction
3. **Ref MCP** - Documentation search (token-efficient)
4. **Supabase MCP** - Database management
5. **Sentry MCP** - Error tracking
6. **Sequential Thinking MCP** - Complex problem solving
7. **Playwright MCP** - Browser automation, testing

### Specialized Sub-Agents (37 available)

Sub-agents are expert AI assistants invoked based on task context:

- **Frontend:** `frontend-developer`, `react-pro`, `nextjs-pro`, `ui-designer`, `ux-designer`, `mobile-developer`
- **Backend:** `backend-architect`, `full-stack-developer`, `typescript-pro`, `python-pro`, `golang-pro`
- **Data & AI:** `ai-engineer`, `data-engineer`, `postgres-pro`, `database-optimizer`, `graphql-architect`
- **Infrastructure:** `cloud-architect`, `deployment-engineer`, `devops-incident-responder`, `performance-engineer`
- **Quality:** `code-reviewer`, `architect-review`, `debugger`, `qa-expert`, `test-automator`
- **Security:** `security-auditor`
- **Documentation:** `api-documenter`, `documentation-expert`, `legacy-modernizer`
- **Meta:** `agent-organizer` (master orchestrator), `product-manager`

**Usage:** Let Claude Code choose automatically, or explicitly request: "Use postgres-pro to optimize this query"

### Claude Context Management

**Best Practices:**
- Use `/clear` periodically during long sessions to avoid context overload
- For large projects, place specific CLAUDE.md files in subfolders (`/frontend`, `/backend`)
- Reference diagrams, logs, or images in documentation for better troubleshooting context
- Keep this file updated regularly for maximum effectiveness

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

## Next Steps / Known Issues

- Dashboard rebuild (component-based) is in progress
- Missing pages: accounts management, subscription status
- To add: Email verification requirement, password reset flow
- Performance: Optimize PDF generation (currently 2-3 seconds)

---

**Last Updated:** 2025-01-28
**Maintained By:** Claude Code
**For Questions:** Check README.md, ARCHITECTURE.md, or use `/help` command

---

## Changelog

### 2025-01-28 - Architecture Enhancements
- Added **Graceful Shutdown Pattern** section (critical for Replit deployments)
- Added **Raw Body Capture** detailed explanation with common mistakes
- Enhanced **Request Flow** with critical middleware ordering rules
- Added **Integration Test Scripts** section with usage guidelines
- Clarified webhook mounting order and its importance
- Improved middleware stack documentation with specific ordering requirements
