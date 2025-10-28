# CLAUDE.md

## Project Overview

**Car Crash Lawyer AI** is a GDPR-compliant Node.js web application helping UK traffic accident victims complete legal incident reports.

**Stack**: Node.js 18+, Express, Supabase (PostgreSQL + Auth), Adobe PDF Services, OpenAI, Typeform webhooks

**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Version**: 2.0.1

---

## Current Architecture

### Auth Flow

The application uses **Supabase Auth** for user authentication:

- User signs up on page 1 of signup form → POST /auth/signup
- Supabase Auth creates user record and returns JWT token
- Token stored in `access_token` and `refresh_token` cookies (httpOnly, secure, sameSite=none for Replit)
- Protected endpoints verify token via `requireAuth` middleware (checks both cookies and Authorization header)
- Session auto-refreshes using refresh token when access token expires

**Key files**: `src/middleware/authMiddleware.js`, `src/controllers/auth.controller.js`

### Signup Flow (Auth-First)

Pages flow:

```
Page 1: Account Creation (signup-auth.html)
  → POST /auth/signup (Supabase Auth creates user, returns tokens)
  → Redirect to Page 2 (now authenticated)

Pages 2-9: Profile Completion (signup-form.html)
  → User authenticated throughout
  → Images upload immediately when selected
  → POST /api/images/temp-upload → temp_uploads table
  → Returns temp path (string, not File object)

Page 9: Final Submission
  → POST /api/signup/submit with temp image paths
  → Backend moves temp files to permanent storage
  → Creates user_signup record
  → Creates user_documents records
  → Redirect to dashboard (already authenticated)
```

**Why this approach?**
- Mobile file handles expire when app backgrounds (prevents ERR_UPLOAD_FILE_CHANGED)
- Immediate upload prevents data loss on navigation
- Temp files stored separately (24hr expiry, auto-cleanup)

**Key files**: `public/signup-auth.html`, `public/signup-form.html`, `src/controllers/signup.controller.js`, `src/routes/signup.routes.js`

### Dashboard

Protected page requiring `requireAuth` middleware.

- Fetches user data via API endpoints (incidents, images, transcriptions, PDFs)
- Real-time updates via WebSocket (`src/websocket/index.js`)
- Component-based design (modular sections, not one 2400-line file)

**Key files**: `public/dashboard.html`, `src/websocket/index.js`

### Page Protection Pattern (Security Wall)

**CRITICAL:** Protected HTML pages now require server-side authentication BEFORE serving the HTML. This is the "security wall" - auth happens at the middleware level, not just in client-side JavaScript.

**How it works:**
```javascript
// src/app.js protects pages BEFORE express.static()
const { pageAuth } = require('./middleware/pageAuth');

// Protected pages require valid Supabase session
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

**Unprotected pages** (anyone can access):
- `index.html` (landing page)
- `login.html`
- `signup-auth.html`, `signup-form.html`
- `payment-success.html`
- `privacy-policy.html`

**Protected pages** (server-side auth required):
- `dashboard.html` - User dashboard with data
- `transcription-status.html` - Audio transcription status
- `incident.html` - Incident report details

**Testing:**
```bash
# Automated test (checks 401 responses)
node test-security-wall.js

# Manual test
1. Access http://localhost:5000/dashboard.html without login
   → Should get 401 with redirect to /login.html
2. Login at /login.html with valid credentials
3. Access /dashboard.html again
   → Should load dashboard (authenticated)
```

**Why this matters:**
- ❌ **Before:** Unauthenticated users could load protected HTML (saw blank state)
- ✅ **After:** Server blocks request before serving HTML (401 response)
- 🔒 **Security:** Auth check happens server-side, not just client-side
- 📱 **Mobile:** Prevents loading sensitive pages without proper authentication

### API Structure

All API routes mounted in `src/routes/index.js`:

```
POST   /auth/signup              → User registration
POST   /auth/login               → User login
POST   /auth/logout              → Logout (clear cookies)

POST   /api/signup/submit        → Final signup form submission
POST   /api/images/temp-upload   → Immediate image upload (mobile-friendly)
GET    /api/user-documents       → Get user's images/documents
GET    /api/incident-reports     → Get user's incident reports
GET    /api/transcription/history → Get transcription history
POST   /api/pdf/generate         → Generate PDF report

GET    /api/profile              → Get user profile
POST   /api/profile              → Update profile

GET    /api/emergency            → Get emergency contacts
POST   /api/emergency            → Update emergency contacts

POST   /api/transcription/transcribe  → Upload audio for transcription
GET    /api/transcription/:id        → Get specific transcription

POST   /api/gdpr/export          → Export all user data
POST   /api/gdpr/delete-account  → Request account deletion

GET    /api/health               → Basic health check
GET    /api/readyz               → Readiness (with DB check)
```

**Authentication**: All `/api/*` endpoints require `requireAuth` middleware (except webhooks)

**Key files**: `src/routes/`, `src/controllers/`

### Webhook Processing (Legacy Typeform)

```
Typeform → POST /webhooks/typeform
  → Verify signature (req.rawBody, secret)
  → Send 200 OK immediately (Typeform timeout = 5s)
  → Process images async (don't block response)
  → Create user_signup, user_documents records
```

**CRITICAL**: Signature verification must use `req.rawBody` (captured in app.js before JSON parsing)

**Key files**: `src/routes/webhook.routes.js`, `src/controllers/webhook.controller.js`

---

## Security Model

### Authentication vs Authorization

**Authentication** = Verify you are who you claim (Supabase Auth)
- Implemented via `requireAuth` middleware
- Checks JWT token in cookie or Authorization header
- Auto-refreshes expired tokens

**Authorization** = Verify you have permission to do something
- Implemented via `requireRole`, `checkOwnership` middleware
- Checks user metadata (role, GDPR consent)
- Never does table queries (uses auth metadata only)

### Protecting Pages

**Protect a new page:**

1. Add middleware to route:
```javascript
router.get('/my-protected-page', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/my-page.html'));
});
```

2. Client-side fallback (if no server route):
```javascript
// Load user data, redirect to login if not authenticated
async function requireAuth() {
  const response = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${getCookie('access_token')}` }
  });
  if (!response.ok) {
    location.href = '/login.html?redirect=' + encodeURIComponent(location.pathname);
  }
}
```

### Protecting API Endpoints

**Require authentication:**
```javascript
router.get('/api/user-data', requireAuth, (req, res) => {
  // req.userId and req.user are available
});
```

**Require specific role:**
```javascript
router.post('/api/admin-action', requireAuth, requireRole('admin'), (req, res) => {
  // Only admins can access
});
```

**Check ownership (user can only access their own data):**
```javascript
router.get('/api/user/:userId/documents', requireAuth, checkOwnership, (req, res) => {
  // req.params.userId must match req.userId
});
```

**Key files**: `src/middleware/authMiddleware.js`, `src/middleware/authorization.js`

---

## Component Architecture

### Why Components?

The old dashboard was a 2,400-line monolith. New approach: modular components for maintainability.

**Component structure:**
```
/public/components/
  dashboard-cards.js       # Card component (reusable)
  dashboard-cards.css      # Styling
  dashboard-cards.html     # HTML template
  dashboard-cards-example.html  # Usage example
```

**Benefits:**
- Easy to test and debug (single responsibility)
- Reusable across pages
- Scales without becoming spaghetti code
- Clear dependencies

### Creating a New Component

1. Create component directory:
```bash
mkdir -p public/components/my-component
```

2. Create three files:

**my-component.js** (logic):
```javascript
class MyComponent {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
  }

  render(data) {
    this.container.innerHTML = this.template(data);
    this.attachEventListeners();
  }

  template(data) {
    return `<div class="my-component">...</div>`;
  }

  attachEventListeners() {
    // Event delegation (no inline handlers - CSP policy)
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-action')) {
        this.handleAction();
      }
    });
  }
}
```

**my-component.css** (styling):
```css
.my-component {
  padding: 1rem;
  border: 1px solid #ccc;
}
```

**my-component.html** (in dashboard.html or standalone):
```html
<div id="myComponentContainer"></div>
<script src="/components/my-component.js"></script>
<script>
  const component = new MyComponent('#myComponentContainer');
  component.render({ /* data */ });
</script>
```

### Shared Components

Reusable components in `/public/components/`:

- **Card**: `dashboard-cards.js` - Container for data display
- **Modal**: `(coming soon)`
- **Button**: Use native HTML + design-system.css
- **Toast**: `js/toast-notifications.js` - Notifications

**Using a shared component:**
```javascript
// In dashboard.html
const card = new DashboardCard({
  title: 'Incident Reports',
  content: data,
  actions: [{ label: 'View', onClick: () => {} }]
});
card.render('#container');
```

**Key files**: `public/components/`, `public/css/design-system.css`

---

## Development Standards

### Code Style

- **JavaScript**: ES6+, 2-space indentation, single quotes, semicolons, camelCase
- **HTML**: No inline event handlers (CSP policy blocks `onclick`, etc.)
- **CSS**: Use design-system.css variables where possible
- **Comments**: Explain WHY, not WHAT (code should be self-documenting)

**CSP Policy**: Content Security Policy blocks inline JavaScript. Always use event delegation:
```javascript
// ❌ NEVER: <button onclick="handleClick()">
// ✅ ALWAYS:
document.addEventListener('click', (e) => {
  if (e.target.id === 'myButton') handleClick();
});
```

### File Organization

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

### Testing

**Test API endpoints:**
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/readyz
```

**Test authentication:**
```javascript
// In browser console
const token = document.cookie.match(/access_token=([^;]+)/)[1];
fetch('/api/me', {
  headers: { Authorization: `Bearer ${token}` }
});
```

**Test database connection:**
```bash
node scripts/test-supabase-client.js
```

### Error Handling Pattern

All services follow this pattern:

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

**Controller pattern:**
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

---

## Common Development Tasks

### Add a Protected Page

**Example: Add a new "Reports" page**

1. Create HTML:
```html
<!-- public/reports.html -->
<!DOCTYPE html>
<html>
<head><title>Reports</title></head>
<body>
  <h1>My Reports</h1>
  <div id="reportsContainer"></div>

  <script>
    // Check auth and load data
    fetch('/api/pdf/status')
      .then(r => r.ok ? r.json() : Promise.reject('Not authenticated'))
      .catch(() => location.href = '/login.html');
  </script>
</body>
</html>
```

2. Add route (if needed):
```javascript
// In src/routes/index.js
router.get('/reports', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reports.html'));
});
```

### Add a Dashboard Section

**Example: Add "Summary Statistics" section**

1. Create component:
```javascript
// public/components/summary-stats.js
class SummaryStats {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  async render() {
    const data = await fetch('/api/summary-stats').then(r => r.json());
    this.container.innerHTML = `
      <div class="stats-grid">
        <div class="stat"><strong>${data.incidents}</strong> Incidents</div>
        <div class="stat"><strong>${data.documents}</strong> Documents</div>
      </div>
    `;
  }
}
```

2. Add to dashboard.html:
```html
<div id="summaryStatsContainer"></div>
<script src="/components/summary-stats.js"></script>
<script>
  const stats = new SummaryStats('summaryStatsContainer');
  stats.render();
</script>
```

### Add an API Endpoint

**Example: Add endpoint to get user's incident count**

1. Create controller:
```javascript
// src/controllers/stats.controller.js
async function getIncidentCount(req, res) {
  try {
    const { count } = await supabase
      .from('incident_reports')
      .select('*', { count: 'exact', head: true })
      .eq('create_user_id', req.userId);

    res.json({ success: true, count });
  } catch (error) {
    logger.error('Stats error', error);
    res.status(500).json({ success: false, error: 'Failed to get count' });
  }
}

module.exports = { getIncidentCount };
```

2. Create route:
```javascript
// src/routes/stats.routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const statsController = require('../controllers/stats.controller');

router.get('/incident-count', requireAuth, statsController.getIncidentCount);

module.exports = router;
```

3. Mount in index.js:
```javascript
const statsRoutes = require('./stats.routes');
router.use('/api/stats', statsRoutes);
```

4. Use from frontend:
```javascript
fetch('/api/stats/incident-count')
  .then(r => r.json())
  .then(data => console.log(`You have ${data.count} incidents`));
```

### Add a Form Field to Signup

1. Add input to HTML:
```html
<!-- In signup-form.html, Pages 2-9 section -->
<input type="text" name="occupation" placeholder="Your occupation">
```

2. Submit with form data:
```javascript
// In signup-form.js
const formData = {
  auth_user_id: userId,
  occupation: document.querySelector('input[name="occupation"]').value,
  // ... other fields
};

fetch('/api/signup/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

3. Backend receives in controller:
```javascript
async function submitSignup(req, res) {
  const { auth_user_id, occupation, ... } = req.body;
  // Validate and save to Supabase
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app.js` | Express app setup, middleware, routes mounting |
| `src/middleware/authMiddleware.js` | Authentication middleware (requireAuth, optionalAuth) |
| `src/middleware/authorization.js` | Authorization middleware (checkOwnership, requireRole) |
| `src/routes/index.js` | Central router, mounts all route files |
| `src/routes/auth.routes.js` | /auth/signup, /auth/login, /auth/logout |
| `src/routes/signup.routes.js` | /api/signup/submit |
| `src/routes/incident.routes.js` | /api/incident-reports |
| `src/controllers/auth.controller.js` | Authentication logic |
| `src/controllers/signup.controller.js` | Signup form submission |
| `src/utils/logger.js` | Logging utility |
| `src/websocket/index.js` | Real-time WebSocket updates |
| `public/dashboard.html` | User dashboard page |
| `public/signup-form.html` | Multi-page signup form |
| `public/login.html` | Login page |
| `public/components/` | Reusable UI components |
| `public/css/design-system.css` | Design tokens and utilities |
| `lib/services/authService.js` | Shared auth utilities |
| `lib/data/dataFetcher.js` | Database query aggregation for PDF |

---

## Environment Variables

**Required:**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx      # For webhooks (bypasses RLS)
OPENAI_API_KEY=sk-xxx              # For transcription/summarization
TYPEFORM_WEBHOOK_SECRET=xxx        # HMAC signature verification
```

**Optional (falls back gracefully):**
```bash
PDF_SERVICES_CLIENT_ID=xxx         # Adobe PDF Services
PDF_SERVICES_CLIENT_SECRET=xxx
WHAT3WORDS_API_KEY=xxx             # Location services
DVLA_API_KEY=xxx                   # UK vehicle lookups
```

**Application:**
```bash
NODE_ENV=production
PORT=5000
REQUEST_TIMEOUT=30000
APP_URL=https://your-domain.com
```

---

## Database Tables (Key Reference)

| Table | Purpose | Primary Key |
|-------|---------|------------|
| `user_signup` | Personal info, vehicle, insurance | `create_user_id` (UUID) |
| `incident_reports` | Accident details | `id`, indexed by `create_user_id` |
| `user_documents` | Images, documents, processing status | `id`, indexed by `create_user_id` |
| `temp_uploads` | Temporary image uploads (24hr expiry) | `id`, indexed by `session_id` |
| `ai_transcription` | OpenAI Whisper transcripts | `id`, indexed by `create_user_id` |
| `completed_incident_forms` | Generated PDF records | `id`, indexed by `create_user_id` |

All tables include: `created_at`, `updated_at`, `deleted_at` (soft delete), `gdpr_consent`

---

## Running the Application

```bash
# Development with hot-reload
npm run dev

# Production
npm start

# Health checks
curl http://localhost:5000/api/health
curl http://localhost:5000/api/readyz

# Test Supabase connection
node scripts/test-supabase-client.js
```

---

## Common Patterns & Gotchas

### Session Persistence

Cookies set with `sameSite=none` for Replit subdomains (but also work on production domains). This is intentional - don't change to `Lax`.

### Image Upload Workflow

Temp uploads solve the "ERR_UPLOAD_FILE_CHANGED" issue on mobile:
1. User selects image → `POST /api/images/temp-upload` (immediate)
2. File stored in `temp/session-id/filename`
3. On form submit → backend moves temp → permanent (`userId/filename`)
4. Temp files auto-deleted after 24hrs (cron job)

### Webhook Signature Verification

**CRITICAL**: Must use `req.rawBody` (not parsed JSON):
```javascript
// In app.js BEFORE express.json()
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Then in controller
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
```

### Real-Time Updates

Dashboard uses WebSocket for live updates. If changes don't appear:
1. Check WebSocket connection: `console.log(websocket.readyState)`
2. Check server logs: `npm run dev` shows WebSocket connections
3. Manually refresh dashboard or use polling endpoint

---

## Next Steps / Known Issues

- Dashboard rebuild (component-based) is in progress
- Missing pages: accounts management, subscription status
- To add: Email verification requirement, password reset flow
- Performance: Optimize PDF generation (currently 2-3 seconds)

---

**Last Updated**: 2025-10-28
**Maintained By**: Claude Code
**For Questions**: Check related documentation files or app.js comments
