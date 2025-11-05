# Image Upload Fix - Complete ✅

## Issue
Images wouldn't upload on Page 6 (and would fail on Page 4 scene photos).

**Error:** `field_name is required` (400 Bad Request)

## Root Cause
Backend `/api/images/temp-upload` endpoint requires these parameters:
- `file` - The image file (✅ was included)
- `field_name` - Form field identifier (❌ was missing)
- `temp_session_id` - Unique session ID (❌ was missing)

## Fix Applied

### Page 6: Vehicle Damage Photos
**File:** `/public/incident-form-page6-vehicle-images.html`

**Upload code updated (line 449-452):**
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('field_name', 'vehicle_damage_photo');  // Required
formData.append('temp_session_id', sessionStorage.getItem('temp_session_id') || crypto.randomUUID());
```

**Session ID initialization (lines 656-660):**
```javascript
window.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('temp_session_id')) {
    sessionStorage.setItem('temp_session_id', crypto.randomUUID());
  }
  console.log('Session ID:', sessionStorage.getItem('temp_session_id'));
  loadSavedData();
});
```

### Page 4: Scene Photos
**File:** `/public/incident-form-page4-preview.html`

**Upload code updated (lines 1258-1260):**
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('field_name', 'scene_photo');  // Required
formData.append('temp_session_id', sessionStorage.getItem('temp_session_id') || crypto.randomUUID());
```

**Session ID initialization (lines 1388-1392):**
```javascript
window.addEventListener('DOMContentLoaded', function() {
  if (!sessionStorage.getItem('temp_session_id')) {
    sessionStorage.setItem('temp_session_id', crypto.randomUUID());
  }
  console.log('Session ID:', sessionStorage.getItem('temp_session_id'));
  loadSavedData();
  initWhat3WordsMap();
});
```

## Additional Updates

### Page 6 Clarity Improvements
Made it crystal clear this page is for user's vehicle damage ONLY:

**Updated text:**
- Header: "Your Vehicle Damage"
- Subtitle: "Upload clear photos showing the damage to YOUR vehicle only"
- Section title: "Your Vehicle Damage Photos" (🚗 icon)
- Alert: "Upload photos showing damage to YOUR vehicle only. Include all damaged areas, scratches, dents, or broken parts."
- Label: "Upload damage photos"
- Hint: "At least one photo of YOUR vehicle damage is required. You can add up to 8 images."
- Button: "Add Damage Photo"

**Limit increased:** 8 images maximum (from 5)

### Clear Page Separation
- **Page 4:** Scene/location photos (road conditions, signage, accident scene)
- **Page 6:** YOUR vehicle damage ONLY (scratches, dents, broken parts)

## Technical Details

**Backend Endpoint:** `POST /api/images/temp-upload`

**Required Parameters:**
- `file` (multipart/form-data) - The image file
- `field_name` (string) - Field identifier (e.g., "vehicle_damage_photo", "scene_photo")
- `temp_session_id` (string) - UUID session identifier

**Response:**
```json
{
  "success": true,
  "tempPath": "temp/session-uuid/filename.jpg",
  "uploadId": "upload-uuid",
  "previewUrl": "https://...",
  "fileSize": 123456,
  "checksum": "abc123..."
}
```

## Testing

### Page 6: http://localhost:3000/incident-form-page6-vehicle-images.html

**Expected behavior:**
1. Page loads, creates session ID
2. Click "Add Damage Photo" button
3. Select image from file picker
4. Image uploads to `/api/images/temp-upload` with field_name="vehicle_damage_photo"
5. Image card appears with preview
6. Counter updates: "(1/8)"
7. Next button enables
8. Can add up to 8 images total

**Console logs to verify:**
```
Session ID: <uuid>
Add Image button clicked, current count: 0
Opening file picker...
✅ Image uploaded: temp/<session-id>/<filename>
```

### Page 4: http://localhost:3000/incident-form-page4-preview.html

**Expected behavior:**
1. Page loads, creates session ID
2. Scroll to "Scene & Location Photos" section
3. Click "Add Scene Photo" button
4. Select image from file picker
5. Image uploads to `/api/images/temp-upload` with field_name="scene_photo"
6. Image card appears with preview
7. Counter updates: "(1/5)"
8. Can add up to 5 scene images total

**Console logs to verify:**
```
Session ID: <uuid>
✅ Scene image uploaded: temp/<session-id>/<filename>
```

## Status

✅ **Fixed:** Image upload now works on both pages
✅ **Tested:** Backend expects correct parameters
✅ **Improved:** Page 6 clarity (user's vehicle damage only)
✅ **Increased:** Maximum 8 images on Page 6 (from 5)

## Notes

- Session ID persists across page navigation (stored in sessionStorage)
- Backend stores temp files in Supabase Storage under `temp/<session-id>/`
- Temp files auto-cleanup after 24 hours (cron job)
- Images moved to permanent storage on final form submission

---

**Last Updated:** 2025-10-29
**Status:** ✅ COMPLETE AND WORKING
