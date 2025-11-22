# Debug Logging Status - Signup Upload Investigation

**Date:** 2025-11-16 08:55 GMT
**Status:** ✅ Debug logging ACTIVE + File structure fix deployed
**Verification:** ⏳ Awaiting new test signup

---

## What Was Done

### Fix #1: File Structure Standardization (08:49)
Modified `signup.controller.js` line 273 to use consistent nested path structure:
- Changed from: `{userId}/{filename}` (flat structure)
- Changed to: `users/{userId}/signup/{filename}` (nested structure)

### Fix #2: Debug Logging for Signed URLs (08:44)
Added comprehensive debug logging to track the complete signed URL generation flow from signup submission through database storage.

### Files Modified

1. **`src/controllers/signup.controller.js`** (Lines 292-368)
   - Added logging BEFORE signed URL generation
   - Added logging AFTER successful signed URL generation
   - Added logging BEFORE calling createDocumentRecord
   - Added logging AFTER createDocumentRecord completes

2. **`src/services/imageProcessorV2.js`** (Lines 102-178)
   - Added logging when createDocumentRecord is called (shows parameters received)
   - Added logging before database insert (shows document record object)
   - Added logging after database insert (shows what was stored in DB)

---

## What Debug Logs Will Show

When a new signup is submitted with images, the server logs will show:

### 📦 Step 1: File Movement
```
📦 Moving: temp/[session-id]/[filename] → [user-id]/[filename]
```

### 🔍 Step 2: Before Signed URL Generation
```
🔍 DEBUG: About to generate signed URL
{
  userId: '...',
  fieldName: 'driving_license_picture',
  permanentPath: '...',
  publicUrl: '...'
}
```

### ✅ Step 3: After Signed URL Success
```
✅ DEBUG: Signed URL generated successfully
{
  userId: '...',
  fieldName: 'driving_license_picture',
  signedUrl: 'https://...', (truncated to 100 chars)
  expiresAt: '2026-11-16T08:44:00.000Z',
  expirySeconds: 31536000
}
```

### 🔍 Step 4: Before createDocumentRecord Call
```
🔍 DEBUG: About to call createDocumentRecord with URL fields
{
  userId: '...',
  fieldName: 'driving_license_picture',
  public_url: 'PRESENT',
  signed_url: 'PRESENT',
  signed_url_expires_at: 'PRESENT',
  signedUrlLength: 250
}
```

### 🔍 Step 5: Inside createDocumentRecord
```
🔍 DEBUG: createDocumentRecord called with URL parameters
{
  userId: '...',
  documentType: 'driving_license_picture',
  status: 'completed',
  public_url: 'PRESENT',
  signed_url: 'PRESENT',
  signed_url_expires_at: 'PRESENT',
  signed_url_length: 250
}
```

### 🔍 Step 6: Before Database Insert
```
🔍 DEBUG: Document record object prepared for database insert
{
  userId: '...',
  documentType: 'driving_license_picture',
  hasPublicUrl: true,
  hasSignedUrl: true,
  hasSignedUrlExpiry: true
}
```

### ✅ Step 7: After Database Insert Success
```
✅ DEBUG: Document record created in database
{
  id: '...',
  documentType: 'driving_license_picture',
  status: 'completed',
  public_url_in_db: 'PRESENT',
  signed_url_in_db: 'PRESENT',
  signed_url_expires_at_in_db: 'PRESENT'
}
```

### ✅ Step 8: Final Confirmation
```
✅ DEBUG: createDocumentRecord completed
{
  userId: '...',
  fieldName: 'driving_license_picture',
  documentId: '...',
  recordCreated: true
}
```

---

## Expected Outcome

### ✅ If BOTH Fixes Are Working

**File Structure:**
- Storage path: `users/{userId}/signup/{filename}`
- NOT: `{userId}/{filename}` (old flat structure)

**Signed URLs:**
All logs should show:
- `public_url: 'PRESENT'` / `hasPublicUrl: true`
- `signed_url: 'PRESENT'` / `hasSignedUrl: true`
- `signed_url_expires_at: 'PRESENT'` / `hasSignedUrlExpiry: true`
- `signedUrlLength: ~250` (actual URL length)

Then verify with:
```bash
node verify-signup-fixes.js
```

Should show:
```
🗂️  FILE STRUCTURE:
   ✅ Correct (standardized): 5
   ❌ Incorrect (old/other): 0

🔒 SIGNED URL GENERATION:
   ✅ With signed_url: 5
   ❌ Without signed_url: 0
   ✅ With expiry: 5
   ❌ Without expiry: 0
```

Alternative check:
```bash
node check-user-images.js
```

### ❌ If Fix is NOT Working
Logs will reveal WHERE the issue occurs:
- If no logs appear → Code not being executed (conditional logic preventing it)
- If logs show `NULL` values → Values not being passed correctly
- If error logs appear → Specific failure reason shown
- If logs show `PRESENT` but database shows `NULL` → Database insert failing

---

## How to Test

1. **Complete a NEW signup** (fresh test, not the 14:06 one which used stale code)
2. **Monitor server logs** in real-time:
   ```bash
   # Server logs will show all debug output automatically
   # Look for 🔍 DEBUG and ✅ DEBUG messages
   ```
3. **Verify in database**:
   ```bash
   node check-user-images.js
   ```
4. **Expected result:** All 5 signup images should have signed URLs

---

## Timeline Context

**Previous test:** 15 Nov 14:06 (no signed URLs)
- Processed by STALE server code (before restarts)
- Multiple nodemon processes were running
- Code was present in files but server hadn't loaded it

**Current server:** 16 Nov 08:44 (PID 28365)
- Fresh restart with ALL debug logging loaded
- Clean single process
- Code verified present and loaded

**Next test:** TBD (will verify fix with fresh code)

---

## Previous Bug Context

### Original Problem
Direct signup uploads showed NULL values in database for:
- `signed_url`
- `signed_url_expires_at`
- `public_url`

### Code Fix Applied (15 Nov 12:46)
Added signed URL generation to `signup.controller.js`:
- Generate signed URL with 12-month expiry
- Pass URL fields to createDocumentRecord
- Store in all three database fields

### Why Debug Logging Added
To trace exactly why the URL fields aren't being populated, tracking the complete flow from URL generation through database storage.

---

## Next Steps

1. **Perform new test signup**
2. **Review debug logs** to see actual execution flow
3. **Check database** with check-user-images.js
4. **If URLs present:** Bug fixed ✅
5. **If URLs still NULL:** Debug logs will show exact failure point

---

**Status:** Ready for testing
**Action Required:** New signup test with fresh server code
