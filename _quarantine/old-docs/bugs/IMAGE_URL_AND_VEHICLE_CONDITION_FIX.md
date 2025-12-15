# Image URLs and Vehicle Condition Fix

**Date:** 2025-10-28
**Issues:**
1. ❌ Image URLs missing for PDF generation (public_url and signed_url both null)
2. ❌ Vehicle condition field not captured in signup form
3. ❓ Multiple dashboard versions exist (dashboard.html, dashboard-auth.html, dashboard-proxy.html)

---

## Issue 1: Image URLs Missing for PDF Generation

### Problem
The `user_documents` table has:
- ✅ `storage_path` - Path in Supabase Storage (exists)
- ❌ `public_url` - NULL (not populated)
- ❌ `signed_url` - Field doesn't exist in schema

PDF generation needs image URLs but can't find them.

### Root Cause
Images are successfully uploaded to Supabase Storage, but:
1. **No signed_url column** - Dashboard was trying to use this field
2. **public_url is NULL** - Not being generated during upload
3. **API generates signed URLs on-the-fly** - Via `/api/user-documents/:id/download`

### Solution Strategy

**Option A: Add signed_url column to database** ✅ RECOMMENDED
- Add `signed_url TEXT` column to `user_documents` table
- Update imageProcessorV2 to generate and store signed URLs during upload
- Update existing records with signed URLs
- Pro: Faster PDF generation (no on-the-fly generation needed)
- Pro: Dashboard already expects this field
- Con: URLs expire after 1 hour (need refresh mechanism)

**Option B: Generate URLs in dataFetcher for PDF**
- Modify `lib/dataFetcher.js` to generate signed URLs when fetching for PDF
- Pro: Always fresh URLs
- Con: Adds latency to PDF generation
- Con: Requires changing PDF generation code

**Recommendation:** Use Option A with URL refresh API endpoint (already exists at `/api/user-documents/:id/refresh-url`)

---

## Issue 2: Vehicle Condition Field Missing

### Problem
- `vehicle_condition` field exists in `user_signup` table
- Not being captured in signup form
- Empty in production data

### Solution
Add vehicle condition capture to signup form:

**Where to add:**
- **Page 3** (Vehicle Information page) - Most logical location
- After vehicle registration/make/model fields
- Before insurance information

**Field Type:**
- Dropdown select with options:
  - "Excellent" - No damage, well-maintained
  - "Good" - Minor wear, fully functional
  - "Fair" - Visible damage but driveable
  - "Poor" - Significant damage
  - "Not Driveable" - Requires towing

**Database Mapping:**
- Form field: `vehicle_condition`
- Supabase column: `user_signup.vehicle_condition` (already exists)
- Typeform field: TBD (need to add to Typeform form)

**Alternative Location:**
Could add to **Images page** as suggested by user, with context:
- "Before uploading photos, please describe your vehicle's overall condition"
- Shown before image upload section
- Helps users understand what photos to take

---

## Issue 3: Multiple Dashboard Versions

### Current State
```
dashboard.html         72KB  (Oct 28 04:34) - ✅ LATEST with UI improvements
dashboard-auth.html    19KB  (Oct 28 00:02) - ⚠️ Older version
dashboard-proxy.html   14KB  (Oct 28 00:02) - ⚠️ Older version
```

### Investigation Needed
**Questions:**
1. Why do auth and proxy versions exist?
2. Are they used in production?
3. Can they be deleted or archived?

**Possible Reasons:**
- **dashboard-auth.html** - May be testing authentication approach
- **dashboard-proxy.html** - May be testing proxy/CORS workaround
- **dashboard.html** - Main production version (biggest, most recent)

**Recommendation:**
1. Check if -auth and -proxy are linked anywhere in the app
2. If not used, archive them to `/public/archive/` folder
3. Keep only main `dashboard.html` active

---

## Implementation Plan

### Step 1: Add signed_url Column ✅

```sql
-- Add signed_url column to user_documents
ALTER TABLE user_documents
ADD COLUMN signed_url TEXT;

-- Add column for URL expiry tracking
ALTER TABLE user_documents
ADD COLUMN signed_url_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX idx_user_documents_signed_url_expiry
ON user_documents(signed_url_expires_at)
WHERE deleted_at IS NULL AND status = 'completed';
```

### Step 2: Update ImageProcessorV2

Modify `src/services/imageProcessorV2.service.js` to:
1. Generate signed URL after successful upload
2. Store signed_url and signed_url_expires_at
3. Default expiry: 24 hours (longer than 1 hour for PDF generation)

```javascript
// After successful upload
const { data: signedUrlData } = await supabase.storage
  .from('user-documents')
  .createSignedUrl(storagePath, 86400); // 24 hours

const expiresAt = new Date(Date.now() + 86400 * 1000);

await supabase
  .from('user_documents')
  .update({
    signed_url: signedUrlData.signedUrl,
    signed_url_expires_at: expiresAt.toISOString()
  })
  .eq('id', documentId);
```

### Step 3: Backfill Existing Records

Create script to generate signed URLs for existing documents:

```javascript
// scripts/backfill-signed-urls.js
// For each document with storage_path but no signed_url:
//   1. Generate signed URL (24 hours)
//   2. Update signed_url and signed_url_expires_at
```

### Step 4: Add Vehicle Condition to Signup Form

**Option A: Add to Page 3 (Vehicle Information)**

```html
<div class="form-group">
  <label for="vehicleCondition">Vehicle Condition *</label>
  <select id="vehicleCondition" name="vehicle_condition" required>
    <option value="">Select condition...</option>
    <option value="Excellent">Excellent - No damage, well-maintained</option>
    <option value="Good">Good - Minor wear, fully functional</option>
    <option value="Fair">Fair - Visible damage but driveable</option>
    <option value="Poor">Poor - Significant damage</option>
    <option value="Not Driveable">Not Driveable - Requires towing</option>
  </select>
</div>
```

**Option B: Add to Images Page (User's preference)**

Add before image upload section with context explanation.

### Step 5: Update PDF Generation

Modify `lib/dataFetcher.js` to:
1. Fetch signed_url from user_documents
2. Check if URL expired (signed_url_expires_at < now)
3. If expired, call refresh-url API
4. Return fresh URLs for PDF generation

---

## Testing Checklist

### Image URLs
- [ ] Run migration to add signed_url columns
- [ ] Upload new test image, verify signed_url is stored
- [ ] Backfill existing documents with signed URLs
- [ ] Generate test PDF, verify images are included
- [ ] Test URL refresh API endpoint

### Vehicle Condition
- [ ] Add field to signup form (page or location TBD)
- [ ] Complete test signup with vehicle condition
- [ ] Verify data saves to user_signup.vehicle_condition
- [ ] Verify PDF includes vehicle condition

### Dashboard Versions
- [ ] Search codebase for references to -auth or -proxy dashboards
- [ ] Archive if unused
- [ ] Document decision

---

## Files to Modify

1. **Database Migration:**
   - `migrations/add-signed-url-to-user-documents.sql`

2. **ImageProcessorV2:**
   - `src/services/imageProcessorV2.service.js`

3. **Signup Form:**
   - `public/signup-form.html` (add vehicle condition field)

4. **PDF Data Fetcher:**
   - `lib/dataFetcher.js` (use signed_url for images)

5. **Backfill Script:**
   - `scripts/backfill-signed-urls.js`

---

**Status:** Ready for implementation
**Priority:** High (blocking PDF generation)
**Estimated Time:** 2-3 hours
