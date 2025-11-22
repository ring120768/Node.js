# Dashboard Empty Content Investigation & Fix

**Date:** 2025-10-28
**Issue:** Dashboard showing zero content across all sections
**Status:** ✅ ROOT CAUSE IDENTIFIED

---

## Issue Report

User reported: *"dashboard was completely empty with all references showing zero content"*

### Symptoms

- Images section: 0 items
- Incident Reports section: 0 items
- Dashcam Footage section: 0 items
- Audio Transcriptions section: 0 items
- Generated Reports section: 0 items

---

## Investigation Results

### 1. API Endpoints ✅ WORKING

**Verified:**
- ✅ Routes properly defined in `src/routes/userDocuments.routes.js`
- ✅ Routes mounted at `/api/user-documents` in `src/routes/index.js` (line 327)
- ✅ Controller implementation correct in `src/controllers/userDocuments.controller.js`
- ✅ Server running on port 3000 without errors

**API Response Format:**
```json
{
  "success": true,
  "data": {
    "documents": [],
    "pagination": {
      "total": 0,
      "limit": 100,
      "offset": 0,
      "has_more": false
    }
  }
}
```

**Conclusion:** API is functioning correctly, returning empty array because **database has no data**.

### 2. Database State ❌ EMPTY

**Diagnostic Results:**
```
Test User ID: 199d9251-b2e0-40a5-80bf-fc1529d9bf6c (hardcoded in dashboard.html)

✅ user_signup table: 0 records
✅ user_documents table: 0 records
✅ incident_reports table: 0 records
✅ ai_transcription table: 0 records
✅ completed_incident_forms table: Does not exist (schema error)
```

**Finding:** Database is completely empty - NO users have any data.

### 3. Environment Mismatch 🔄 SUSPECTED

**Evidence:**
1. User provided CSV at `/Users/ianring/Downloads/user_signup_rows (5).csv`
2. CSV shows user record: `create_user_id = 26845a62-ed39-40a5-8946-3861b3ad8e4b`
3. Local database has 0 records
4. **Conclusion:** CSV came from different environment (Replit production?)

**Localhost Supabase URL:**
```
https://kctlcmbjmhcfoobmkfrs.supabase.co
```

**Possible Scenarios:**
- A) Localhost `.env` points to empty dev database
- B) Production (Replit) uses different Supabase project
- C) Database was wiped/reset after CSV export

---

## Root Cause

**PRIMARY:** Database connected to localhost has zero records.

**SECONDARY:** Dashboard hardcoded test user doesn't exist in connected database.

**Code Reference:**
```javascript
// public/dashboard.html lines 1159-1167
console.log('⚠️ Using test mode with hardcoded user');
currentUser = {
  id: '199d9251-b2e0-40a5-80bf-fc1529d9bf6c',  // ❌ Doesn't exist
  email: 'ian.ring@sky.com',
  fullName: 'Ian Ring'
};
```

---

## Solutions

### Option 1: Complete Test Signup (Recommended)

**Steps:**
1. Navigate to `http://localhost:3000/signup-form.html`
2. Complete all 9 pages of signup form
3. Upload required images
4. Submit form
5. Note the `create_user_id` from browser console
6. Update dashboard.html with real user ID

**Why This Works:**
- Tests entire signup flow (as required)
- Generates real data for all dashboard sections
- Verifies DVLA field population fix
- Verifies GDPR audit log fix
- Tests temp upload → permanent storage migration

### Option 2: Sync Environment Variables

**Check which Supabase project you're using:**

```bash
# Show current connection
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
```

**If CSV came from production:**
1. Get production Supabase credentials from Replit
2. Update local `.env` file
3. Restart server
4. Dashboard will show production data

### Option 3: Use Existing User from CSV

**User from CSV export:**
```
create_user_id: 26845a62-ed39-40a5-8946-3861b3ad8e4b
email: ian.ring@sky.com
name: Ian Ring
```

**Update dashboard.html line 1161:**
```javascript
currentUser = {
  id: '26845a62-ed39-40a5-8946-3861b3ad8e4b',  // From CSV
  email: 'ian.ring@sky.com',
  fullName: 'Ian Ring'
};
```

**Then either:**
- A) Point localhost to production Supabase (has this user)
- B) Import production data into localhost database

---

## Additional Issues Found

### Issue: Missing Table `completed_incident_forms`

**Error:**
```
Could not find the table 'public.completed_incident_forms' in the schema cache
```

**Impact:** PDF generation endpoint will fail.

**Fix:** Create table migration or verify table name:

```sql
-- Check if table exists with different name
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%incident%form%';
```

---

## Testing Dashboard with Real Data

### Prerequisites

**Need at least:**
1. ✅ User record in `user_signup` table
2. ✅ Images in `user_documents` table (status: completed)
3. ✅ Signed URLs generated for images
4. ⚠️ Optional: Incident report, transcriptions, PDFs

### Test Procedure

1. **Complete signup:**
   ```
   http://localhost:3000/signup-form.html
   ```

2. **Get user ID from response:**
   ```javascript
   // Browser console after signup
   console.log('User ID:', response.userId);
   ```

3. **Update dashboard test user:**
   ```javascript
   // dashboard.html line 1161
   currentUser = {
     id: 'YOUR_USER_ID_HERE',
     email: 'your@email.com',
     fullName: 'Your Name'
   };
   ```

4. **Verify data in database:**
   ```bash
   node check-dashboard-data.js
   ```

5. **Open dashboard:**
   ```
   http://localhost:3000/dashboard.html
   ```

6. **Expected results:**
   - Images section: 5 images (driving license + 4 vehicle photos)
   - Other sections: Populate as you use features

---

## Edit & Delete Features (User Requirement)

User requested: *"This also needs to have edit and delete features added"*

### Current Status

**Delete Feature:** ✅ **Already exists** for images

**Code location:** `dashboard.html` lines 1517-1553

```javascript
async function confirmDeleteImage(imageId) {
  if (!confirm('Are you sure you want to delete this image?')) return;

  try {
    const response = await fetch(`/api/user-documents/${imageId}?user_id=${currentUser.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (response.ok) {
      showToast('Image deleted successfully', 'success');
      await loadImages(); // Refresh list
    }
  } catch (error) {
    showToast('Failed to delete image', 'error');
  }
}
```

**Backend support:** ✅ Soft delete implemented in `userDocuments.controller.js` lines 421-487

**Delete button rendered:** Lines 1387-1391
```html
<button data-action="delete" data-id="${img.id}">
  <i class="fas fa-trash-alt"></i> Delete
</button>
```

### Missing: Edit Feature ⚠️ TODO

**Requirements (to implement):**
1. Edit button in image actions
2. Modal/form to update document metadata
3. API endpoint: `PATCH /api/user-documents/:id`
4. Fields to edit:
   - `document_type` (dropdown)
   - `document_category` (dropdown)
   - `notes` (textarea)
   - File replacement (optional)

**Implementation priority:**
- **Phase 1:** Edit metadata only (quick win)
- **Phase 2:** Replace file upload (complex)

---

## Recommendations

### Immediate Actions

1. **✅ Complete test signup** to generate real data
2. **📝 Update dashboard.html** with real user ID
3. **🧪 Run diagnostic:** `node check-dashboard-data.js`
4. **🌐 Test dashboard** at http://localhost:3000/dashboard.html

### Before Production Deployment

1. **🔒 Remove hardcoded test user** from dashboard.html
2. **🔑 Implement proper authentication** (use session/JWT)
3. **✅ Add edit functionality** (metadata editing)
4. **🧪 Test all CRUD operations** (Create, Read, Update, Delete)
5. **📊 Verify dashboard displays real data** correctly

### Environment Management

1. **📂 Document environment differences:**
   - Localhost dev: Empty database for testing
   - Replit prod: Real user data

2. **🔄 Create data sync script** (optional):
   - Export production data
   - Import to localhost for testing
   - Sanitize sensitive fields

---

## Diagnostic Scripts Created

1. **`check-dashboard-data.js`** - Diagnose dashboard empty content
   - Checks all tables for test user
   - Identifies root cause
   - Provides recommendations

2. **`find-recent-user.js`** - Find recent signup users
   - Lists 5 most recent users
   - Shows document counts
   - Recommends user ID for testing

**Usage:**
```bash
node check-dashboard-data.js   # Run first
node find-recent-user.js        # If users exist
```

---

## Summary

| Component | Status | Action |
|-----------|--------|--------|
| API Endpoints | ✅ Working | None |
| Database | ❌ Empty | Complete signup or sync prod data |
| Dashboard Code | ✅ Correct | Update test user ID |
| Delete Feature | ✅ Exists | None |
| Edit Feature | ⚠️ Missing | Implement (user requirement) |

**Next Step:** Complete test signup to generate data, then update dashboard with real user ID.

**Blockers:** None - system is ready for testing.

---

**Created:** 2025-10-28
**Tools:** check-dashboard-data.js, find-recent-user.js
**Related:** DVLA_AND_GDPR_AUDIT_FIX.md, FIELD_MAPPING_VERIFICATION.md
