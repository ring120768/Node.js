# Typeform Legacy Code Removal Plan

## Executive Summary

**Found:** 20 files with Typeform/Zapier references
**Status:** Both Typeform and Zapier webhooks are retired (per CLAUDE.md)
**Active:** GitHub webhooks must be preserved
**Goal:** Remove all Typeform/Zapier code without breaking GitHub functionality

---

## Removal Strategy (4 Stages)

### ✅ Stage 1: Remove Typeform-Only Files (SAFEST)

**Files to delete entirely:**
1. `src/controllers/typeform-redirect.controller.js` (16 references - entire file is legacy)

**Risk:** ⭐ None - file is completely unused

**Test:** Server starts successfully

---

### ✅ Stage 2: Remove Test Files (SAFE)

**Files to delete entirely:**
1. `src/middleware/__tests__/webhookAuth.test.js` - Typeform/Zapier tests
2. `src/middleware/__tests__/corsConfig.test.js` - Typeform CORS tests
3. `src/middleware/__tests__/cors.integration.test.js` - Typeform origin tests

**Risk:** ⭐ None - tests for removed functionality

**Test:** `npm test` passes (may need to update test counts)

---

### ⚠️  Stage 3: Clean Middleware (CAREFUL - GitHub Active)

**Files to modify (preserve GitHub):**

#### 3a. `src/middleware/webhookAuth.js`
**Remove:**
- `verifyTypeformSignature()` function (lines 86-115)
- `verifyZapierSignature()` function (lines 117-129)
- Typeform case in `validateWebhookSignature()` switch (lines 31-32)
- Zapier case in switch (lines 34-35)
- Typeform case in `getWebhookSecret()` (lines 62-63)
- Zapier case in `getWebhookSecret()` (lines 64-65)
- Typeform case in `getSignatureHeader()` (lines 75-76)
- Zapier case in `getSignatureHeader()` (lines 77-78)

**Keep:**
- `verifyGitHubSignature()` function
- GitHub case in all switch statements
- Main `validateWebhookSignature()` function structure

**Result:** File becomes GitHub-only webhook auth

#### 3b. `src/middleware/corsConfig.js`
**Remove:**
- `'Typeform-Signature'` from allowedHeaders
- `'https://form.typeform.com'` from staticOrigins
- `'https://typeform.com'` from staticOrigins

**Keep:** All other CORS configuration

#### 3c. `src/middleware/security.js`
**Remove:**
- `verifyTypeform()` function
- `'Typeform-Signature'` from allowedHeaders array

**Keep:** All other security middleware

**Risk:** ⭐⭐ Medium - must preserve GitHub webhook auth

**Test:**
1. Server starts successfully
2. GitHub webhook POST still works (if configured)
3. No TypeErrors about missing functions

---

### 📝 Stage 4: Documentation Cleanup (LOW PRIORITY)

**Files to update (comments only):**

#### Controllers:
- `src/controllers/debug.controller.js` - Remove Typeform config checks
- `src/controllers/auth.controller.js` - Remove Typeform redirect comments
- `src/controllers/incidentForm.controller.js` - Remove Typeform field comments

#### Services:
- `src/services/imageProcessor.js` - Remove Typeform URL comments
- `src/services/imageProcessorV2.js` - Remove Typeform URL comments
- `src/services/adobePdfFormFillerService.js` - Remove Typeform field comment

#### Routes:
- `src/routes/index.js` - Update webhook documentation
- `src/routes/auth.routes.js` - Remove Typeform nonce comment
- `src/routes/webhook.routes.js` - Remove Typeform note

#### Config:
- `src/config/constants.js` - Remove TYPEFORM config object
- `src/config/index.js` - Remove TYPEFORM_X_API_KEY references

#### Core:
- `src/app.js` - Update middleware comments
- `lib/dataFetcher.js` - Remove Typeform UUID comment

**Risk:** ⭐ None - comments only

**Note:** Can keep some comments as historical context if they explain data structure

---

## Commit Strategy

Each stage gets its own commit for easy rollback:

```bash
# Stage 1
git add src/controllers/typeform-redirect.controller.js
git commit -m "refactor: remove typeform-redirect controller (legacy)"

# Stage 2
git add src/middleware/__tests__/
git commit -m "test: remove Typeform/Zapier webhook tests (legacy)"

# Stage 3a
git add src/middleware/webhookAuth.js
git commit -m "refactor: remove Typeform/Zapier from webhook auth (keep GitHub)"

# Stage 3b
git add src/middleware/corsConfig.js
git commit -m "refactor: remove Typeform from CORS config"

# Stage 3c
git add src/middleware/security.js
git commit -m "refactor: remove Typeform signature from security middleware"

# Stage 4 (combined)
git add <all-comment-changes>
git commit -m "docs: remove Typeform/Zapier references from comments"
```

---

## Testing Checklist

After each stage:

- [ ] `npm start` - Server starts without errors
- [ ] `npm test` - All tests pass
- [ ] Check console for missing function errors
- [ ] Test GitHub webhook (if configured): `POST /webhooks/github` with valid signature

After complete removal:

- [ ] Check Railway logs for startup errors
- [ ] Verify no Typeform env vars are required
- [ ] Update .env.example to remove TYPEFORM_* variables
- [ ] Search codebase: `grep -r "Typeform" src/` should only show comments/docs

---

## Rollback Plan

If issues arise after any stage:

```bash
# Rollback last commit
git reset --hard HEAD~1

# Or rollback to specific commit
git reset --hard <commit-hash-before-changes>

# Push rollback to Railway
git push origin main --force
```

---

## Environment Variables to Remove

After cleanup, these can be removed from .env and Railway:

- `TYPEFORM_WEBHOOK_SECRET`
- `TYPEFORM_X_API_KEY`
- `ZAPIER_SHARED_KEY`

**Note:** `WEBHOOK_API_KEY` used as fallback may still be needed for GitHub

---

## Summary

**Total files to delete:** 4 (1 controller + 3 tests)
**Total files to modify:** 11 (3 middleware + 8 documentation)
**Active webhooks preserved:** GitHub
**Estimated time:** 30-45 minutes with testing
**Risk level:** Low (with staged approach)

---

**Created:** 2026-01-13
**Status:** Ready for execution
