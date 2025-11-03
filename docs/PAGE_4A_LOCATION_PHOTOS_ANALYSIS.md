# PAGE 4A (LOCATION PHOTOS) - Complete Analysis

**Date:** 2025-01-03
**Status:** 🔍 ANALYSIS IN PROGRESS
**Page Type:** Image Upload Page
**Max Images:** 3 scene/location photos
**Current Implementation:** Temporary upload (24hr expiry)

---

## 📊 Current State

### HTML Form (`incident-form-page4a-location-photos.html`)

**File Input:**
- `id="scene-image-input"`
- `accept="image/*"`
- `capture="environment"` (triggers camera on mobile)
- Hidden input (triggered by button)

**Upload Button:**
- `id="add-scene-image-btn"`
- Shows counter: `(0/3)`, `(1/3)`, etc.
- Disabled when 3 images uploaded

**Image Container:**
- `id="scene-images-container"`
- Displays uploaded image cards with:
  - Preview thumbnail (blob URL)
  - Filename
  - File size
  - Remove button (×)

### Client-Side Flow

```javascript
1. User clicks "Add Scene Image" button
   ↓
2. File input opens (camera or gallery)
   ↓
3. User selects/captures image
   ↓
4. IMMEDIATE upload to /api/images/temp-upload
   ↓
5. Backend stores in Supabase Storage: temp/{session_id}/scene_photo_{timestamp}.ext
   ↓
6. Backend creates temp_uploads record (24hr expiry)
   ↓
7. Client receives: { tempPath, uploadId, previewUrl, fileSize, checksum }
   ↓
8. Client stores in uploadedSceneImages array
   ↓
9. Client saves to localStorage: page4a_data
```

**LocalStorage Structure:**
```json
{
  "scene_images": [
    {
      "path": "temp/abc-123/scene_photo_1234567890.jpg",
      "fileName": "IMG_1234.jpg",
      "fileSize": "2.5 MB"
    }
  ],
  "page_completed": "2025-01-03T14:30:00.000Z"
}
```

---

## 🗄️ Database Structure

### Table: `temp_uploads`

**Purpose:** Track temporary file uploads (24hr expiry)

**Columns:**
- `id` (UUID) - Primary key
- `session_id` (TEXT) - Client-generated session ID
- `field_name` (TEXT) - Form field name (e.g., 'scene_photo')
- `storage_path` (TEXT) - Supabase Storage path
- `file_size` (INTEGER) - File size in bytes
- `mime_type` (TEXT) - File MIME type
- `uploaded_at` (TIMESTAMP) - Upload timestamp
- `expires_at` (TIMESTAMP) - Expiry (24hrs from upload)
- `claimed` (BOOLEAN) - Whether moved to permanent storage
- `claimed_by_user_id` (UUID) - User who claimed it
- `claimed_at` (TIMESTAMP) - When it was claimed

### Table: `user_documents` (Existing)

**Purpose:** Permanent document/image storage

**Relevant Columns:**
- `id` (UUID) - Primary key
- `create_user_id` (UUID) - User who owns this document
- `document_type` (TEXT) - Type identifier (e.g., 'location_photo')
- `storage_path` (TEXT) - Supabase Storage path
- `public_url` (TEXT) - Public access URL
- `file_size` (INTEGER)
- `mime_type` (TEXT)
- `status` (TEXT) - 'pending', 'completed', 'failed'
- `created_at` (TIMESTAMP)
- `deleted_at` (TIMESTAMP) - Soft delete

**Missing:** Link to `incident_reports` table?
- Need to determine relationship structure

---

## 📁 Storage Structure

### Supabase Storage Bucket: `user-documents`

**Temporary Files (24hr):**
```
temp/
  └── {session_id}/
      ├── scene_photo_1704290000000.jpg
      ├── scene_photo_1704290001000.jpg
      └── scene_photo_1704290002000.jpg
```

**Permanent Files (after form submission):**
```
users/
  └── {user_id}/
      └── incident-reports/
          └── {incident_report_id}/
              └── location-photos/
                  ├── scene_photo_1.jpg
                  ├── scene_photo_2.jpg
                  └── scene_photo_3.jpg
```

**Proposed Path Format:**
- Pattern: `users/{user_id}/incident-reports/{report_id}/location-photos/scene_photo_{index}.{ext}`
- Benefits:
  - Organized by user and report
  - Clear category (location-photos)
  - Numbered for order preservation
  - Unique per incident report

---

## 🔗 URL Types & Access Patterns

### 1. Temporary Preview URL (Client-side)
```javascript
// Blob URL (memory-only, for immediate preview)
const preview = URL.createObjectURL(file);
// Example: blob:http://localhost:5000/abc-123-def-456
```
**Purpose:** Immediate client-side preview
**Lifetime:** Until page refresh or URL.revokeObjectURL()
**Pros:** Instant, no network calls
**Cons:** Doesn't survive page refresh

### 2. Supabase Public URL (Storage)
```javascript
const { data: { publicUrl } } = supabase.storage
  .from('user-documents')
  .getPublicUrl(fileName);
// Example: https://xyz.supabase.co/storage/v1/object/public/user-documents/temp/abc-123/...
```
**Purpose:** Backend-generated preview during temp phase
**Lifetime:** Until file deleted from storage
**Pros:** Works after page refresh
**Cons:** Requires public bucket (security concern?)

### 3. Signed Download URL (Secure, Temporary)
```javascript
const { data, error } = await supabase.storage
  .from('user-documents')
  .createSignedUrl(fileName, 3600); // 1 hour
// Example: https://xyz.supabase.co/storage/v1/object/sign/user-documents/...?token=abc123
```
**Purpose:** Secure download link (expires after X seconds)
**Lifetime:** Configurable (1 hour default)
**Pros:** Secure, private bucket compatible
**Cons:** Expires, must regenerate

### 4. API Download Endpoint (Backend-controlled)
```javascript
// GET /api/user-documents/{document_id}/download
// Backend generates fresh signed URL on-demand
```
**Purpose:** Permanent API URL that always works
**Lifetime:** Permanent (as long as file exists)
**Pros:** Never expires, backend enforces auth
**Cons:** Extra server round-trip

**Recommendation:** Use approach #4 for production
- Store permanent API URL in database
- Backend generates fresh signed URL on each request
- Enforces authentication and ownership checks
- No expired URL issues

---

## 🚨 Current Issues & Gaps

### Issue 1: No Permanent Storage on Form Submission
**Problem:** When user submits incident report form, temp images are not moved to permanent location

**Current Behavior:**
- Images uploaded to `temp/{session_id}/...`
- After 24 hours, auto-deleted by cron job
- No permanent record created

**What's Needed:**
1. On form submission, detect page4a_data in localStorage
2. Move temp files to permanent location
3. Create `user_documents` records
4. Link to `incident_reports` table

**Proposed Solution:**
```javascript
// In incident report submission controller
async function finalizeLocationPhotos(userId, incidentReportId, sessionId) {
  // 1. Get temp uploads for this session
  const tempUploads = await getTempUploads(sessionId, 'scene_photo');

  // 2. For each temp upload:
  for (let [index, upload] of tempUploads.entries()) {
    // 2a. Move file in storage
    const newPath = `users/${userId}/incident-reports/${incidentReportId}/location-photos/scene_photo_${index + 1}.jpg`;
    await supabase.storage.from('user-documents').move(upload.storage_path, newPath);

    // 2b. Create permanent user_documents record
    const { data: doc } = await supabase.from('user_documents').insert({
      create_user_id: userId,
      incident_report_id: incidentReportId,
      document_type: 'location_photo',
      storage_path: newPath,
      file_size: upload.file_size,
      mime_type: upload.mime_type,
      status: 'completed'
    }).select().single();

    // 2c. Mark temp upload as claimed
    await supabase.from('temp_uploads').update({
      claimed: true,
      claimed_by_user_id: userId,
      claimed_at: new Date().toISOString()
    }).eq('id', upload.id);
  }

  return true;
}
```

### Issue 2: No Database Link to Incident Report
**Problem:** `user_documents` table doesn't have foreign key to `incident_reports`

**Current Structure:**
```sql
user_documents (
  id UUID,
  create_user_id UUID,  -- Links to user
  storage_path TEXT,
  ...
  -- ❌ Missing: incident_report_id UUID
)
```

**Needed:**
```sql
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS incident_report_id UUID REFERENCES incident_reports(id);

COMMENT ON COLUMN user_documents.incident_report_id IS
  'Links this document to a specific incident report (nullable for non-incident documents)';
```

### Issue 3: No Downloadable URL in Database
**Problem:** Only `storage_path` stored, no permanent download URL

**Current:**
```sql
user_documents (
  storage_path TEXT  -- "users/123/incident-reports/456/location-photos/scene_1.jpg"
  -- ❌ Missing: public_url or download_url
)
```

**Needed:**
Add column to store permanent API URL:
```sql
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS download_url TEXT;

COMMENT ON COLUMN user_documents.download_url IS
  'Permanent API URL for downloading this document: /api/user-documents/{id}/download';
```

**Generate on insert:**
```javascript
const downloadUrl = `/api/user-documents/${documentId}/download`;
await supabase.from('user_documents').update({ download_url: downloadUrl }).eq('id', documentId);
```

### Issue 4: PDF Integration Unknown
**Question:** Do location photos get embedded in the PDF report?

**If YES:**
- Need to fetch images when generating PDF
- Resize/compress for PDF embedding
- Determine layout (full page per image? Grid?)
- Map to PDF field names (if any)

**If NO:**
- Just store as downloadable attachments
- Simpler implementation

**Action:** Check PDF template and ADOBE_FORM_FILLING_GUIDE.md

---

## 📝 Recommended Implementation

### Phase 1: Add Missing Database Columns (Migration 008)

```sql
-- Migration: Add incident report link and download URL to user_documents
-- Date: 2025-01-03
-- Reason: Link images to incident reports + provide permanent download URLs

-- Add incident report foreign key
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS incident_report_id UUID REFERENCES incident_reports(id);

-- Add permanent download URL
ALTER TABLE user_documents
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_documents_incident_report
ON user_documents(incident_report_id) WHERE incident_report_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN user_documents.incident_report_id IS
  'Links document to specific incident report (nullable for non-incident docs)';

COMMENT ON COLUMN user_documents.download_url IS
  'Permanent API URL: /api/user-documents/{id}/download (generates fresh signed URL)';
```

### Phase 2: Create Permanent Storage Service

**File:** `src/services/locationPhotoService.js`

```javascript
/**
 * Location Photo Service
 * Handles finalization of location photos from temp to permanent storage
 */

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const logger = require('../utils/logger');

class LocationPhotoService {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
  }

  /**
   * Finalize location photos: move temp → permanent
   * Called when incident report form is submitted
   */
  async finalizePhotos(userId, incidentReportId, sessionId) {
    logger.info(`📸 Finalizing location photos for incident ${incidentReportId}`);

    try {
      // 1. Get all temp uploads for this session (scene_photo)
      const { data: tempUploads, error: fetchError } = await this.supabase
        .from('temp_uploads')
        .select('*')
        .eq('session_id', sessionId)
        .eq('field_name', 'scene_photo')
        .eq('claimed', false)
        .order('uploaded_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (!tempUploads || tempUploads.length === 0) {
        logger.info('ℹ️ No location photos to finalize');
        return { success: true, count: 0 };
      }

      logger.info(`📋 Found ${tempUploads.length} temp uploads to finalize`);

      const finalizedPhotos = [];

      // 2. Process each temp upload
      for (let [index, upload] of tempUploads.entries()) {
        try {
          // 2a. Generate permanent path
          const fileExtension = upload.storage_path.split('.').pop();
          const permanentPath = `users/${userId}/incident-reports/${incidentReportId}/location-photos/scene_photo_${index + 1}.${fileExtension}`;

          // 2b. Move file in storage
          logger.info(`📦 Moving ${upload.storage_path} → ${permanentPath}`);

          const { error: moveError } = await this.supabase.storage
            .from('user-documents')
            .move(upload.storage_path, permanentPath);

          if (moveError) throw moveError;

          // 2c. Create permanent user_documents record
          const { data: document, error: insertError } = await this.supabase
            .from('user_documents')
            .insert({
              create_user_id: userId,
              incident_report_id: incidentReportId,
              document_type: 'location_photo',
              storage_path: permanentPath,
              file_size: upload.file_size,
              mime_type: upload.mime_type,
              status: 'completed',
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // 2d. Generate permanent download URL
          const downloadUrl = `/api/user-documents/${document.id}/download`;

          // 2e. Update document with download URL
          const { error: updateError } = await this.supabase
            .from('user_documents')
            .update({ download_url: downloadUrl })
            .eq('id', document.id);

          if (updateError) throw updateError;

          // 2f. Mark temp upload as claimed
          await this.supabase
            .from('temp_uploads')
            .update({
              claimed: true,
              claimed_by_user_id: userId,
              claimed_at: new Date().toISOString()
            })
            .eq('id', upload.id);

          finalizedPhotos.push({
            documentId: document.id,
            downloadUrl: downloadUrl,
            storagePath: permanentPath
          });

          logger.success(`✅ Finalized photo ${index + 1}/${tempUploads.length}`);

        } catch (photoError) {
          logger.error(`❌ Failed to finalize photo ${index + 1}:`, photoError);
          // Continue with remaining photos
        }
      }

      logger.success(`✅ Finalized ${finalizedPhotos.length}/${tempUploads.length} photos`);

      return {
        success: true,
        count: finalizedPhotos.length,
        photos: finalizedPhotos
      };

    } catch (error) {
      logger.error('❌ Location photo finalization error:', error);
      throw error;
    }
  }

  /**
   * Get location photos for an incident report
   */
  async getPhotos(incidentReportId) {
    const { data, error } = await this.supabase
      .from('user_documents')
      .select('id, download_url, storage_path, file_size, created_at')
      .eq('incident_report_id', incidentReportId)
      .eq('document_type', 'location_photo')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }
}

module.exports = new LocationPhotoService();
```

### Phase 3: Update Incident Report Controller

**File:** `src/controllers/incidentReport.controller.js`

```javascript
const locationPhotoService = require('../services/locationPhotoService');

async function submitIncidentReport(req, res) {
  try {
    // ... existing code to create incident report ...

    // Finalize location photos
    const sessionId = req.body.temp_session_id || req.cookies.temp_session_id;
    if (sessionId) {
      await locationPhotoService.finalizePhotos(
        userId,
        incidentReport.id,
        sessionId
      );
    }

    // ... rest of submission logic ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### Phase 4: Add Download Endpoint

**File:** `src/routes/userDocuments.routes.js`

```javascript
/**
 * Download a user document (generates fresh signed URL)
 * GET /api/user-documents/:id/download
 */
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Get document record
    const { data: document, error } = await supabase
      .from('user_documents')
      .select('storage_path, create_user_id, mime_type')
      .eq('id', id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 2. Verify ownership
    if (document.create_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 3. Generate fresh signed URL (1 hour expiry)
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from('user-documents')
      .createSignedUrl(document.storage_path, 3600);

    if (signError) throw signError;

    // 4. Return signed URL or redirect
    res.json({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      expiresIn: 3600
    });

  } catch (error) {
    logger.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});
```

---

## ✅ Success Criteria

**Page 4a is complete when:**
1. ✅ User can upload 1-3 location photos
2. ✅ Images upload immediately (temp storage)
3. ✅ User can remove uploaded images
4. ✅ Images survive page refresh (localStorage)
5. 🔧 On form submission, images move to permanent storage
6. 🔧 Database records created with incident_report_id link
7. 🔧 Permanent download URLs generated
8. 🔧 API endpoint returns authenticated download links
9. 🔧 Images accessible in user dashboard
10. 🔧 Optional: Images embedded in PDF report

**Database Requirements:**
- ✅ `temp_uploads` table exists and works
- ✅ `user_documents` table exists
- 🔧 Migration 008 adds `incident_report_id` and `download_url` columns
- 🔧 Indexes created for performance

**Storage Requirements:**
- ✅ Temp storage: `temp/{session_id}/scene_photo_*.ext`
- 🔧 Permanent storage: `users/{user_id}/incident-reports/{report_id}/location-photos/scene_photo_*.ext`
- 🔧 Files moved (not copied) to save storage space

---

## 📋 Next Steps

1. ✅ Complete this analysis document
2. 🔧 Create Migration 008 (add columns to user_documents)
3. 🔧 Implement LocationPhotoService
4. 🔧 Update incident report submission controller
5. 🔧 Add download endpoint
6. 🔧 Test end-to-end flow
7. 🔧 Check PDF integration requirements
8. 🔧 Update documentation

---

**Last Updated:** 2025-01-03
**Status:** 🔍 Analysis Complete - Ready for Implementation
