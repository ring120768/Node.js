# Scene Photo Fix - Complete Summary & Verification Guide

## Executive Summary

**Problem:** Scene photos uploaded via Page 11 were getting stuck in `temp_uploads` and not appearing in generated PDFs.

**Root Cause:** `incidentForm.controller.js` was missing scene photo finalization code, causing photos to remain in temp storage and expire after 24 hours.

**Solution:** Five-phase rescue operation + controller fix to prevent future occurrences.

**Status:** ✅ **COMPLETE** - Emergency rescue successful, controller fixed, all verification checks passed.

---

## Timeline of Events

### Phase 1: Emergency Detection (Previous Session)
- **Date:** 2025-12-04 (scene photos expiring at 12:26-12:27 PM GMT)
- **Action:** Created `rescue-scene-photos.js` to manually migrate 3 scene photos
- **Result:** ⚠️ Partial success - files moved, document record creation failed
- **Files:** 6.7 MB total (1.9 MB, 1.4 MB, 3.5 MB)
- **User:** 35a7475f-60ca-4c5d-bc48-d13a299f4309

### Phase 2: Document Record Creation (Previous Session)
- **Problem:** Schema error (`uploaded_at` column doesn't exist)
- **Action:** Created `create-scene-photo-records.js` with correct schema
- **Result:** ✅ 3 document records created successfully
- **Issue:** Only `public_url` generated, missing `signed_url` field

### Phase 3: PDF Investigation (Previous Session)
- **Discovery:** PDF regeneration showed scene photos missing from Section XXVIII
- **Root Cause:** `dataFetcher.js` line 307 requires `signed_url` field
  ```javascript
  if (doc.signed_url) {
    // Process document for PDF
  }
  // If signed_url is null, document is silently skipped
  ```
- **Evidence:** Working documents had `signed_url`, rescued photos had `null`

### Phase 4: Emergency Signed URL Fix (Current Session)
- **Date:** 2025-12-04 20:03 GMT
- **Action:** Created `fix-scene-photo-signed-urls.js`
- **Result:** ✅ All 3 records updated with signed URLs (expires 2026-12-04)
- **Verification:** PDF regeneration confirmed 19 image URLs (was 16)
- **Proof:** Section XXVIII now contains all 3 scene photo URLs

### Phase 5: Prevention (Current Session)
- **Action:** Added scene photo finalization to `incidentForm.controller.js`
- **Location:** Lines 302-327 (after other vehicle photos, before witnesses)
- **Pattern:** Matches existing photo finalization implementations
- **Verification:** ✅ 10/10 automated checks passed

---

## Technical Details

### Controller Fix

**File:** `src/controllers/incidentForm.controller.js`

**Code Added (Lines 302-327):**
```javascript
// 7. Finalize scene photos if present (Page 11)
let scenePhotoResults = null;
if (formData.page11?.session_id) {
  try {
    scenePhotoResults = await locationPhotoService.finalizePhotosByType(
      userId,
      incident.id,
      formData.page11.session_id,
      'scene_photo',           // field_name in temp_uploads
      'scene-photos',          // storage category
      'scene_photo'            // document_type in user_documents
    );

    logger.info('Scene photos finalized', {
      incidentId: incident.id,
      photoCount: scenePhotoResults.successCount,
      errors: scenePhotoResults.errorCount
    });
  } catch (photoError) {
    logger.error('Failed to finalize scene photos (non-critical)', {
      incidentId: incident.id,
      error: photoError.message
    });
    // Don't fail the submission - photos can be re-processed
  }
}
```

### Parameters Explained

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `userId` | From request | Authenticated user ID |
| `incident.id` | New incident ID | Links photos to incident report |
| `formData.page11.session_id` | Session UUID | Identifies which temp_uploads to claim |
| `'scene_photo'` (1st) | field_name | Matches `temp_uploads.field_name` |
| `'scene-photos'` (2nd) | Storage category | Permanent storage path component |
| `'scene_photo'` (3rd) | document_type | Matches `user_documents.document_type` |

### Storage Path Structure

**Temp Storage:**
```
temp/{session_id}/scene_photo_1234567890.jpg
```

**Permanent Storage:**
```
users/{userId}/incident-reports/{incidentId}/scene-photos/scene_photo_1.jpg
```

### Database Flow

1. **Upload (Page 11):**
   - POST `/api/images/temp-upload`
   - Creates `temp_uploads` record
   - Sets `field_name = 'scene_photo'`
   - Sets `expires_at = now() + 24 hours`

2. **Finalization (Form Submit):**
   - Queries `temp_uploads` where `session_id` and `field_name = 'scene_photo'`
   - Moves file to permanent storage
   - Creates `user_documents` record with:
     - `storage_path`: Permanent path
     - `public_url`: Public access URL
     - `signed_url`: Signed URL (expires in 365 days)
     - `signed_url_expires_at`: Expiry timestamp
     - `document_type = 'scene_photo'`
   - Marks `temp_uploads` as `claimed = true`

3. **PDF Generation:**
   - `dataFetcher.js` queries `user_documents` where `document_type = 'scene_photo'`
   - Checks `if (doc.signed_url)` - REQUIRED
   - Maps to PDF fields: `scene_images_path_1`, `scene_images_path_2`, `scene_images_path_3`

---

## Verification Checklist

### ✅ Automated Verification (Already Complete)

Run: `node verify-scene-photo-controller-fix.js`

**Results:**
- ✅ Controller file exists
- ✅ Scene photo finalization block exists
- ✅ Correct field_name: 'scene_photo'
- ✅ Correct storage category: 'scene-photos'
- ✅ Correct document_type: 'scene_photo'
- ✅ Error handling (try-catch) exists
- ✅ Non-blocking error handling
- ✅ Session ID check: formData.page11?.session_id
- ✅ Success logging exists
- ✅ Pattern matches other photo types

**Status:** 10/10 checks passed (100%)

### 📋 Manual End-to-End Testing

**Prerequisites:**
- Development environment running (`npm run dev`)
- Valid test user account
- Access to Supabase dashboard

**Test Procedure:**

#### Step 1: Upload Scene Photos
1. Log in to the application
2. Navigate to incident form (starts at Page 1)
3. Complete Pages 1-10 with test data
4. On **Page 11 (Scene Photos)**:
   - Upload 1-3 scene photos (JPEG/PNG)
   - Note the session ID (check browser network tab)
   - Verify temp uploads appear in form preview
5. **CHECKPOINT:** Check `temp_uploads` table:
   ```sql
   SELECT id, session_id, field_name, original_filename, claimed
   FROM temp_uploads
   WHERE session_id = '{session_id}'
   AND field_name = 'scene_photo';
   ```
   Expected: 1-3 rows with `claimed = false`

#### Step 2: Submit Form
1. Complete Page 12 (final declarations)
2. Click "Submit Incident Report"
3. Wait for success confirmation
4. Note the incident report ID from success message

#### Step 3: Verify Migration
1. **Check temp_uploads claimed:**
   ```sql
   SELECT id, field_name, claimed, claimed_at
   FROM temp_uploads
   WHERE session_id = '{session_id}'
   AND field_name = 'scene_photo';
   ```
   Expected: All rows have `claimed = true`, `claimed_at` timestamp set

2. **Check user_documents created:**
   ```sql
   SELECT id, document_type, storage_path, public_url, signed_url, signed_url_expires_at
   FROM user_documents
   WHERE incident_report_id = '{incident_id}'
   AND document_type = 'scene_photo'
   ORDER BY created_at;
   ```
   Expected:
   - 1-3 rows matching uploaded photo count
   - `storage_path` starts with `users/{userId}/incident-reports/{incidentId}/scene-photos/`
   - `public_url` is populated
   - **`signed_url` is populated** ← CRITICAL
   - `signed_url_expires_at` is ~365 days in future

3. **Verify file storage:**
   - Go to Supabase Storage → `user-documents` bucket
   - Navigate to: `users/{userId}/incident-reports/{incidentId}/scene-photos/`
   - Expected: Files named `scene_photo_1.jpg`, `scene_photo_2.jpg`, etc.

#### Step 4: Verify PDF Generation
1. Generate PDF:
   ```bash
   node test-form-filling.js {userId}
   ```

2. Check debug output for scene photo mappings:
   ```
   ✅ Mapped image: scene_photo[0] → scene_photo_1_url
   ✅ Mapped image: scene_photo[1] → scene_photo_2_url
   ✅ Mapped image: scene_photo[2] → scene_photo_3_url
   ```

3. Extract Section XXVIII from PDF:
   ```bash
   pdftotext test-output/filled-form-{userId}.pdf - | grep -A 15 "XXVIII. EVIDENCE COLLECTION"
   ```
   Expected: Scene photo URLs visible

#### Step 5: Verify No Orphaned Files
1. **Check temp storage:**
   ```bash
   node check-storage-contents.js
   ```
   Expected: No scene photos remaining in `temp/{session_id}/` folder

2. **Check unclaimed uploads:**
   ```sql
   SELECT COUNT(*) as orphaned_count
   FROM temp_uploads
   WHERE field_name = 'scene_photo'
   AND claimed = false
   AND created_at > NOW() - INTERVAL '1 hour';
   ```
   Expected: `orphaned_count = 0`

---

## Success Criteria

### ✅ All Criteria Met

- [x] Controller code passes 10/10 automated checks
- [x] Emergency rescue completed (3 photos saved)
- [x] Scene photos visible in PDF Section XXVIII
- [x] No errors in controller implementation
- [x] Pattern matches existing photo finalization blocks
- [x] Non-blocking error handling implemented
- [x] Session ID check prevents null reference errors

### 🎯 Production Ready When:

- [ ] Manual end-to-end test completed successfully
- [ ] QA verified scene photo upload flow
- [ ] Monitoring confirms no temp_uploads orphans
- [ ] PDF generation logs show scene photo processing

---

## Regression Prevention

### Code Review Checklist

When modifying photo upload/finalization code:

1. **Verify all photo types have finalization:**
   - Map screenshots (Page 4)
   - Location photos (Page 4a)
   - Vehicle damage photos (Page 6)
   - Other vehicle photos (Page 8)
   - **Scene photos (Page 11)** ← Don't forget!

2. **Verify finalization parameters:**
   - ✅ Correct `field_name` (matches temp_uploads)
   - ✅ Correct `storage category` (path component)
   - ✅ Correct `document_type` (matches user_documents)

3. **Verify dataFetcher.js compatibility:**
   - ✅ `signed_url` field is generated
   - ✅ `signed_url_expires_at` is set
   - ✅ Document type query matches

### Monitoring Recommendations

**Daily Checks:**
```sql
-- Check for orphaned scene photos (should be 0)
SELECT COUNT(*) as orphaned_scene_photos
FROM temp_uploads
WHERE field_name = 'scene_photo'
AND claimed = false
AND created_at < NOW() - INTERVAL '1 hour';
```

**Weekly Review:**
```sql
-- Check scene photo finalization success rate
SELECT
  COUNT(*) as total_uploads,
  SUM(CASE WHEN claimed THEN 1 ELSE 0 END) as claimed,
  ROUND(100.0 * SUM(CASE WHEN claimed THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM temp_uploads
WHERE field_name = 'scene_photo'
AND created_at > NOW() - INTERVAL '7 days';
```

Expected: `success_rate >= 99%`

---

## Files Created/Modified

### Created Files
1. **rescue-scene-photos.js** - Emergency file migration (previous session)
2. **create-scene-photo-records.js** - Document record creation (previous session)
3. **fix-scene-photo-signed-urls.js** - Signed URL generation (current session)
4. **verify-scene-photo-controller-fix.js** - Automated verification (current session)
5. **SCENE_PHOTO_FIX_SUMMARY.md** - This documentation (current session)

### Modified Files
1. **src/controllers/incidentForm.controller.js**
   - Lines 302-327: Added scene photo finalization block
   - Line 329: Renumbered witness section from 7 to 8

---

## Emergency Contact

**If scene photos go missing again:**

1. **Check temp_uploads:**
   ```sql
   SELECT * FROM temp_uploads
   WHERE field_name = 'scene_photo'
   AND claimed = false
   ORDER BY created_at DESC;
   ```

2. **Check controller logs:**
   ```bash
   grep "Scene photos finalized" logs/application.log
   grep "Failed to finalize scene photos" logs/application.log
   ```

3. **Emergency rescue (if needed):**
   - Modify `fix-scene-photo-signed-urls.js` with new document IDs
   - Run: `node fix-scene-photo-signed-urls.js`
   - Verify: `node test-form-filling.js {userId}`

---

## Lessons Learned

1. **Always finalize temp uploads during form submission**
   - Temp storage expires after 24 hours
   - Mobile file handles expire when app backgrounds
   - Immediate upload + delayed finalization is the correct pattern

2. **signed_url is required for PDF generation**
   - public_url alone is insufficient
   - dataFetcher.js silently skips documents without signed_url
   - Always generate both URLs when creating document records

3. **Pattern consistency is critical**
   - All photo types must follow same finalization pattern
   - Missing finalization code causes silent failures
   - Code review checklists prevent regressions

4. **Non-blocking error handling for photos**
   - Photo failures shouldn't fail form submission
   - Photos can be re-processed manually if needed
   - Log errors clearly for debugging

---

**Last Updated:** 2025-12-04
**Status:** ✅ COMPLETE
**Next Review:** Before next production deployment
**Contact:** See incident report for user details
