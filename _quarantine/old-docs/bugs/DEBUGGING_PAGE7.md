# Debugging Page 7 Data Not Saving

## Quick Browser Console Check

**Open browser console (F12) and paste this:**

```javascript
// Quick Page 7 Debug Check
console.log('🔍 Page 7 Debug Check\n' + '='.repeat(50));

// 1. Check if page 7 data exists in sessionStorage
const page7Data = sessionStorage.getItem('incident_page7');
console.log('\n1️⃣  SessionStorage Check:');
if (!page7Data) {
  console.error('❌ NO PAGE 7 DATA FOUND in sessionStorage!');
  console.log('Possible causes:');
  console.log('  - Page 7 was skipped');
  console.log('  - Form not submitted (Next button not clicked)');
  console.log('  - JavaScript error during save');
} else {
  console.log('✅ Page 7 data EXISTS in sessionStorage');
  const data = JSON.parse(page7Data);

  // Check if skipped
  if (data.no_other_vehicles) {
    console.warn('⚠️  Page 7 was SKIPPED (no_other_vehicles = true)');
  } else {
    // Count populated fields
    const fields = [
      'other_full_name',
      'other_contact_number',
      'other_vehicle_registration',
      'other_drivers_insurance_company'
    ];

    let populatedCount = 0;
    fields.forEach(field => {
      if (data[field]) populatedCount++;
    });

    console.log(`📊 ${populatedCount}/${fields.length} key fields populated`);
  }

  // Show full data
  console.log('\n📄 Full Page 7 Data:');
  console.log(JSON.stringify(data, null, 2));
}

// 2. Simulate what Page 12 will send
console.log('\n2️⃣  Form Collection Test (Page 12 Simulation):');
const formData = {};
for (let i = 1; i <= 12; i++) {
  const pageData = sessionStorage.getItem(`incident_page${i}`);
  if (pageData) {
    formData[`page${i}`] = JSON.parse(pageData);
  }
}

console.log(`Pages collected: ${Object.keys(formData).length}/12`);

if (formData.page7) {
  console.log('✅ Page 7 WILL be included in submission!');
} else {
  console.error('❌ Page 7 will NOT be submitted!');
}

// 3. Check for old storage keys (from before fix)
console.log('\n3️⃣  Legacy Storage Check:');
const oldKey = localStorage.getItem('page7_data');
if (oldKey) {
  console.warn('⚠️  OLD storage key "page7_data" found in localStorage');
  console.log('This should be migrated to sessionStorage["incident_page7"]');
} else {
  console.log('✅ No old storage keys found');
}

console.log('\n' + '='.repeat(50));
console.log('✅ Debug check complete!');
```

## Step-by-Step Debugging Process

### Step 1: Visit Debug Tool

Open this URL in your browser:
```
http://localhost:5000/debug-page7.html
```

This interactive tool will:
- ✅ Check sessionStorage for page 7 data
- ✅ Show which fields are populated
- ✅ Simulate form submission
- ✅ Provide specific recommendations

### Step 2: Check Current State

**Is page 7 data in sessionStorage?**

- ✅ **YES** → Proceed to Step 3
- ❌ **NO** → Go back to Page 7 and fill it out, click "Next" (don't click "Skip This Section")

**Was page 7 intentionally skipped?**

- ✅ **YES (no_other_vehicles = true)** → This is expected behavior if no other vehicles were involved
- ❌ **NO** → Data should be present

### Step 3: Test Submission

1. **Clear browser cache**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear sessionStorage** (in console):
   ```javascript
   sessionStorage.clear();
   console.log('✅ SessionStorage cleared');
   ```
3. **Start fresh form**:
   - Go to `/incident-form-page1.html`
   - Fill out pages 1-12 including page 7
   - On page 7, DO NOT click "Skip This Section"
   - Submit on page 12

### Step 4: Verify in Database

After submission, run these verification scripts:

```bash
# Get your user ID from Supabase dashboard, then run:

# Test all 26 fields (pages 7 & 9 + controller fixes)
node scripts/verify-pages-7-9-data.js <user-uuid>

# Test just the 6 controller fixes
node scripts/test-field-mappings.js <user-uuid>
```

## Common Issues & Solutions

### Issue 1: "Skip This Section" Was Clicked

**Symptom:** Page 7 data shows `no_other_vehicles: true`

**Solution:**
1. Go back to Page 7
2. Fill out the other driver/vehicle information
3. Click "Next" (NOT "Skip This Section")
4. Complete remaining pages and submit

### Issue 2: Browser Cache

**Symptom:** Old version of page 7 HTML is loaded

**Solution:**
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Or clear browser cache completely
3. Verify file version by checking if line 1204 says:
   ```javascript
   sessionStorage.setItem('incident_page7', JSON.stringify(formData));
   ```

### Issue 3: SessionStorage Cleared Between Pages

**Symptom:** Page 7 data disappears before reaching Page 12

**Solution:**
- Don't close browser tab between pages
- Don't open form in multiple tabs
- Don't use incognito/private browsing mode
- Check browser settings aren't clearing data automatically

### Issue 4: JavaScript Error During Save

**Symptom:** No console errors visible but data not saving

**Solution:**
1. Open browser console (F12) BEFORE filling page 7
2. Fill out page 7 form
3. Click "Next"
4. Check console for any red error messages
5. If errors found, take screenshot and report

### Issue 5: Controller Not Reading page7

**Symptom:** SessionStorage has page 7 data but database is NULL

**This has been fixed in commit b50d2b1. Verify controller file has:**
```javascript
// Lines 399, 582-610 in src/controllers/incidentForm.controller.js
page7 = {},
...
other_full_name: page7.other_full_name || null,
other_contact_number: page7.other_contact_number || null,
// ... 18 more fields
```

## Verification Checklist

Before reporting the issue, verify:

- [ ] Latest code deployed (commit b50d2b1)
- [ ] Browser cache cleared (hard refresh)
- [ ] SessionStorage cleared
- [ ] Form filled from start (Page 1) to end (Page 12)
- [ ] Page 7 filled completely (NOT skipped)
- [ ] "Next" button clicked on Page 7
- [ ] Page 12 submitted successfully
- [ ] Verification scripts run
- [ ] Console checked for JavaScript errors
- [ ] Network tab checked for API errors

## Advanced Debugging

### Check Network Request

1. Open Dev Tools (F12)
2. Go to Network tab
3. Filter: XHR
4. Submit form on Page 12
5. Find `/api/incident-form/submit` request
6. Click on it → Preview tab
7. Expand `page7` object
8. Verify 20 fields are present

### Check Server Logs

If page 7 data is sent but not in database:

```bash
# View server logs
npm run dev

# Look for errors like:
# - "Database error"
# - "Field validation failed"
# - "RLS policy violation"
```

### Direct Database Query

```sql
SELECT
  other_full_name,
  other_contact_number,
  other_vehicle_registration,
  other_drivers_insurance_company,
  created_at
FROM incident_reports
WHERE create_user_id = 'YOUR_USER_UUID'
ORDER BY created_at DESC
LIMIT 1;
```

## Need Help?

If page 7 is STILL not saving after following all steps:

1. Open `/debug-page7.html` in browser
2. Click all diagnostic buttons
3. Take screenshots of results
4. Run verification scripts
5. Provide:
   - Screenshots from debug tool
   - Console errors (if any)
   - Network request payload
   - Verification script output
   - User UUID for testing

---

**Last Updated:** 2025-11-12
**Related Commits:** 4316ec6 (page 7 storage fix), b50d2b1 (controller fixes)
