# Complete Image Field Reference - All 14 Photos

**Status**: ✅ Fully Implemented
**Date**: 2025-11-06
**Total Photos**: 14 (1 + 3 + 5 + 5)

---

## 📊 Master Image Field Table

### Page 4 - what3words Map Screenshot (1 photo)

| # | HTML Element | Frontend Capture | Backend field_name | Temp Storage Path | Permanent Storage Path | user_documents.document_type | incident_reports Column | PDF Field Name |
|---|--------------|------------------|--------------------|--------------------|------------------------|------------------------------|-------------------------|----------------|
| 1 | `#w3w-map` (canvas capture) | `html2canvas` | `map_screenshot` | `temp/{session_id}/map_screenshot_{timestamp}.png` | `users/{user_id}/incident-reports/{incident_id}/location-map/map_screenshot_1.png` | `location_map_screenshot` | ❌ None | `map_screenshot_captured` |

**HTML Element:**
```html
<!-- Interactive what3words map container -->
<div id="w3w-map" style="height: 400px; width: 100%;"></div>

<!-- Capture button -->
<button id="captureMapBtn" class="btn btn-secondary">
  📸 Capture Map Screenshot
</button>
```

**Frontend Capture Code:**
```javascript
// incident-form-page4.html lines 1101-1140
document.getElementById('captureMapBtn').addEventListener('click', async () => {
  const mapElement = document.getElementById('w3w-map');

  // Capture map using html2canvas
  const canvas = await html2canvas(mapElement, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  // Convert to blob
  const mapScreenshotBlob = await new Promise(resolve =>
    canvas.toBlob(resolve, 'image/png', 0.95)
  );

  // Upload to temp storage
  const formData = new FormData();
  formData.append('file', mapScreenshotBlob, `map-screenshot-${Date.now()}.png`);
  formData.append('field_name', 'map_screenshot');
  formData.append('temp_session_id', localStorage.getItem('temp_session_id'));

  const uploadResponse = await fetch('/api/images/temp-upload', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  if (uploadResponse.ok) {
    mapScreenshotCaptured = true;
    mapScreenshotStatus.innerHTML = '✅ Map screenshot saved to Supabase!';
  }
});
```

**Backend Finalization:**
```javascript
// src/controllers/incidentForm.controller.js lines 103-128
if (formData.page4?.session_id && formData.page4?.map_screenshot_captured) {
  const results = await locationPhotoService.finalizePhotosByType(
    userId,
    incident.id,
    formData.page4.session_id,
    'map_screenshot',              // field_name in temp_uploads
    'location-map',                // storage category
    'location_map_screenshot'      // document_type in user_documents
  );

  logger.info('Map screenshot finalized:', results);
}
```

**Supabase Tables:**
- ✅ `user_documents` - Map screenshot tracked here
- ❌ `incident_reports` - No column for map screenshot
- ✅ `temp_uploads` - Temporary tracking before final submission

**Key Implementation Details:**
- **NOT a file upload** - Captured via html2canvas library
- **Session tracking** - Uses same session_id as other uploads for linking
- **PDF field** - `map_screenshot_captured` (boolean flag in HTML, image URL in PDF)
- **Documentation** - See `docs/MAP_SCREENSHOT_SUPABASE_FIX.md` for complete implementation

---

### Page 4a - Scene/Location Photos (3 photos)

| # | HTML Input ID | HTML Input Name | Frontend Array | Backend field_name | Temp Storage Path | Permanent Storage Path | user_documents.document_type | incident_reports Column | PDF Field Name |
|---|---------------|-----------------|----------------|--------------------|--------------------|------------------------|------------------------------|-------------------------|----------------|
| 1 | `scene-image-input` | `scene-image-input` | `scene_images[0]` | `scene_photo` | `temp/{session_id}/scene_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/location-photos/scene_photo_1.jpg` | `location_photo` | ❌ None | `scene_image_path_1` |
| 2 | `scene-image-input` | `scene-image-input` | `scene_images[1]` | `scene_photo` | `temp/{session_id}/scene_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/location-photos/scene_photo_2.jpg` | `location_photo` | ❌ None | `scene_image_path_2` |
| 3 | `scene-image-input` | `scene-image-input` | `scene_images[2]` | `scene_photo` | `temp/{session_id}/scene_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/location-photos/scene_photo_3.jpg` | `location_photo` | ❌ None | `scene_image_path_3` |

**HTML Input:**
```html
<input type="file" id="scene-image-input" name="scene-image-input"
       accept="image/jpeg,image/png,image/heic,image/webp"
       multiple
       capture="environment">
```

**Frontend Upload Code:**
```javascript
// incident-form-page4a.html
const formData = new FormData();
formData.append('file', imageFile);
formData.append('field_name', 'scene_photo');
formData.append('session_id', sessionId);

await fetch('/api/images/temp-upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: formData
});
```

**Supabase Tables:**
- ✅ `user_documents` - All 3 photos tracked here
- ❌ `incident_reports` - No columns for scene photos
- ✅ `temp_uploads` - Temporary tracking before final submission

---

### Page 6 - Vehicle Damage Photos (5 photos)

| # | HTML Input ID | HTML Input Name | Frontend Array | Backend field_name | Temp Storage Path | Permanent Storage Path | user_documents.document_type | incident_reports Column | PDF Field Name |
|---|---------------|-----------------|----------------|--------------------|--------------------|------------------------|------------------------------|-------------------------|----------------|
| 1 | `image-input` | `image-input` | `uploaded_images[0]` | `vehicle_damage_photo` | `temp/{session_id}/vehicle_damage_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/vehicle-damage/vehicle_damage_photo_1.jpg` | `vehicle_damage_photo` | ❌ None | `vehicle_damage_path_1` |
| 2 | `image-input` | `image-input` | `uploaded_images[1]` | `vehicle_damage_photo` | `temp/{session_id}/vehicle_damage_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/vehicle-damage/vehicle_damage_photo_2.jpg` | `vehicle_damage_photo` | ❌ None | `vehicle_damage_path_2` |
| 3 | `image-input` | `image-input` | `uploaded_images[2]` | `vehicle_damage_photo` | `temp/{session_id}/vehicle_damage_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/vehicle-damage/vehicle_damage_photo_3.jpg` | `vehicle_damage_photo` | ❌ None | `vehicle_damage_path_3` |
| 4 | `image-input` | `image-input` | `uploaded_images[3]` | `vehicle_damage_photo` | `temp/{session_id}/vehicle_damage_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/vehicle-damage/vehicle_damage_photo_4.jpg` | `vehicle_damage_photo` | ❌ None | `vehicle_damage_path_4` |
| 5 | `image-input` | `image-input` | `uploaded_images[4]` | `vehicle_damage_photo` | `temp/{session_id}/vehicle_damage_photo_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/vehicle-damage/vehicle_damage_photo_5.jpg` | `vehicle_damage_photo` | ❌ None | `vehicle_damage_path_5` |

**HTML Input:**
```html
<input type="file" id="image-input" name="image-input"
       accept="image/jpeg,image/png,image/heic,image/webp"
       multiple
       capture="environment"
       required>
```

**Frontend Upload Code:**
```javascript
// incident-form-page6.html
const formData = new FormData();
formData.append('file', imageFile);
formData.append('field_name', 'vehicle_damage_photo');
formData.append('session_id', sessionId);

await fetch('/api/images/temp-upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: formData
});
```

**Supabase Tables:**
- ✅ `user_documents` - All 5 photos tracked here
- ❌ `incident_reports` - No columns for vehicle damage photos
- ✅ `temp_uploads` - Temporary tracking before final submission

---

### Page 8 - Other Vehicle/Damage Photos (5 photos)

| # | HTML Input ID | HTML Input Name | Frontend Array | Backend field_name | Temp Storage Path | Permanent Storage Path | user_documents.document_type | incident_reports Column | PDF Field Name |
|---|---------------|-----------------|----------------|--------------------|--------------------|------------------------|------------------------------|-------------------------|----------------|
| 1 | `image-input` | `image-input` | `other_damage_images[0]` | `other_vehicle_photo_1` | `temp/{session_id}/other_vehicle_photo_1_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/other-vehicle/other_vehicle_photo_1.jpg` | `other_vehicle_photo` | ✅ `file_url_other_vehicle` | `other_vehicle_photo_1` |
| 2 | `image-input` | `image-input` | `other_damage_images[1]` | `other_vehicle_photo_2` | `temp/{session_id}/other_vehicle_photo_2_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/other-vehicle/other_vehicle_photo_2.jpg` | `other_vehicle_photo` | ✅ `file_url_other_vehicle_1` | `other_vehicle_photo_2` |
| 3 | `image-input` | `image-input` | `other_damage_images[2]` | `other_damage_photo_3` | `temp/{session_id}/other_damage_photo_3_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/other-vehicle/other_damage_photo_3.jpg` | `other_vehicle_photo` | ❌ None | `other_damage_photo_3` |
| 4 | `image-input` | `image-input` | `other_damage_images[3]` | `other_damage_photo_4` | `temp/{session_id}/other_damage_photo_4_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/other-vehicle/other_damage_photo_4.jpg` | `other_vehicle_photo` | ❌ None | `other_damage_photo_4` |
| 5 | `image-input` | `image-input` | `other_damage_images[4]` | `other_damage_photo_5` | `temp/{session_id}/other_damage_photo_5_{timestamp}.jpg` | `users/{user_id}/incident-reports/{incident_id}/other-vehicle/other_damage_photo_5.jpg` | `other_vehicle_photo` | ❌ None | `other_damage_photo_5` |

**HTML Input:**
```html
<input type="file" id="image-input" name="image-input"
       accept="image/jpeg,image/png,image/heic,image/webp"
       multiple
       capture="environment">
```

**Frontend Upload Code:**
```javascript
// incident-form-page8.html
const formData = new FormData();
formData.append('file', imageFile);
formData.append('field_name', fieldName); // Dynamically: other_vehicle_photo_1, other_vehicle_photo_2, other_damage_photo_3, etc.
formData.append('session_id', sessionId);

await fetch('/api/images/temp-upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: formData
});
```

**Supabase Tables:**
- ✅ `user_documents` - All 5 photos tracked here
- ✅ `incident_reports` - Photos 1-2 ONLY (redundant copy for backward compatibility)
- ✅ `temp_uploads` - Temporary tracking before final submission

---

## 🗄️ Supabase Database Schema

### user_documents Table (Primary Source - ALL 14 Photos)

**Sample Record for Map Screenshot:**
```sql
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "create_user_id": "user_abc123",
  "incident_report_id": "incident_xyz789",
  "storage_path": "users/user_abc123/incident-reports/incident_xyz789/location-map/map_screenshot_1.png",
  "document_type": "location_map_screenshot",
  "download_url": "/api/user-documents/a1b2c3d4-e5f6-7890-abcd-ef1234567890/download",
  "status": "completed",
  "retry_count": 0,
  "created_at": "2025-11-06T10:30:00Z",
  "deleted_at": null
}
```

**Document Type Values:**
- `location_map_screenshot` - Page 4 map screenshot (1 record)
- `location_photo` - Page 4a scene photos (3 records)
- `vehicle_damage_photo` - Page 6 vehicle damage photos (5 records)
- `other_vehicle_photo` - Page 8 other vehicle/damage photos (5 records)

**Total Records**: 14 per incident report

---

### temp_uploads Table (Temporary 24-Hour Storage)

**Sample Record:**
```sql
{
  "id": "temp_123abc",
  "session_id": "sess_xyz789def",
  "field_name": "map_screenshot",
  "storage_path": "temp/sess_xyz789def/map_screenshot_1730896800000.png",
  "claimed": false,
  "created_at": "2025-11-06T10:00:00Z"
}
```

**Field Name Values:**
- `map_screenshot` - Page 4 map screenshot
- `scene_photo` - Page 4a uploads
- `vehicle_damage_photo` - Page 6 uploads
- `other_vehicle_photo_1` - Page 8 photo 1
- `other_vehicle_photo_2` - Page 8 photo 2
- `other_damage_photo_3` - Page 8 photo 3
- `other_damage_photo_4` - Page 8 photo 4
- `other_damage_photo_5` - Page 8 photo 5

**Lifecycle:**
1. Created when user uploads image (claimed = false)
2. Updated to claimed = true after permanent handler processes
3. Auto-deleted by cron job after 24 hours

---

### incident_reports Table (Quick Access - Page 8 Photos 1-2 ONLY)

**Columns (Migration 025):**
```sql
ALTER TABLE incident_reports
  ADD COLUMN file_url_other_vehicle TEXT DEFAULT NULL,
  ADD COLUMN file_url_other_vehicle_1 TEXT DEFAULT NULL;
```

**Sample Data:**
```sql
{
  "id": "incident_xyz789",
  "create_user_id": "user_abc123",
  "file_url_other_vehicle": "/api/user-documents/g7h8i9j0-k1l2-3456-mnop-qr7890123456/download",
  "file_url_other_vehicle_1": "/api/user-documents/m3n4o5p6-q7r8-9012-stuv-wx3456789012/download",
  ...other 160+ columns...
}
```

**Why Only 2 Photos?**
- Backward compatibility with existing code
- Quick access without JOIN queries
- Column limit concerns (incident_reports already has 160+ columns)
- Photos 3-5 accessible via user_documents table

---

## 📦 Supabase Storage Paths

### Temporary Storage (24 hours)

```
user-documents/
└── temp/
    └── {session_id}/
        ├── map_screenshot_1730896700000.png
        ├── scene_photo_1730896800000.jpg
        ├── scene_photo_1730896801000.jpg
        ├── scene_photo_1730896802000.jpg
        ├── vehicle_damage_photo_1730896900000.jpg
        ├── vehicle_damage_photo_1730896901000.jpg
        ├── vehicle_damage_photo_1730896902000.jpg
        ├── vehicle_damage_photo_1730896903000.jpg
        ├── vehicle_damage_photo_1730896904000.jpg
        ├── other_vehicle_photo_1_1730897000000.jpg
        ├── other_vehicle_photo_2_1730897001000.jpg
        ├── other_damage_photo_3_1730897002000.jpg
        ├── other_damage_photo_4_1730897003000.jpg
        └── other_damage_photo_5_1730897004000.jpg
```

### Permanent Storage

```
user-documents/
└── users/
    └── {user_id}/
        └── incident-reports/
            └── {incident_id}/
                ├── location-map/                       # Page 4 (1 file)
                │   └── map_screenshot_1.png
                │
                ├── location-photos/                    # Page 4a (3 files)
                │   ├── scene_photo_1.jpg
                │   ├── scene_photo_2.jpg
                │   └── scene_photo_3.jpg
                │
                ├── vehicle-damage/                     # Page 6 (5 files)
                │   ├── vehicle_damage_photo_1.jpg
                │   ├── vehicle_damage_photo_2.jpg
                │   ├── vehicle_damage_photo_3.jpg
                │   ├── vehicle_damage_photo_4.jpg
                │   └── vehicle_damage_photo_5.jpg
                │
                └── other-vehicle/                      # Page 8 (5 files)
                    ├── other_vehicle_photo_1.jpg       ← Also in incident_reports.file_url_other_vehicle
                    ├── other_vehicle_photo_2.jpg       ← Also in incident_reports.file_url_other_vehicle_1
                    ├── other_damage_photo_3.jpg        ← user_documents only
                    ├── other_damage_photo_4.jpg        ← user_documents only
                    └── other_damage_photo_5.jpg        ← user_documents only
```

---

## 🎯 PDF Field Mapping

### How Images Appear in Generated PDF

**Page 4 - Map Screenshot:**
```javascript
pdfFields['map_screenshot_captured'] = '/api/user-documents/{uuid}/download';
```

**Page 4a - Scene Photos:**
```javascript
pdfFields['scene_image_path_1'] = '/api/user-documents/{uuid}/download';
pdfFields['scene_image_path_2'] = '/api/user-documents/{uuid}/download';
pdfFields['scene_image_path_3'] = '/api/user-documents/{uuid}/download';
```

**Page 6 - Vehicle Damage:**
```javascript
pdfFields['vehicle_damage_path_1'] = '/api/user-documents/{uuid}/download';
pdfFields['vehicle_damage_path_2'] = '/api/user-documents/{uuid}/download';
pdfFields['vehicle_damage_path_3'] = '/api/user-documents/{uuid}/download';
pdfFields['vehicle_damage_path_4'] = '/api/user-documents/{uuid}/download';
pdfFields['vehicle_damage_path_5'] = '/api/user-documents/{uuid}/download';
```

**Page 8 - Other Vehicle/Damage:**
```javascript
pdfFields['other_vehicle_photo_1'] = '/api/user-documents/{uuid}/download';
pdfFields['other_vehicle_photo_2'] = '/api/user-documents/{uuid}/download';
pdfFields['other_damage_photo_3'] = '/api/user-documents/{uuid}/download';
pdfFields['other_damage_photo_4'] = '/api/user-documents/{uuid}/download';
pdfFields['other_damage_photo_5'] = '/api/user-documents/{uuid}/download';
```

**Key Points:**
- PDF fields contain clickable download URLs, NOT embedded images
- URLs are permanent (generate fresh signed URL on-demand)
- All 14 photos accessible via `/api/user-documents/{uuid}/download` endpoint
- Download endpoint requires authentication (checks user ownership)

---

## 🔄 Complete Data Flow Summary

### 1. Frontend HTML Forms

| Page | HTML File | Input ID / Element | Input Type | Max Files |
|------|-----------|-------------------|------------|-----------|
| 4 | `incident-form-page4.html` | `#w3w-map` | Canvas capture | 1 |
| 4a | `incident-form-page4a.html` | `scene-image-input` | `file` (multiple) | 3 |
| 6 | `incident-form-page6.html` | `image-input` | `file` (multiple, required) | 5 |
| 8 | `incident-form-page8.html` | `image-input` | `file` (multiple) | 5 |

### 2. Frontend JavaScript Arrays

| Page | Array Variable | Stored In | Data Structure |
|------|----------------|-----------|----------------|
| 4 | `mapScreenshotCaptured` | localStorage | Boolean flag |
| 4a | `scene_images[]` | localStorage | Array of image objects |
| 6 | `uploaded_images[]` | localStorage | Array of image objects |
| 8 | `other_damage_images[]` | localStorage | Array of image objects |

**Image Object Structure:**
```javascript
{
  path: '/api/images/temp/{uuid}',     // Temp upload path
  fileName: 'IMG_1234.jpg',            // Original filename
  fileSize: '2.3 MB',                  // Formatted size
  fieldName: 'scene_photo',            // Backend identifier
  blobUrl: 'blob:http://localhost...'  // Preview URL
}
```

### 3. Backend API Endpoint

**POST** `/api/images/temp-upload`

**Request:**
```javascript
FormData {
  file: File (image blob),
  field_name: 'map_screenshot' | 'scene_photo' | 'vehicle_damage_photo' | 'other_vehicle_photo_1' | etc.,
  session_id: 'sess_abc123def456' (UUID)
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Image uploaded successfully',
  data: {
    id: 'temp_uuid_123',
    storage_path: 'temp/sess_abc123def456/map_screenshot_1730896800000.png',
    field_name: 'map_screenshot',
    session_id: 'sess_abc123def456',
    created_at: '2025-11-06T10:00:00Z'
  }
}
```

### 4. Temporary Storage (Supabase)

**Storage Bucket:** `user-documents`
**Path:** `temp/{session_id}/{field_name}_{timestamp}.jpg`
**Table:** `temp_uploads` (tracks uploads)

### 5. Form Submission (Page 12)

**POST** `/api/incident-reports`

**Triggers:** `permanentUploadHandler()` (background job)

### 6. Permanent Upload Handler (Backend)

**Process:**
1. Query `temp_uploads` by session_id
2. For each temp file:
   - Move from `temp/` to permanent path
   - Create `user_documents` record
   - Update `incident_reports` (Page 8 photos 1-2 only)
   - Mark `temp_uploads.claimed = true`

### 7. Permanent Storage (Supabase)

**Storage Bucket:** `user-documents`
**Path:** `users/{user_id}/incident-reports/{incident_id}/{category}/{filename}`
**Table:** `user_documents` (14 records per incident)

### 8. PDF Generation

**Query:** `user_documents` by `incident_report_id`
**Map:** `document_type` → PDF field names
**Output:** 17-page PDF with clickable download URLs

---

## 📊 Quick Reference Cheat Sheet

### Field Name Patterns

| Page | HTML Input / Element | Backend field_name | PDF Field | Database Column |
|------|---------------------|--------------------|-----------|-----------------
| 4 | `#w3w-map` (canvas) | `map_screenshot` | `map_screenshot_captured` | user_documents.storage_path |
| 4a | `scene-image-input` | `scene_photo` | `scene_image_path_1-3` | user_documents.storage_path |
| 6 | `image-input` | `vehicle_damage_photo` | `vehicle_damage_path_1-5` | user_documents.storage_path |
| 8 (1-2) | `image-input` | `other_vehicle_photo_1-2` | `other_vehicle_photo_1-2` | incident_reports.file_url_other_vehicle{_1} + user_documents.storage_path |
| 8 (3-5) | `image-input` | `other_damage_photo_3-5` | `other_damage_photo_3-5` | user_documents.storage_path |

### Storage Path Patterns

| Category | Temp Path | Permanent Path |
|----------|-----------|----------------|
| Map Screenshot | `temp/{session}/map_screenshot_{ts}.png` | `users/{user}/incident-reports/{incident}/location-map/map_screenshot_1.png` |
| Scene Photos | `temp/{session}/scene_photo_{ts}.jpg` | `users/{user}/incident-reports/{incident}/location-photos/scene_photo_{n}.jpg` |
| Vehicle Damage | `temp/{session}/vehicle_damage_photo_{ts}.jpg` | `users/{user}/incident-reports/{incident}/vehicle-damage/vehicle_damage_photo_{n}.jpg` |
| Other Vehicle (1-2) | `temp/{session}/other_vehicle_photo_{n}_{ts}.jpg` | `users/{user}/incident-reports/{incident}/other-vehicle/other_vehicle_photo_{n}.jpg` |
| Other Damage (3-5) | `temp/{session}/other_damage_photo_{n}_{ts}.jpg` | `users/{user}/incident-reports/{incident}/other-vehicle/other_damage_photo_{n}.jpg` |

### Database Record Counts

| Table | Records per Incident | Purpose |
|-------|---------------------|---------|
| `user_documents` | 14 | Primary source of truth (all photos) |
| `temp_uploads` | 14 (temporary) | Temporary tracking (auto-deleted after 24h) |
| `incident_reports` | 2 URL columns | Quick access for Page 8 photos 1-2 only |

---

## ✅ Verification Queries

### Check All Photos for an Incident

```sql
-- Get all 14 photos from user_documents
SELECT
  id,
  document_type,
  storage_path,
  download_url,
  status,
  created_at
FROM user_documents
WHERE incident_report_id = '{incident_id}'
  AND deleted_at IS NULL
ORDER BY document_type, created_at;

-- Expected: 14 rows
-- 1 x location_map_screenshot
-- 3 x location_photo
-- 5 x vehicle_damage_photo
-- 5 x other_vehicle_photo
```

### Check Page 8 Photos in incident_reports

```sql
-- Get Page 8 redundant URLs from incident_reports
SELECT
  id,
  file_url_other_vehicle,
  file_url_other_vehicle_1
FROM incident_reports
WHERE id = '{incident_id}';

-- Expected: 1 row with 2 non-null URLs
```

### Check Temporary Uploads

```sql
-- Get temp uploads for a session (before claim)
SELECT
  id,
  field_name,
  storage_path,
  claimed,
  created_at
FROM temp_uploads
WHERE session_id = '{session_id}'
ORDER BY created_at;

-- Expected: 14 rows with claimed = false (before submission)
-- Expected: 14 rows with claimed = true (after submission)
```

---

## 🎯 Common Use Cases

### Get All Images for PDF Generation

```javascript
// lib/generators/pdfFieldMapper.js
const { data: documents } = await supabase
  .from('user_documents')
  .select('*')
  .eq('incident_report_id', incidentReportId)
  .eq('status', 'completed')
  .is('deleted_at', null)
  .order('created_at', { ascending: true });

// Map to PDF fields
const mapScreenshot = documents.find(d => d.document_type === 'location_map_screenshot');
const scenePhotos = documents.filter(d => d.document_type === 'location_photo');
const vehiclePhotos = documents.filter(d => d.document_type === 'vehicle_damage_photo');
const otherPhotos = documents.filter(d => d.document_type === 'other_vehicle_photo');

const pdfFields = {};
if (mapScreenshot) pdfFields['map_screenshot_captured'] = mapScreenshot.download_url;
scenePhotos.forEach((p, i) => pdfFields[`scene_image_path_${i+1}`] = p.download_url);
vehiclePhotos.forEach((p, i) => pdfFields[`vehicle_damage_path_${i+1}`] = p.download_url);
otherPhotos.slice(0,2).forEach((p, i) => pdfFields[`other_vehicle_photo_${i+1}`] = p.download_url);
otherPhotos.slice(2).forEach((p, i) => pdfFields[`other_damage_photo_${i+3}`] = p.download_url);
```

### Get Quick Access URLs (Page 8 Only)

```javascript
// Quick access without JOIN (Page 8 photos 1-2 only)
const { data: incident } = await supabase
  .from('incident_reports')
  .select('file_url_other_vehicle, file_url_other_vehicle_1')
  .eq('id', incidentReportId)
  .single();

console.log(incident.file_url_other_vehicle);   // Photo 1 URL
console.log(incident.file_url_other_vehicle_1); // Photo 2 URL
```

### Check Upload Status

```javascript
// Monitor upload processing status
const { data: photos } = await supabase
  .from('user_documents')
  .select('document_type, status, retry_count, error_category')
  .eq('incident_report_id', incidentReportId)
  .neq('status', 'completed');

// Any non-completed photos?
if (photos.length > 0) {
  console.warn('Some photos still processing:', photos);
}
```

---

**Last Updated**: 2025-11-06
**Total Images**: 14 (1 map screenshot + 3 scene + 5 vehicle damage + 5 other vehicle/damage)
**Primary Storage**: `user_documents` table (all 14)
**Redundant Storage**: `incident_reports` table (Page 8 photos 1-2 only)
**Temporary Storage**: `temp_uploads` table (24-hour lifecycle)
