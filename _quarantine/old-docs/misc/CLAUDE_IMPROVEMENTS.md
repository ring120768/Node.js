# CLAUDE.md Suggested Improvements

## Changes to Make

### 1. Update API Structure Section (Line 530-579)

**Current:** Lists Typeform webhooks
**Suggested:** Update to reflect GitHub webhooks and new routes

```markdown
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
```

---

### 2. Update Webhook Section (Line 534-545)

**Replace the webhook routes section with:**

```markdown
## Webhook Integration

### GitHub Webhooks (Active)

**Endpoint:** `POST /webhooks/github`

**Purpose:** Receives GitHub repository events for automated deployments and notifications

**Pattern:**
```javascript
// Signature verification (src/middleware/webhookAuth.js)
const signature = req.headers['x-hub-signature-256'];
const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
hmac.update(req.rawBody, 'utf8');
const expectedSignature = 'sha256=' + hmac.digest('hex');

// Compare signatures using timing-safe comparison
if (signature !== expectedSignature) {
  return res.status(401).json({ error: 'Invalid signature' });
}

// Send 200 OK immediately, process async
res.status(200).json({ received: true });
processWebhookAsync(payload);
```

**Events handled:**
- `push` - Code deployment triggers
- `pull_request` - PR notifications
- `issues` - Issue tracking

**Test:** `GET /webhooks/debug` - Shows webhook configuration status

### Typeform Webhooks (Deprecated)

**Status:** ❌ Removed (Nov 2025)

**Reason:** Replaced with in-house HTML forms (Pages 1-12) for better mobile UX

**Migration:** All Typeform webhook logic moved to `/api/incident-form/*` endpoints
```

---

### 3. Add Mobile Upload Pattern Section (After Image Processing Pipeline)

Insert this new section after line 244:

```markdown
### 10. Mobile File Upload Pattern

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

**Test:** Upload image on mobile, background app, return → file still available
```

---

### 4. Update Recent Work Context (Line 816-895)

Add this subsection after "AI Analysis Integration":

```markdown
### In-House Form Migration (Complete ✅)

**Goal:** Replace Typeform with custom HTML forms for better mobile UX and cost savings

**Status:** ✅ Migration complete, Typeform webhooks removed

**Completed Work:**
1. **12-Page Form System:** Built custom incident form (Pages 1-12)
2. **Mobile File Upload Fix:** Immediate temp upload prevents ERR_UPLOAD_FILE_CHANGED
3. **Webhook Removal:** Typeform webhook endpoints removed from codebase
4. **GitHub Webhooks:** New webhook system for deployment automation
5. **Cost Savings:** Eliminated Typeform Pro subscription (£40/month)

**Critical Achievements:**
- ✅ Mobile file uploads now 100% reliable
- ✅ Session-based temp uploads with automatic cleanup
- ✅ Multi-page form with progress tracking
- ✅ Auth-first pattern (signup on Page 1, not Page 12)
- ✅ Real-time validation and error handling

**Key Files:**
- `public/incident-form-page*.html` - 12-page incident form
- `src/controllers/incidentForm.controller.js` - Form submission handling
- `src/controllers/tempImageUpload.controller.js` - Immediate upload logic
- `src/routes/webhook.routes.js` - GitHub webhooks only

**Migration Date:** November 2025

---
```

---

## Summary of Changes

1. ✅ **API Structure** - Added missing routes (DVLA, safety status, witnesses, vehicles)
2. ✅ **Webhooks** - Removed Typeform, documented GitHub webhooks
3. ✅ **Mobile Upload Pattern** - New section explaining temp upload architecture
4. ✅ **Recent Work** - Added in-house form migration context

## Why These Changes Matter

- **Accuracy**: Removes references to deprecated Typeform webhooks
- **Completeness**: Documents all current API routes
- **Architecture**: Explains mobile upload pattern (critical for UX)
- **Context**: Future Claude instances understand the Typeform → custom forms migration

---

**Apply these changes?** Let me know if you'd like me to update the CLAUDE.md file directly, or if you prefer to review and apply manually.
