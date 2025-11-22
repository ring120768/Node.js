# Page 4, 5, 6 Updates - Complete ✅

## Overview

Successfully implemented all user-requested corrections to the incident report form pages:

1. **Page 5**: MOT/Tax data now from DVLA (only Insurance is BETA)
2. **Page 6**: Flexible "Add Image" button (max 5 images, no predefined categories)
3. **Page 4**: Same flexible image upload for scene photos

**Date:** 2025-10-29
**Status:** ✅ COMPLETE
**Environment:** localhost:3000 (development)

---

## User Requirements

### Original Request:
> "page 5.only insurance is in beta. All other fields are in DVLA. Page 6. needs to be open for images as you do not know which part the vehicle has been hit. So keep it simple, Single image then 'add image' for either documents or damage (other vehicles, property etc.) limit to max five images. we need to add this image feature to location as well."

### Requirements Breakdown:
1. ✅ Page 5: MOT and Tax from DVLA (not beta), only Insurance is beta
2. ✅ Page 6: Remove 6 predefined boxes, add flexible "Add Image" button (max 5)
3. ✅ Page 4: Add same image upload feature for scene photos

---

## Changes Made

### 1. Page 5: Vehicle Details - DVLA Integration ✅

**File:** `/public/incident-form-page5-vehicle.html`

**HTML Changes (Lines 588-622):**
- Removed BETA badge from "Vehicle Status" section title
- Added separate fields for MOT Expiry Date and Tax Due Date
- Only marked Insurance as BETA
- Updated info alert: "MOT and Tax data from DVLA. Insurance verification is not yet available via API."

**JavaScript Changes (Lines 698-721):**
```javascript
// Display MOT status from DVLA
const motStatus = document.getElementById('mot-status');
if (data.vehicle.motStatus) {
  motStatus.className = 'status-badge ' + (data.vehicle.motStatus.toLowerCase().includes('valid') ? 'valid' : 'invalid');
  motStatus.textContent = data.vehicle.motStatus;
}
if (data.vehicle.motExpiryDate) {
  document.getElementById('mot-expiry').textContent = data.vehicle.motExpiryDate;
}

// Display Tax status from DVLA
const taxStatus = document.getElementById('tax-status');
if (data.vehicle.taxStatus) {
  taxStatus.className = 'status-badge ' + (data.vehicle.taxStatus.toLowerCase().includes('tax') ? 'valid' : 'invalid');
  taxStatus.textContent = data.vehicle.taxStatus;
}
if (data.vehicle.taxDueDate) {
  document.getElementById('tax-due').textContent = data.vehicle.taxDueDate;
}
```

**Removed:**
- Entire `checkVehicleStatus()` function (no longer needed)

**Result:**
- MOT Status, MOT Expiry, Tax Status, Tax Due Date all from DVLA lookup
- Only Insurance shows as BETA (not available via API)

---

### 2. Page 6: Flexible Image Upload ✅

**File:** `/public/incident-form-page6-vehicle-images.html`

**HTML Changes (Lines 377-411):**
```html
<!-- Vehicle Images Upload -->
<div class="form-section">
  <div class="section-title">
    <span class="section-icon">📸</span>
    <span>Vehicle & Damage Photos</span>
  </div>

  <div class="alert alert-info">
    <span>ℹ️</span>
    <span>Upload photos of damage, other vehicles involved, property damage, or any relevant documentation. Maximum 5 images.</span>
  </div>

  <div class="form-group">
    <label class="form-label">
      Upload images
      <span class="required">*</span>
    </label>
    <p class="form-hint">At least one image is required. You can add up to 5 images.</p>

    <!-- Hidden file input -->
    <input type="file" id="image-input" accept="image/*" capture="environment" style="display: none;">

    <!-- Images Container -->
    <div id="images-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
      <!-- Uploaded images will appear here -->
    </div>

    <!-- Add Image Button -->
    <button type="button" id="add-image-btn" class="btn btn-secondary" style="width: 100%;">
      <span>📷</span>
      <span>Add Image</span>
      <span id="image-count">(0/5)</span>
    </button>
  </div>
</div>
```

**CSS Changes (Lines 192-256):**
- Removed `.upload-box` grid styles
- Added `.image-card` horizontal layout
- Added `.image-card-thumbnail` (80px square, 60px on mobile)
- Added `.image-card-info`, `.image-card-name`, `.image-card-size`
- Added `.image-card-remove` button with hover effects

**JavaScript Complete Rewrite (Lines 412-651):**
- Changed from object-based to array-based storage: `let uploadedImages = []`
- "Add Image" button triggers file input
- Uploads immediately to `/api/images/temp-upload`
- Displays preview with filename and size
- Remove button revokes URL and rebuilds array
- Counter updates: "(X/5)", disables button at max
- Form validation: requires ≥1 image (not 4 like before)

**Key Functions:**
```javascript
addImageBtn.addEventListener('click')      // Trigger file input
imageInput.addEventListener('change')      // Upload to backend
addImageCard(imageObj, index)              // Create card with preview
removeImage(index)                         // Remove and rebuild
updateImageCount()                         // Update "(X/5)" counter
validateForm()                             // Enable Next when ≥1 image
formatFileSize(bytes)                      // Convert to KB/MB
autoSave()                                 // Save to localStorage every 5s
```

**Result:**
- No predefined categories (front, rear, etc.)
- Users upload any damage/document photos as needed
- Maximum 5 images total
- Mobile-friendly immediate upload

---

### 3. Page 4: Scene Photo Upload ✅

**File:** `/public/incident-form-page4-preview.html`

**CSS Added (Lines 423-522):**
```css
/* Image Card Styles */
.image-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 2px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}

.image-card-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.image-card-info {
  flex: 1;
  min-width: 0;
}

.image-card-name {
  font-weight: 600;
  color: var(--text-dark);
  font-size: 0.938rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-card-size {
  font-size: 0.813rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.image-card-remove {
  width: 36px;
  height: 36px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  transition: all 0.2s;
}

.image-card-remove:hover {
  background: #dc2626;
  transform: scale(1.05);
}

/* Alert Messages */
.alert {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 0.875rem;
}

.alert-info {
  background: rgba(99, 102, 241, 0.1);
  color: #4338ca;
  border: 1px solid rgba(99, 102, 241, 0.2);
}
```

**HTML Section Added (Lines 806-839, before Navigation):**
```html
<!-- Scene/Location Photos Section -->
<div class="form-section">
  <div class="section-title">
    <span class="section-icon">📸</span>
    <span>Scene & Location Photos</span>
  </div>

  <div class="alert alert-info">
    <span>ℹ️</span>
    <span>Upload photos of the accident scene, road conditions, signage, or any relevant visual documentation. Maximum 5 images.</span>
  </div>

  <div class="form-group">
    <label class="form-label">
      Upload scene photos (optional)
    </label>
    <p class="form-hint">Add up to 5 images showing the location, road conditions, or relevant details.</p>

    <!-- Hidden file input -->
    <input type="file" id="scene-image-input" accept="image/*" capture="environment" style="display: none;">

    <!-- Images Container -->
    <div id="scene-images-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
      <!-- Uploaded images will appear here -->
    </div>

    <!-- Add Image Button -->
    <button type="button" id="add-scene-image-btn" class="btn btn-secondary" style="width: 100%;">
      <span>📷</span>
      <span>Add Scene Photo</span>
      <span id="scene-image-count">(0/5)</span>
    </button>
  </div>
</div>
```

**JavaScript Element Declarations (Lines 873-879):**
```javascript
// Scene Image Upload Elements
const sceneImageInput = document.getElementById('scene-image-input');
const addSceneImageBtn = document.getElementById('add-scene-image-btn');
const sceneImagesContainer = document.getElementById('scene-images-container');
const sceneImageCountSpan = document.getElementById('scene-image-count');
let uploadedSceneImages = [];
const MAX_SCENE_IMAGES = 5;
```

**JavaScript Upload Functions (Lines 1195-1339):**
- Complete scene image upload implementation
- Same pattern as Page 6 (flexible, max 5 images)
- Uploads to `/api/images/temp-upload`
- Creates image cards with preview
- Remove functionality with array rebuild
- Counter updates "(X/5)"

**Data Persistence Updated:**

**saveData() function (Lines 1008-1012):**
```javascript
scene_images: uploadedSceneImages.map(img => ({
  path: img.path,
  fileName: img.fileName,
  fileSize: img.fileSize
})),
```

**loadSavedData() function (Lines 977-1008):**
```javascript
// Restore scene images (without preview - show filename/size only)
if (data.scene_images && Array.isArray(data.scene_images)) {
  uploadedSceneImages = data.scene_images;

  // Rebuild image cards (without preview images - just show file info)
  sceneImagesContainer.innerHTML = '';
  uploadedSceneImages.forEach((imageObj, index) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.index = index;

    card.innerHTML = `
      <div class="image-card-thumbnail" style="background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 2rem;">
        📷
      </div>
      <div class="image-card-info">
        <div class="image-card-name">${imageObj.fileName}</div>
        <div class="image-card-size">${imageObj.fileSize}</div>
      </div>
      <button type="button" class="image-card-remove" data-index="${index}">×</button>
    `;

    card.querySelector('.image-card-remove').addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      removeSceneImage(idx);
    });

    sceneImagesContainer.appendChild(card);
  });

  updateSceneImageCount();
}
```

**Note:** When restoring from sessionStorage, we don't have the blob preview anymore, so we show a placeholder camera icon instead.

**Result:**
- Scene photos upload immediately when selected
- Saves to sessionStorage with page data
- Restores on page reload (shows filename/size, placeholder icon)
- Same flexible pattern as Page 6

---

## Technical Details

### Backend Integration

**Upload Endpoint:** `POST /api/images/temp-upload`
- Field name: `file` (multer configured with `.single('file')`)
- Max size: 10MB
- MIME types: image/*
- Response: `{ success: true, path: "/temp/session-id/filename.jpg" }`

**DVLA Endpoint:** `GET /api/dvla/lookup?registration=XXX`
- Returns: make, model, colour, yearOfManufacture, fuelType
- Returns: taxStatus, taxDueDate, motStatus, motExpiryDate
- Response: `{ success: true, vehicle: {...} }`

### Data Storage Patterns

**Page 5 (localStorage):**
```javascript
{
  usual_vehicle: "yes",
  license_plate: "AB12CDE",
  vehicle_data: {
    make: "VAUXHALL",
    model: "2017-06",
    colour: "WHITE",
    yearOfManufacture: "2017",
    fuelType: "PETROL",
    motStatus: "Valid",
    motExpiryDate: "2024-11-15",
    taxStatus: "Taxed",
    taxDueDate: "2024-12-01"
  }
}
```

**Page 6 (localStorage):**
```javascript
{
  uploaded_images: [
    {
      path: "/temp/session-id/image1.jpg",
      fileName: "IMG_1234.jpg",
      fileSize: "2.4 MB",
      preview: "blob:http://localhost:3000/..."
    },
    // ... up to 5 images
  ]
}
```

**Page 4 (sessionStorage):**
```javascript
{
  accident_location: "123 High Street, London",
  what3words: "index.home.raft",
  conditions: ["wet", "dark"],
  road_type: "residential",
  speed_limit: "30",
  junctions: [],
  special_conditions: ["roadworks"],
  special_conditions_details: "Temporary traffic lights",
  scene_images: [
    {
      path: "/temp/session-id/scene1.jpg",
      fileName: "IMG_5678.jpg",
      fileSize: "1.8 MB"
    },
    // ... up to 5 images
  ],
  page_completed: "2025-10-29T12:34:56.789Z"
}
```

---

## Manual Testing Checklist

### Page 5: Vehicle Details & DVLA

**URL:** http://localhost:3000/incident-form-page5-vehicle.html

- [ ] Page loads without errors
- [ ] Section title "Vehicle Status" has NO beta badge
- [ ] License plate input accepts text
- [ ] Look Up button triggers DVLA API call
- [ ] Vehicle details auto-populate (make, model, colour, year, fuel)
- [ ] MOT Status displays from DVLA
- [ ] MOT Expiry Date displays from DVLA
- [ ] Tax Status displays from DVLA
- [ ] Tax Due Date displays from DVLA
- [ ] Insurance Status shows "Not Available" with BETA badge
- [ ] Info alert says "MOT and Tax data from DVLA. Insurance verification is not yet available via API."
- [ ] Next button enables after successful lookup
- [ ] Data saves to localStorage
- [ ] Back button returns to Page 4
- [ ] Next button navigates to Page 6

### Page 6: Flexible Image Upload

**URL:** http://localhost:3000/incident-form-page6-vehicle-images.html

- [ ] Page loads without errors
- [ ] "Add Image" button visible
- [ ] Counter shows "(0/5)" initially
- [ ] NO predefined upload boxes (front, rear, etc.)
- [ ] Alert mentions "damage, other vehicles, property damage, documentation"
- [ ] Clicking "Add Image" opens file picker
- [ ] Selecting image uploads immediately
- [ ] Image card appears with thumbnail preview
- [ ] Image card shows filename and size
- [ ] Remove button (×) works
- [ ] Counter updates to "(1/5)", "(2/5)", etc.
- [ ] Button disables at 5 images
- [ ] Next button enables with ≥1 image
- [ ] Data saves to localStorage
- [ ] Back button returns to Page 5
- [ ] Next button navigates to Page 7

### Page 4: Scene Photo Upload

**URL:** http://localhost:3000/incident-form-page4-preview.html

- [ ] Page loads without errors
- [ ] "Scene & Location Photos" section visible
- [ ] Alert mentions "scene, road conditions, signage, documentation"
- [ ] "Add Scene Photo" button visible
- [ ] Counter shows "(0/5)" initially
- [ ] Clicking button opens file picker
- [ ] Selecting image uploads immediately
- [ ] Image card appears with thumbnail preview
- [ ] Image card shows filename and size
- [ ] Remove button (×) works
- [ ] Counter updates to "(1/5)", "(2/5)", etc.
- [ ] Button disables at 5 images
- [ ] Scene images optional (Next button works without images)
- [ ] Data saves to sessionStorage (includes scene_images array)
- [ ] On page reload, scene images restored (shows filename/size, placeholder icon)
- [ ] Back button returns to Page 3
- [ ] Next button navigates to Page 5

---

## URLs Verified

All three pages accessible on localhost:3000:

- **Page 4:** http://localhost:3000/incident-form-page4-preview.html
- **Page 5:** http://localhost:3000/incident-form-page5-vehicle.html
- **Page 6:** http://localhost:3000/incident-form-page6-vehicle-images.html

---

## Key Improvements

### User Experience:
1. **Flexibility:** No predefined damage locations - upload any relevant photos
2. **Clarity:** Clear data sources (DVLA vs beta)
3. **Consistency:** Same upload pattern across Pages 4 and 6
4. **Mobile-friendly:** Immediate upload prevents file handle expiry
5. **Visual feedback:** Counter shows progress "(X/5)"

### Technical:
1. **Simplified API calls:** Single DVLA endpoint for all vehicle data
2. **Array-based storage:** More flexible than object-based for dynamic uploads
3. **Memory management:** Proper URL.createObjectURL/revokeObjectURL usage
4. **Data persistence:** Scene images save/restore in sessionStorage
5. **Error handling:** Graceful fallbacks for upload failures

---

## Files Modified

1. ✅ `/public/incident-form-page5-vehicle.html` - DVLA integration, removed beta endpoint
2. ✅ `/public/incident-form-page6-vehicle-images.html` - Complete redesign with flexible upload
3. ✅ `/public/incident-form-page4-preview.html` - Added scene photo upload section

---

## Next Steps

1. **Manual Testing:** Use checklist above to verify all functionality
2. **Mobile Testing:** Test image upload on actual mobile device
3. **End-to-End Flow:** Test full flow Page 4 → Page 5 → Page 6 → Page 7
4. **Backend Verification:** Confirm temp uploads working correctly
5. **DVLA API Testing:** Test with real UK license plates

---

**Status:** ✅ ALL REQUIREMENTS COMPLETE

**User Requirements Met:**
1. ✅ Page 5: MOT/Tax from DVLA, only Insurance is beta
2. ✅ Page 6: Flexible image upload (no predefined categories, max 5)
3. ✅ Page 4: Same image upload feature for scene photos

**Last Updated:** 2025-10-29 (UTC)
**Environment:** localhost:3000 (development)
**Ready for:** User acceptance testing
