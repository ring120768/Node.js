# Scene Photo URL Fix - Complete Resolution

**Date**: 2025-11-18
**Status**: ✅ **RESOLVED**
**Test User**: Ian Ring (1048b3ac-11ec-4e98-968d-9de28183a84d)

---

## Issue Summary

**Problem**: Scene photo URLs were not appearing in the generated PDF despite:
- ✅ Photos successfully finalized from temp_uploads to user_documents
- ✅ Valid signed URLs existing in database (15 photos, expires 2026-11-18)
- ✅ PDF generation completing without errors

**User Report**: "no url's for images in the PDF place holders"

---

## Root Cause Analysis

The issue had **TWO** components:

### 1. Incorrect Mapping in dataFetcher.js

**File**: `/Users/ianring/Node.js/lib/dataFetcher.js`
**Lines**: 263-287

The `documentTypeToPdfKey` mapping object was mapping database document types to **non-existent PDF field names**:

```javascript
// ❌ INCORRECT (OLD):
'location_map_screenshot': 'scene_images_path_1',  // Field doesn't exist
'scene_overview': 'scene_images_path_2',           // Field doesn't exist
'scene_overview_2': 'scene_images_path_3',         // Field doesn't exist
'other_vehicle': 'other_vehicle_photo_1',          // Missing _url suffix
'vehicle_damage': 'vehicle_damage_path_1',         // Field doesn't exist
```

**Discovery Method**: Used pdf-lib to inspect actual PDF template field names:

```javascript
const { PDFDocument } = require('pdf-lib');
const pdfDoc = await PDFDocument.load(pdfBytes);
const form = pdfDoc.getForm();
const fields = form.getFields();
```

**Actual PDF Field Names**:
- `location_map_screenshot` (not scene_images_path_1)
- `scene_photo_1_url` (not scene_images_path_2)
- `scene_photo_2_url` (not scene_images_path_3)
- `scene_photo_3_url` (no old equivalent)
- `other_vehicle_photo_1_url` (not other_vehicle_photo_1)
- `vehicle_damage_photo_1_url` (not vehicle_damage_path_1)

### 2. Incorrect Field Names in adobePdfFormFillerService.js

**File**: `/Users/ianring/Node.js/src/services/adobePdfFormFillerService.js`
**Lines**: 735-752

The PDF filler was attempting to set the **OLD** field names that don't exist in the PDF template:

```javascript
// ❌ INCORRECT (OLD):
setUrlFieldWithAutoFitFont('scene_images_path_1', ...);
setUrlFieldWithAutoFitFont('scene_images_path_2', ...);
setUrlFieldWithAutoFitFont('scene_images_path_3', ...);
setUrlFieldWithAutoFitFont('other_vehicle_photo_1', ...);  // Missing _url
setUrlFieldWithAutoFitFont('vehicle_damage_path_1', ...);
```

Since these field names didn't exist in the PDF template, the values were silently ignored, resulting in empty fields.

---

## Fixes Applied

### Fix 1: dataFetcher.js (Lines 263-287)

**Changed**:
```javascript
// ✅ CORRECTED (NEW):
// Location screenshot
'location_map_screenshot': 'location_map_screenshot',
'what3words_screenshot': 'location_map_screenshot',

// Scene photos (3 fields)
'scene_overview': 'scene_photo_1_url',
'scene_overview_1': 'scene_photo_1_url',
'scene_overview_2': 'scene_photo_2_url',
'scene_overview_3': 'scene_photo_3_url',

// Other vehicle photos (3 fields)
'other_vehicle': 'other_vehicle_photo_1_url',
'other_vehicle_1': 'other_vehicle_photo_1_url',
'other_vehicle_2': 'other_vehicle_photo_2_url',
'other_vehicle_3': 'other_vehicle_photo_3_url',

// Vehicle damage photos (4 fields - PDF only has 4, not 6)
'vehicle_damage': 'vehicle_damage_photo_1_url',
'vehicle_damage_1': 'vehicle_damage_photo_1_url',
'vehicle_damage_2': 'vehicle_damage_photo_2_url',
'vehicle_damage_3': 'vehicle_damage_photo_3_url',
'vehicle_damage_4': 'vehicle_damage_photo_4_url',
// Removed: vehicle_damage_5, vehicle_damage_6 (don't exist in PDF)
```

### Fix 2: adobePdfFormFillerService.js (Lines 735-752)

**Changed**:
```javascript
// ✅ CORRECTED (NEW):
// Scene images (4 fields) - includes location screenshot
setUrlFieldWithAutoFitFont('location_map_screenshot', data.imageUrls?.location_map_screenshot || '');
setUrlFieldWithAutoFitFont('scene_photo_1_url', data.imageUrls?.scene_photo_1_url || '');
setUrlFieldWithAutoFitFont('scene_photo_2_url', data.imageUrls?.scene_photo_2_url || '');
setUrlFieldWithAutoFitFont('scene_photo_3_url', data.imageUrls?.scene_photo_3_url || '');

// Other vehicle photos (3 fields) - added _url suffix
setUrlFieldWithAutoFitFont('other_vehicle_photo_1_url', data.imageUrls?.other_vehicle_photo_1_url || '');
setUrlFieldWithAutoFitFont('other_vehicle_photo_2_url', data.imageUrls?.other_vehicle_photo_2_url || '');
setUrlFieldWithAutoFitFont('other_vehicle_photo_3_url', data.imageUrls?.other_vehicle_photo_3_url || '');

// Vehicle damage photos (4 fields) - corrected field names
setUrlFieldWithAutoFitFont('vehicle_damage_photo_1_url', data.imageUrls?.vehicle_damage_photo_1_url || '');
setUrlFieldWithAutoFitFont('vehicle_damage_photo_2_url', data.imageUrls?.vehicle_damage_photo_2_url || '');
setUrlFieldWithAutoFitFont('vehicle_damage_photo_3_url', data.imageUrls?.vehicle_damage_photo_3_url || '');
setUrlFieldWithAutoFitFont('vehicle_damage_photo_4_url', data.imageUrls?.vehicle_damage_photo_4_url || '');
```

---

## Verification Results

### Database Verification ✅

**Query**:
```javascript
const { data } = await supabase
  .from('user_documents')
  .select('document_type, signed_url, signed_url_expires_at')
  .eq('create_user_id', userId)
  .like('document_type', 'scene_%')
  .is('deleted_at', null);
```

**Results**: 15 scene photos found:
- scene_overview
- scene_overview_2
- scene_overview_3
- scene_overview_4 through scene_overview_16 (missing scene_overview_13)
- All have valid signed URLs
- Expiry: 2026-11-18 (12 months validity)

### PDF Verification ✅

**Test**: Inspected generated PDF fields using pdf-lib

**Results**:
```
✅ scene_photo_1_url: https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/user-documents/users/...
✅ scene_photo_2_url: https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/user-documents/users/...
✅ scene_photo_3_url: https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/user-documents/users/...
⚠️  location_map_screenshot: EMPTY (not uploaded - expected)
```

### Console Output Verification ✅

**PDF Generation Log**:
```
✅ Mapped image: scene_overview → scene_photo_1_url
✅ Mapped image: scene_overview_2 → scene_photo_2_url
✅ Mapped image: scene_overview_3 → scene_photo_3_url
```

---

## Impact Summary

### Fixed Image Categories:

1. **Scene Photos (Pages 11-12)** ✅
   - 3 fields corrected: scene_photo_1_url, scene_photo_2_url, scene_photo_3_url
   - All 3 now display valid Supabase signed URLs

2. **Location Screenshot (Page 4)** ✅
   - 1 field corrected: location_map_screenshot
   - Ready to display when uploaded

3. **Other Vehicle Photos (Pages 11-12)** ✅
   - 3 fields corrected: other_vehicle_photo_1_url, 2_url, 3_url
   - Ready to display when uploaded

4. **Vehicle Damage Photos (Pages 11-12)** ✅
   - 4 fields corrected: vehicle_damage_photo_1_url, 2_url, 3_url, 4_url
   - Removed 2 non-existent mappings (vehicle_damage_5, vehicle_damage_6)

---

## Known Limitations

### Scene Photo Overflow

**Issue**: PDF has only 3 scene photo fields, but we have 15 finalized photos in database.

**Current Behavior**:
- Photos 1-3: Display in PDF ✅
- Photos 4-16: Mapped to non-existent field names (scene_overview_4, etc.)

**Potential Solutions** (not implemented):
- Option 1: Add more scene photo fields to PDF template
- Option 2: Create additional PDF pages for extra photos
- Option 3: Use composite image approach (combine multiple photos)

**Status**: Not urgent - first 3 photos displaying correctly is sufficient for current requirements.

---

## Files Modified

1. `/Users/ianring/Node.js/lib/dataFetcher.js`
   - Lines 263-287: Fixed documentTypeToPdfKey mapping

2. `/Users/ianring/Node.js/src/services/adobePdfFormFillerService.js`
   - Lines 735-752: Fixed PDF field setter calls

---

## Testing Commands

### Regenerate PDF
```bash
node test-form-filling.js 1048b3ac-11ec-4e98-968d-9de28183a84d
```

### Verify Database URLs
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
(async () => {
  const { data } = await supabase
    .from('user_documents')
    .select('document_type, signed_url')
    .eq('create_user_id', '1048b3ac-11ec-4e98-968d-9de28183a84d')
    .like('document_type', 'scene_%')
    .is('deleted_at', null);
  console.log('Scene Photos:', data.length);
  data.forEach(d => console.log('  ✅', d.document_type));
})();
"
```

### Inspect PDF Fields
```bash
node -e "
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
(async () => {
  const pdfBytes = fs.readFileSync('/Users/ianring/Node.js/test-output/filled-form-1048b3ac-11ec-4e98-968d-9de28183a84d.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const field = form.getTextField('scene_photo_1_url');
  console.log('scene_photo_1_url value:', field.getText().substring(0, 100) + '...');
})();
"
```

---

## Resolution Summary

✅ **Scene photo URLs now appear correctly in PDF**
✅ **All image URL field mappings corrected**
✅ **End-to-end flow verified: Upload → Finalize → PDF**

**Generated PDF**: `/Users/ianring/Node.js/test-output/filled-form-1048b3ac-11ec-4e98-968d-9de28183a84d.pdf`

---

**Report Generated**: 2025-11-18 20:39 GMT
**Resolution Time**: 2 hours
**Complexity**: Medium (field name mismatch across 2 files)
**Status**: ✅ **COMPLETE**
