# Complete Field List: Page 8 → Supabase

**File:** `public/incident-form-page8-other-damage-images.html`
**Page:** Other Damage & Document Images (Page 8 of 10)
**Destination Tables:** `incident_reports` (photos 1-2) + `user_documents` (photos 3-5) + `temp_uploads` (temporary)
**Total Fields:** 12 (1 HTML input + 11 JavaScript-generated/derived)
**⚠️ PARTIAL SUCCESS:** 75% mapped with field name mismatches

---

## Overview

Page 8 is a **photo-only page** for uploading images of OTHER vehicles, property damage, insurance documents, or any other relevant evidence from the incident. Unlike Page 6 (your own vehicle damage), this page collects documentation about OTHER parties involved.

**Key Characteristics:**
- **Optional:** 0-5 images (completely optional page)
- **No text input fields** - pure image upload
- **Slot-based field names:** Different names based on upload position
- **Split storage:** First 2 photos → incident_reports, Photos 3-5 → user_documents only
- **Immediate upload:** Mobile-friendly temp upload prevents file handle expiry
- **Session-based:** Uses temp_session_id shared across photo pages

**⚠️ Field Name Mismatch Issue:**
Frontend uses different field names than database expects for photos 1-2:
- Frontend: `other_vehicle_photo_1` / `other_vehicle_photo_2`
- Database: `file_url_other_vehicle` / `file_url_other_vehicle_1`

---

## Field Mapping Success Rate

| Category | Field Count | Mapped | Unmapped | Success Rate |
|----------|-------------|--------|----------|--------------|
| **Photo Upload (HTML)** | 1 | 1 ⚠️ | 0 | 100% |
| **Photo Slots (Derived)** | 5 | 5 ⚠️ | 0 | 100% |
| **System Fields** | 6 | 4 ✅ | 2 ❌ | 67% |
| **TOTAL** | **12** | **10** | **2** | **83%** |

**⚠️ Partial Mapping (⚠️):** 6 fields have complex slot-based routing
**❌ Not Mapped:** 2 display-only fields (formatted file size, blob URL)
**✅ Fully Mapped:** 4 system fields

### Storage Architecture

**Dual-Table Storage Pattern:**

| Slot | Field Name | incident_reports Column | user_documents | Purpose |
|------|-----------|-------------------------|----------------|---------|
| 0 | `other_vehicle_photo_1` | `file_url_other_vehicle` | ✅ Yes | Other vehicle 1 |
| 1 | `other_vehicle_photo_2` | `file_url_other_vehicle_1` | ✅ Yes | Other vehicle 2 |
| 2 | `other_damage_photo_3` | ❌ No | ✅ Yes | Additional damage |
| 3 | `other_damage_photo_4` | ❌ No | ✅ Yes | Additional damage |
| 4 | `other_damage_photo_5` | ❌ No | ✅ Yes | Additional damage |

**Why This Architecture:**
- **Typeform compatibility:** incident_reports has `file_url_other_vehicle` + `file_url_other_vehicle_1`
- **Typeform limitation:** Only 2 "other vehicle" photo fields
- **Custom form flexibility:** Can capture 5 photos total
- **Photos 3-5:** Stored in user_documents only (no incident_reports columns)

---

## Complete Field Inventory

### 1. Primary File Input (1 field - 100% success)

#### 1.1 Image File Input ⚠️ PARTIAL MAPPING

**HTML:**
```html
<input
  type="file"
  id="image-input"
  accept="image/*"
  capture="environment"
  style="display: none;"
>
```

**Frontend Field:** `image-input`
**Database:** Multiple columns (slot-dependent)
**Required:** No (0-5 images optional)
**Accepts:** `image/*` (any image format)
**Capture:** `environment` (prefer rear camera on mobile)
**Max Images:** 5
**Visibility:** Hidden (triggered by button click)

**Upload Trigger Logic (Lines 533-543):**
```javascript
// Add image button click
addImageBtn.addEventListener('click', () => {
  console.log('Add Image button clicked, current count:', uploadedImages.length);

  if (uploadedImages.length >= MAX_IMAGES) {
    alert(`Maximum ${MAX_IMAGES} images allowed`);
    return;
  }

  console.log('Opening file picker...');
  imageInput.click();
});
```

**Storage Strategy:**
- **Not stored directly** - File object uploaded immediately
- Creates temp upload via `/api/images/temp-upload`
- Temp path stored in `uploadedImages` array
- Array saved to localStorage for persistence

**Location:** Line 472

---

### 2. Photo Slots (5 fields - 100% success with mismatches)

Page 8 uses **slot-based field naming** where each upload position (0-4) has a specific field name that determines storage location.

#### 2.1 Slot 0: Other Vehicle Photo 1 ⚠️ PARTIAL MAPPING

**JavaScript Generated Field:** `other_vehicle_photo_1`
**Database Column:** `incident_reports.file_url_other_vehicle` (TEXT URL)
**Document Type:** `user_documents.document_type = 'other_vehicle_photo_1'`
**Required:** Conditional (if uploaded)
**Position:** First image uploaded

**⚠️ Field Name Mismatch:**
- Frontend: `other_vehicle_photo_1`
- Database: `file_url_other_vehicle`
- Typeform: `file_url_other_vehicle`

**Field Name Logic (Lines 545-558):**
```javascript
// Get field name based on slot number
function getFieldNameForSlot(slotIndex) {
  // Slot 0 (1st image) → other_vehicle_photo_1 (maps to file_url_other_vehicle)
  // Slot 1 (2nd image) → other_vehicle_photo_2 (maps to file_url_other_vehicle_1)
  // Slots 2-4 (images 3-5) → other_damage_photo_3/4/5 (user_documents only)
  const fieldNames = [
    'other_vehicle_photo_1',
    'other_vehicle_photo_2',
    'other_damage_photo_3',
    'other_damage_photo_4',
    'other_damage_photo_5'
  ];
  return fieldNames[slotIndex] || 'other_damage_photo';
}
```

**Upload (Lines 567-603):**
```javascript
// Determine field name based on current slot
const currentSlot = uploadedImages.length;
const fieldName = getFieldNameForSlot(currentSlot);
console.log(`📸 Uploading to slot ${currentSlot + 1}/5 with field_name: ${fieldName}`);

// Upload immediately to prevent mobile file handle expiration
const formData = new FormData();
formData.append('file', file);
formData.append('field_name', fieldName);  // Specific field name per slot
formData.append('temp_session_id', sessionStorage.getItem('temp_session_id') || crypto.randomUUID());

const response = await fetch('/api/images/temp-upload', {
  method: 'POST',
  body: formData,
  credentials: 'include'
});
```

**Display Label:**
```javascript
const fieldLabel = fieldName.includes('vehicle_photo')
  ? `🚗 Vehicle Photo ${fieldName.slice(-1)}`  // "🚗 Vehicle Photo 1"
  : `📄 Other Damage ${fieldName.slice(-1)}`;   // "📄 Other Damage 3"
```

**Location:** Slot 0 logic throughout lines 545-639

---

#### 2.2 Slot 1: Other Vehicle Photo 2 ⚠️ PARTIAL MAPPING

**JavaScript Generated Field:** `other_vehicle_photo_2`
**Database Column:** `incident_reports.file_url_other_vehicle_1` (TEXT URL)
**Document Type:** `user_documents.document_type = 'other_vehicle_photo_2'`
**Required:** Conditional (if uploaded)
**Position:** Second image uploaded

**⚠️ Field Name Mismatch:**
- Frontend: `other_vehicle_photo_2`
- Database: `file_url_other_vehicle_1`
- Typeform: `file_url_other_vehicle_1`

**Display Label:** `🚗 Vehicle Photo 2`

**Location:** Slot 1 logic throughout lines 545-639

---

#### 2.3 Slot 2: Other Damage Photo 3 ✅ MAPPED

**JavaScript Generated Field:** `other_damage_photo_3`
**Database Column:** ❌ NOT in incident_reports
**Document Type:** `user_documents.document_type = 'other_damage_photo_3'`
**Storage:** `user_documents.storage_path` only
**Required:** Conditional (if uploaded)
**Position:** Third image uploaded

**✅ No incident_reports mapping** - This is expected. Typeform only supports 2 other vehicle photos, so photo 3+ are user_documents only.

**Display Label:** `📄 Other Damage 3`

**Location:** Slot 2 logic throughout lines 545-639

---

#### 2.4 Slot 3: Other Damage Photo 4 ✅ MAPPED

**JavaScript Generated Field:** `other_damage_photo_4`
**Database Column:** ❌ NOT in incident_reports
**Document Type:** `user_documents.document_type = 'other_damage_photo_4'`
**Storage:** `user_documents.storage_path` only
**Required:** Conditional (if uploaded)
**Position:** Fourth image uploaded

**Display Label:** `📄 Other Damage 4`

**Location:** Slot 3 logic throughout lines 545-639

---

#### 2.5 Slot 4: Other Damage Photo 5 ✅ MAPPED

**JavaScript Generated Field:** `other_damage_photo_5`
**Database Column:** ❌ NOT in incident_reports
**Document Type:** `user_documents.document_type = 'other_damage_photo_5'`
**Storage:** `user_documents.storage_path` only
**Required:** Conditional (if uploaded)
**Position:** Fifth image uploaded

**Display Label:** `📄 Other Damage 5`

**Location:** Slot 4 logic throughout lines 545-639

---

### 3. System Fields (6 fields - 67% success)

#### 3.1 Temp Session ID ✅ MAPPED

**JavaScript Generated Field:** `temp_session_id`
**Database Table:** `temp_uploads`
**Database Column:** `temp_uploads.session_id` (UUID)
**Required:** Yes
**Type:** UUID
**Source:** `sessionStorage.getItem('temp_session_id')` or `crypto.randomUUID()`

**Purpose:** Track temporary uploads across all photo pages (4a, 6, 8)

**Initialization (Lines 775-778):**
```javascript
// Initialize session
window.addEventListener('DOMContentLoaded', () => {
  loadSavedData();

  // Ensure temp session ID exists
  if (!sessionStorage.getItem('temp_session_id')) {
    sessionStorage.setItem('temp_session_id', crypto.randomUUID());
  }
  console.log('Session ID:', sessionStorage.getItem('temp_session_id'));
});
```

**Shared Across Pages:**
- Page 4a (location photos)
- Page 6 (your vehicle damage)
- Page 8 (other damage/documents)

**Persistence:** Until browser tab closes (sessionStorage)

**Location:** Lines 577, 775-778

---

#### 3.2 Temp Storage Path ✅ MAPPED

**JavaScript Field:** `path`
**Database Table:** `temp_uploads`
**Database Column:** `temp_uploads.storage_path` (TEXT)
**Required:** Yes (per image)
**Type:** String
**Source:** Response from `/api/images/temp-upload`
**Format:** `temp/{session_id}/{timestamp}_{filename}`

**Received from Upload Response (Lines 590-591):**
```javascript
const result = await response.json();
console.log('✅ Image uploaded:', result.tempPath);
```

**Stored in uploadedImages Array (Lines 597-603):**
```javascript
const imageObj = {
  path: result.tempPath,  // "temp/session-uuid/12345_damage.jpg"
  blobUrl: blobUrl,
  fileName: file.name,
  fileSize: formatFileSize(file.size),
  fieldName: fieldName  // Store field name for this image
};

uploadedImages.push(imageObj);
```

**Used in Final Submission:** Path tells backend which temp file to move to permanent storage.

**Location:** Lines 590-603

---

#### 3.3 Original Filename ✅ MAPPED

**JavaScript Field:** `fileName`
**Database Table:** `user_documents`
**Database Column:** `user_documents.original_filename` (TEXT)
**Required:** Yes (per image)
**Type:** String
**Source:** `File.name` property
**Example:** `"other_vehicle_damage.jpg"`

**Extracted from File Object (Line 600):**
```javascript
fileName: file.name,
```

**Displayed in Image Card (Line 620):**
```javascript
<div class="image-card-name">${file.name}</div>
```

**Restored from localStorage (Line 740):**
```javascript
<div class="image-card-name">${imageObj.fileName}</div>
```

**Purpose:**
- Display in UI
- Store in database for reference
- Help identify image content

**Location:** Lines 600, 620, 740

---

#### 3.4 File Size (Formatted) ❌ NOT MAPPED

**JavaScript Field:** `fileSize`
**Database Column:** ❌ NOT STORED (display-only)
**Required:** Yes (per image)
**Type:** String (formatted)
**Source:** `File.size` property (bytes) → `formatFileSize()` function
**Format:** Human-readable (e.g., "1.2 MB", "856 KB", "45 B")

**⚠️ DATA LOSS:** Formatted size not stored in database.

**Note:** Raw file size in bytes IS stored in `user_documents.file_size` (INTEGER), but the formatted string is not.

**Formatting Function (Lines 692-696):**
```javascript
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

**Stored in uploadedImages (Line 601):**
```javascript
fileSize: formatFileSize(file.size),
```

**Displayed in Image Card (Line 621):**
```javascript
<div class="image-card-size">${imageObj.fileSize}</div>
```

**Purpose:** Display-only for user information

**Location:** Lines 601, 621, 692-696, 741

---

#### 3.5 Blob URL ❌ NOT MAPPED

**JavaScript Field:** `blobUrl`
**Database Column:** ❌ NOT STORED (client-side only)
**Required:** Yes (per image, client-side)
**Type:** String (Blob URL)
**Source:** `URL.createObjectURL(file)`
**Format:** `blob:http://localhost:3000/abc123-def456-...`
**Lifetime:** Until tab close or manual revoke

**⚠️ NOT STORED:** Blob URLs are temporary client-side references that don't persist.

**Created for Preview (Line 594):**
```javascript
// Create blob preview
const blobUrl = URL.createObjectURL(file);
```

**Used in Image Card (Line 618):**
```javascript
<img src="${blobUrl}" alt="${file.name}" class="image-card-thumbnail">
```

**Memory Cleanup (Lines 643-659):**
```javascript
// Remove image
function removeImage(index) {
  if (index < 0 || index >= uploadedImages.length) return;

  const imageObj = uploadedImages[index];

  // Revoke blob URL to free memory
  if (imageObj.blobUrl) {
    URL.revokeObjectURL(imageObj.blobUrl);
  }

  // Remove from array
  uploadedImages.splice(index, 1);

  // Re-render images
  renderImages();
  updateImageCount();
  autoSave();
}
```

**Note on Restoration (Lines 734-738):**
```javascript
// Show placeholder icon since blob URLs don't persist
card.innerHTML = `
  <div class="image-card-thumbnail" style="background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 2rem;">
    📷
  </div>
  ...
`;
```

**Why Blob URLs Don't Persist:**
Blob URLs are memory references that expire when:
- Page reloads
- Tab closes
- Manually revoked via `URL.revokeObjectURL()`

**Location:** Lines 594, 618, 643-659, 734-738

---

#### 3.6 Field Name (Per Image) ✅ MAPPED

**JavaScript Field:** `fieldName`
**Database Table:** `user_documents`
**Database Column:** `user_documents.document_type` (TEXT)
**Required:** Yes (per image)
**Type:** String
**Source:** `getFieldNameForSlot(slotIndex)`
**Values:**
- `"other_vehicle_photo_1"` (slot 0)
- `"other_vehicle_photo_2"` (slot 1)
- `"other_damage_photo_3"` (slot 2)
- `"other_damage_photo_4"` (slot 3)
- `"other_damage_photo_5"` (slot 4)

**Determined at Upload Time (Lines 568-570):**
```javascript
const currentSlot = uploadedImages.length;
const fieldName = getFieldNameForSlot(currentSlot);
console.log(`📸 Uploading to slot ${currentSlot + 1}/5 with field_name: ${fieldName}`);
```

**Sent to Backend (Line 576):**
```javascript
formData.append('field_name', fieldName);  // Specific field name per slot
```

**Stored in uploadedImages (Line 602):**
```javascript
fieldName: fieldName  // Store field name for this image
```

**Used for Display Label (Lines 612-615, 730-732):**
```javascript
// Create label based on field name
const fieldLabel = fieldName.includes('vehicle_photo')
  ? `🚗 Vehicle Photo ${fieldName.slice(-1)}`
  : `📄 Other Damage ${fieldName.slice(-1)}`;
```

**Saved to localStorage (Line 705):**
```javascript
other_damage_images: uploadedImages.map(img => ({
  path: img.path,
  fileName: img.fileName,
  fileSize: img.fileSize,
  fieldName: img.fieldName  // Save field name with each image
}))
```

**Purpose:**
- Tell backend which database column to use
- Determine storage routing (incident_reports vs user_documents only)
- Display appropriate label in UI

**Location:** Lines 568-570, 576, 602, 612-615, 705, 730-732

---

## Data Storage Architecture

### Primary Storage: localStorage

**Key:** `page8_data`
**Type:** JSON Object
**Persistence:** Until user clears browser data

**Structure:**
```javascript
{
  other_damage_images: [
    {
      path: "temp/abc-123-def-456/1699123456_other_vehicle.jpg",
      fileName: "other_vehicle.jpg",
      fileSize: "1.2 MB",
      fieldName: "other_vehicle_photo_1"  // Slot 0
    },
    {
      path: "temp/abc-123-def-456/1699123457_property_damage.jpg",
      fileName: "property_damage.jpg",
      fileSize: "856 KB",
      fieldName: "other_vehicle_photo_2"  // Slot 1
    },
    {
      path: "temp/abc-123-def-456/1699123458_insurance_doc.jpg",
      fileName: "insurance_doc.jpg",
      fileSize: "2.4 MB",
      fieldName: "other_damage_photo_3"  // Slot 2 (user_documents only)
    }
  ]
}
```

**Auto-Save Logic (Lines 699-711):**
```javascript
function autoSave() {
  const formData = {
    other_damage_images: uploadedImages.map(img => ({
      path: img.path,
      fileName: img.fileName,
      fileSize: img.fileSize,
      fieldName: img.fieldName  // Save field name with each image
    }))
  };

  localStorage.setItem('page8_data', JSON.stringify(formData));
  console.log('Page 8 data saved:', formData);
}
```

**Load Saved Data (Lines 714-758):**
```javascript
function loadSavedData() {
  const saved = localStorage.getItem('page8_data');
  if (saved) {
    const data = JSON.parse(saved);

    if (data.other_damage_images && Array.isArray(data.other_damage_images)) {
      uploadedImages = data.other_damage_images;

      // Re-display image cards (without blob preview)
      imagesContainer.innerHTML = '';
      uploadedImages.forEach((imageObj, index) => {
        // Create image card with placeholder icon
        // (blob URLs don't persist across page reloads)
      });

      updateImageCount();
    }
  }
}
```

---

### Secondary Storage: sessionStorage

**Key:** `temp_session_id`
**Type:** UUID String
**Persistence:** Until browser tab closes

**Purpose:** Track all temporary photo uploads across pages 4a, 6, and 8

**Shared Session ID Example:**
```javascript
// Page 4a creates session
sessionStorage.setItem('temp_session_id', crypto.randomUUID());
// -> "abc-123-def-456-ghi-789"

// Page 6 uses same session
const sessionId = sessionStorage.getItem('temp_session_id');
// -> "abc-123-def-456-ghi-789" (same)

// Page 8 uses same session
const sessionId = sessionStorage.getItem('temp_session_id');
// -> "abc-123-def-456-ghi-789" (same)
```

**All photos from all pages share this session ID, allowing backend to:**
- Group photos by submission
- Move all temp photos to permanent storage on form completion
- Clean up expired temp uploads (24hr TTL)

---

## Image Upload Workflow

### Step-by-Step Process

**1. User Clicks "Add Image" Button (Lines 533-543)**
```javascript
addImageBtn.addEventListener('click', () => {
  if (uploadedImages.length >= MAX_IMAGES) {
    alert(`Maximum ${MAX_IMAGES} images allowed`);
    return;
  }
  imageInput.click();  // Trigger hidden file input
});
```

**2. User Selects Image from Device (Lines 561-640)**
```javascript
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Determine slot-based field name
  const currentSlot = uploadedImages.length;
  const fieldName = getFieldNameForSlot(currentSlot);

  // Upload immediately to temp storage (prevents mobile file handle expiry)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('field_name', fieldName);
  formData.append('temp_session_id', sessionStorage.getItem('temp_session_id'));

  const response = await fetch('/api/images/temp-upload', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  const result = await response.json();
  // result = { tempPath, uploadId, previewUrl, fileSize, checksum }

  // Create blob preview for immediate display
  const blobUrl = URL.createObjectURL(file);

  // Store image object
  uploadedImages.push({
    path: result.tempPath,
    blobUrl: blobUrl,
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    fieldName: fieldName
  });

  // Display image card
  // ...

  autoSave();  // Save to localStorage
});
```

**3. Image Card Displayed (Lines 607-633)**
```html
<div class="image-card">
  <img src="blob:..." class="image-card-thumbnail">
  <div class="image-card-info">
    <div class="image-card-name">other_vehicle.jpg</div>
    <div class="image-card-size">1.2 MB</div>
    <div style="font-size: 0.75rem; color: var(--accent);">
      🚗 Vehicle Photo 1
    </div>
  </div>
  <button class="image-card-remove" data-index="0">×</button>
</div>
```

**4. Auto-Save to localStorage (Lines 699-711)**
```javascript
localStorage.setItem('page8_data', JSON.stringify({
  other_damage_images: [
    {
      path: "temp/session-id/file.jpg",
      fileName: "other_vehicle.jpg",
      fileSize: "1.2 MB",
      fieldName: "other_vehicle_photo_1"
    }
  ]
}));
```

**5. On Page Reload: Restore State (Lines 714-758)**
```javascript
const saved = localStorage.getItem('page8_data');
const data = JSON.parse(saved);
uploadedImages = data.other_damage_images;

// Re-display cards with placeholder icons
// (blob URLs don't persist)
```

**6. On Form Submission (Page 12): Finalize Photos**
Backend receives:
```javascript
{
  temp_session_id: "abc-123-...",
  other_damage_images: [
    {
      path: "temp/abc-123-.../file.jpg",
      fieldName: "other_vehicle_photo_1"
    }
  ]
}
```

Backend processes:
- Move `temp/session/file.jpg` → `users/{userId}/incident-reports/{reportId}/other-damage/file.jpg`
- Update `incident_reports.file_url_other_vehicle` = permanent URL (slot 0)
- Update `incident_reports.file_url_other_vehicle_1` = permanent URL (slot 1)
- Create `user_documents` records for all 5 slots
- Mark temp_uploads as claimed
- Generate download URLs: `/api/user-documents/{uuid}/download`

---

## Image Removal Logic

**User Clicks Remove Button (Lines 627-630, 643-689)**
```javascript
card.querySelector('.image-card-remove').addEventListener('click', (e) => {
  const idx = parseInt(e.target.dataset.index);
  removeImage(idx);
});

function removeImage(index) {
  if (index < 0 || index >= uploadedImages.length) return;

  const imageObj = uploadedImages[index];

  // Revoke blob URL to free memory
  if (imageObj.blobUrl) {
    URL.revokeObjectURL(imageObj.blobUrl);
  }

  // Remove from array
  uploadedImages.splice(index, 1);

  // Re-render all image cards
  // (Indexes shift after removal, so re-render everything)
  renderImages();
  updateImageCount();
  autoSave();
}

function renderImages() {
  imagesContainer.innerHTML = '';

  uploadedImages.forEach((imageObj, index) => {
    // Re-create each card with updated index
    const card = document.createElement('div');
    card.dataset.index = index;
    // ... create card HTML
    imagesContainer.appendChild(card);
  });
}
```

**Why Re-render Everything:**
When removing image at index 1:
- Before: [0, 1, 2, 3, 4]
- After:  [0, 2, 3, 4] → Need to become [0, 1, 2, 3]

All indexes shift, so all cards need updated `data-index` attributes.

---

## Navigation

### Back Button (Lines 761-764)

```javascript
document.getElementById('back-btn').addEventListener('click', () => {
  autoSave();
  window.location.href = '/incident-form-page7-other-vehicle.html';
});
```

**Destination:** Page 7 (Other Driver & Vehicle Details)

---

### Next Button (Lines 766-770)

```javascript
document.getElementById('next-btn').addEventListener('click', () => {
  autoSave();
  console.log('Next button clicked - proceeding to Page 9');
  window.location.href = '/incident-form-page9-witnesses.html';
});
```

**Destination:** Page 9 (Witnesses)
**Enabled:** Always (images are optional)
**Progress:** 80% (Page 8 of 10)

---

## Critical Issues & Recommendations

### 🚨 Issue 1: Field Name Mismatches (Slots 0-1)

**Problem:** Frontend uses `other_vehicle_photo_1/2` but database expects `file_url_other_vehicle/1`.

**Affected Fields:**
- Slot 0: `other_vehicle_photo_1` → `file_url_other_vehicle`
- Slot 1: `other_vehicle_photo_2` → `file_url_other_vehicle_1`

**Impact:** If backend doesn't translate field names, photos won't appear in incident_reports table.

**Solution Options:**

**Option A: Backend Translation (Recommended)**
```javascript
// Backend photo finalization service
function mapPhotoFieldName(frontendFieldName) {
  const mapping = {
    'other_vehicle_photo_1': 'file_url_other_vehicle',
    'other_vehicle_photo_2': 'file_url_other_vehicle_1',
    // Slots 2-4 don't map to incident_reports
  };
  return mapping[frontendFieldName] || null;
}

// When processing photo finalization
for (const photo of uploadedPhotos) {
  const incidentReportsColumn = mapPhotoFieldName(photo.fieldName);

  if (incidentReportsColumn) {
    // Update incident_reports with permanent URL
    await supabase
      .from('incident_reports')
      .update({ [incidentReportsColumn]: permanentUrl })
      .eq('id', incidentId);
  }

  // Always create user_documents record
  await supabase
    .from('user_documents')
    .insert({
      document_type: photo.fieldName,  // Keep original field name
      storage_path: permanentPath,
      public_url: permanentUrl,
      // ...
    });
}
```

**Option B: Frontend Rename (Not Recommended)**
```javascript
// Change field names to match database
const fieldNames = [
  'file_url_other_vehicle',      // Slot 0
  'file_url_other_vehicle_1',    // Slot 1
  'other_damage_photo_3',        // Slot 2
  'other_damage_photo_4',        // Slot 3
  'other_damage_photo_5'         // Slot 4
];
```

**Why Option A is Better:**
- Keeps frontend semantic names (`other_vehicle_photo_1` is clearer than `file_url_other_vehicle`)
- Backend already handles photo finalization
- Single point of translation
- No frontend changes needed

---

### 🚨 Issue 2: Dual-Table Storage Complexity

**Problem:** Photos 1-2 go to both tables, photos 3-5 only to user_documents.

**Current Architecture:**
```
Slot 0 → incident_reports.file_url_other_vehicle + user_documents
Slot 1 → incident_reports.file_url_other_vehicle_1 + user_documents
Slot 2 → user_documents only
Slot 3 → user_documents only
Slot 4 → user_documents only
```

**Why This Exists:**
- Typeform (legacy) only has 2 "other vehicle" fields
- incident_reports schema designed for Typeform
- Custom form allows 5 photos
- Extra photos stored in user_documents

**Impact:**
- Backend must know which slots map to incident_reports
- Frontend must use correct field names per slot
- PDF generation must check both tables

**Recommendation:** Long-term solution

**Option 1: Add More incident_reports Columns**
```sql
ALTER TABLE incident_reports
  ADD COLUMN file_url_other_vehicle_2 TEXT,
  ADD COLUMN file_url_other_vehicle_3 TEXT,
  ADD COLUMN file_url_other_vehicle_4 TEXT;
```

**Option 2: Use user_documents Only**
- Remove incident_reports.file_url_other_vehicle columns
- Store ALL photos in user_documents
- PDF generation queries user_documents only
- Simpler architecture

**Why Option 2 is Better:**
- Single source of truth
- Unlimited photos (not limited to 5)
- Consistent with Page 4a and Page 6 architecture
- Easier to maintain

**Migration Path:**
1. Create `user_documents` records for all existing photos
2. Update PDF generator to use `user_documents`
3. Deprecate incident_reports photo columns
4. Eventually remove columns

---

### 🚨 Issue 3: Blob URL Memory Leaks

**Problem:** Blob URLs created but not always revoked.

**Current Implementation:**
- Create: `URL.createObjectURL(file)` (Line 594)
- Revoke on remove: `URL.revokeObjectURL(blobUrl)` (Line 650)
- **Missing:** Revoke on page unload

**Impact:**
- Memory leaks if user navigates away without removing images
- Minor issue (browser garbage collects on tab close)
- Best practice to manually revoke

**Solution:**
```javascript
// Add cleanup on page unload
window.addEventListener('beforeunload', () => {
  uploadedImages.forEach(img => {
    if (img.blobUrl) {
      URL.revokeObjectURL(img.blobUrl);
    }
  });
});
```

**Location:** Add to lines 773-780 initialization block

---

### 🚨 Issue 4: No File Size Limit

**Problem:** No frontend validation for file size.

**Current Implementation:**
- Accepts any image size
- Backend may reject large files
- User doesn't know limit until upload fails

**Impact:**
- Poor UX when large files rejected
- Wasted bandwidth uploading 10MB+ photos
- No guidance for users

**Solution:**
```javascript
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Add size check (10MB limit)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    alert(`File too large (${formatFileSize(file.size)}). Maximum size: 10 MB`);
    return;
  }

  // Continue with upload...
});
```

**Recommended Limit:** 10MB (matches Supabase free tier)

---

### 🚨 Issue 5: No Image Compression

**Problem:** Large photos uploaded without compression.

**Current Implementation:**
- Upload original file as-is
- Mobile cameras: 4-8MB per photo
- 5 photos × 8MB = 40MB total

**Impact:**
- Slow uploads on mobile networks
- Wastes storage space
- Increases bandwidth costs

**Solution:** Client-side compression using Canvas API

```javascript
async function compressImage(file, maxWidth = 1920) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', 0.85);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Use before upload
const compressedFile = await compressImage(file);
formData.append('file', compressedFile);
```

**Benefits:**
- 4MB photo → ~500KB (87% reduction)
- Faster uploads
- Lower storage costs
- Better UX on slow networks

---

## Comparison with Other Photo Pages

### Page 4a: Location Photos

| Feature | Page 4a | Page 8 |
|---------|---------|--------|
| **Purpose** | Accident scene | Other damage |
| **Required** | Optional (0-3) | Optional (0-5) |
| **Max Photos** | 3 | 5 |
| **Field Name** | `scene_photo` | `other_vehicle_photo_1/2` + `other_damage_photo_3/4/5` |
| **Storage** | user_documents only | incident_reports (1-2) + user_documents (all) |
| **Slot-based** | No (all same field name) | Yes (different names per slot) |
| **Immediate Upload** | ✅ Yes | ✅ Yes |
| **Blob Preview** | ✅ Yes | ✅ Yes |
| **Memory Cleanup** | ✅ Yes | ✅ Yes |
| **localStorage** | ✅ Yes | ✅ Yes |

---

### Page 6: Your Vehicle Damage

| Feature | Page 6 | Page 8 |
|---------|---------|--------|
| **Purpose** | Your damage | Other damage |
| **Required** | Min 1 photo | Optional (0-5) |
| **Max Photos** | 5 | 5 |
| **Field Name** | `vehicle_damage_photo` | `other_vehicle_photo_1/2` + `other_damage_photo_3/4/5` |
| **Storage** | user_documents only | incident_reports (1-2) + user_documents (all) |
| **Slot-based** | No | Yes |
| **Tooltip** | ✅ Yes ("no damage = photo") | ❌ No (instructions in alert) |
| **Auto-save** | ✅ Every 5 seconds | ❌ On upload only |
| **Immediate Upload** | ✅ Yes | ✅ Yes |

---

## Testing Checklist

### Basic Functionality
- [ ] Page loads without errors
- [ ] Progress bar shows 80% (Page 8 of 10)
- [ ] Counter shows (0/5)
- [ ] Camera icon image displays
- [ ] Info alert displays instructions
- [ ] "Add Image" button visible and enabled
- [ ] Tooltip displays on hover

### Image Upload
- [ ] Click "Add Image" triggers file picker
- [ ] Select image from device
- [ ] Upload starts immediately
- [ ] Console shows: `📸 Uploading to slot 1/5 with field_name: other_vehicle_photo_1`
- [ ] Console shows: `✅ Image uploaded: temp/...`
- [ ] Image card appears with thumbnail
- [ ] Counter updates to (1/5)
- [ ] Field label shows correct icon/text
  - Slot 0: `🚗 Vehicle Photo 1`
  - Slot 1: `🚗 Vehicle Photo 2`
  - Slot 2: `📄 Other Damage 3`

### Multiple Images
- [ ] Upload 5 images sequentially
- [ ] Counter increments: (1/5) → (2/5) → ... → (5/5)
- [ ] Button disables at max capacity
- [ ] Alert shows "Maximum 5 images allowed" if click disabled button
- [ ] Each image has correct field label
- [ ] Each image has unique preview

### Image Removal
- [ ] Click remove (×) on image card
- [ ] Image removed from display
- [ ] Counter decrements
- [ ] Button re-enables (if was at max)
- [ ] Remaining images re-indexed correctly
- [ ] Remove middle image: indexes shift correctly
- [ ] Blob URL revoked (no memory leak)

### Data Persistence
- [ ] Upload 3 images
- [ ] Refresh page
- [ ] 3 image cards restored (with 📷 placeholder icons)
- [ ] Counter shows (3/5)
- [ ] Field names preserved
- [ ] File names preserved
- [ ] File sizes preserved

### Navigation
- [ ] Back button saves and returns to Page 7
- [ ] Next button always enabled (images optional)
- [ ] Next button saves and proceeds to Page 9
- [ ] Session ID persists across navigation

### Field Name Mapping
- [ ] Slot 0 → `other_vehicle_photo_1`
- [ ] Slot 1 → `other_vehicle_photo_2`
- [ ] Slot 2 → `other_damage_photo_3`
- [ ] Slot 3 → `other_damage_photo_4`
- [ ] Slot 4 → `other_damage_photo_5`
- [ ] Backend receives correct field_name parameter

### Temp Session Management
- [ ] Session ID created on first load
- [ ] Session ID persists across pages 4a, 6, 8
- [ ] All uploads use same session ID
- [ ] Session ID cleared on tab close

### Auto-Save
- [ ] localStorage updated after each upload
- [ ] localStorage updated after each removal
- [ ] Data structure matches expected format
- [ ] Array length matches counter

### Error Handling
- [ ] Upload fails gracefully with error message
- [ ] Large files (>10MB) rejected (if implemented)
- [ ] Network errors show alert
- [ ] Invalid file types rejected

### Browser Compatibility
- [ ] Works in Chrome/Edge
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome

### Mobile-Specific
- [ ] File picker shows camera option
- [ ] Camera capture works (if supported)
- [ ] Photo library selection works
- [ ] Upload doesn't fail with ERR_UPLOAD_FILE_CHANGED
- [ ] Thumbnails display correctly
- [ ] Remove buttons easy to tap (adequate size)

---

## Summary

**Total Fields:** 12
**Successfully Mapped:** 10 fields (83%)
**Partially Mapped (mismatch):** 6 fields (50%)
**Not Mapped (display-only):** 2 fields (17%)

### Success Rate Breakdown:
- **Photo Upload:** 100% (with field name mismatch)
- **Photo Slots:** 100% (with routing complexity)
- **System Fields:** 67% (2 display-only fields not stored)

### Critical Issues:
1. **Field Name Mismatches** - Slots 0-1 need translation
2. **Dual-Table Storage** - Complex routing based on slot
3. **Blob URL Memory Leaks** - Missing cleanup on page unload
4. **No File Size Limit** - Poor UX when large files rejected
5. **No Image Compression** - Wastes bandwidth and storage

### Recommendations:
1. **Immediate:** Implement field name translation in backend photo finalization
2. **Short-term:** Add file size validation (10MB limit)
3. **Short-term:** Add Blob URL cleanup on page unload
4. **Medium-term:** Implement client-side image compression
5. **Long-term:** Migrate to user_documents-only storage (remove incident_reports columns)

### Architecture Highlights:
- **Slot-based field naming** determines storage routing
- **Immediate upload** prevents mobile file handle expiry
- **Shared session ID** across all photo pages
- **localStorage persistence** for page refresh recovery
- **Blob URL previews** with memory cleanup
- **Optional photos** (0-5 range, next button always enabled)

### Comparison with Other Pages:
- **Page 2:** 95% mapping (medical info)
- **Page 3:** 54% mapping (accident details)
- **Page 4:** 46% mapping (location)
- **Page 4a:** 80% mapping (location photos) ⚠️
- **Page 5:** 97% mapping (vehicle details) ✅
- **Page 6:** 100% mapping (vehicle photos) ✅
- **Page 7:** 42% mapping (other vehicle) ⚠️
- **Page 8:** 83% mapping (other damage photos) ✅

**Page 8 has good mapping success** (83%) but requires backend field name translation for slots 0-1 to work correctly.

---

**Documentation Complete:** 2025-11-06
**Page Status:** Working with field name translation needed
**Next Steps:** Implement backend translation and add file size/compression

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
