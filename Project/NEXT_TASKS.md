# Next Tasks - Execution Plan

## Overview
This document outlines the next development tasks for Car Crash Lawyer AI, organized in a logical execution order with clear commit boundaries.

---

## Task Breakdown

### ✅ Phase 1: Incident Reports & Image Processing
**Goal:** Ensure incident report form (WvM2ejru) properly stores data and processes images

#### Task 1.1: Verify Incident Report Webhook Integration
**Status:** Pending
**Priority:** HIGH
**Estimated Time:** 30 minutes

**Actions:**
1. Review `src/controllers/webhook.controller.js` - `processIncidentReport()` function
2. Verify form ID `WvM2ejru` is properly handled
3. Check field mappings from Typeform to `incident_reports` table
4. Ensure all 11 file_url fields are mapped correctly

**Files to Review:**
- `src/controllers/webhook.controller.js` (lines 865-1070)
- `supabase/sql/` - incident_reports schema

**Expected Behavior:**
- Webhook receives Typeform submission for form WvM2ejru
- Data is parsed and mapped to incident_reports table
- Images are extracted and processed via ImageProcessorV2
- Record is created in Supabase

**Verification:**
```bash
# Submit test incident report through Typeform
# Check webhook logs
# Verify database entry in incident_reports table
```

**Commit Point:** `test: Verify incident report webhook integration`

---

#### Task 1.2: Verify Image Processing for Incident Reports
**Status:** Pending
**Priority:** HIGH
**Estimated Time:** 45 minutes

**Actions:**
1. Review image processing in `processIncidentReport()` (webhook.controller.js lines 902-931)
2. Verify ImageProcessorV2 is used (not V1)
3. Check that 11 possible file_url fields are processed:
   - file_url_documents
   - file_url_documents_1
   - file_url_record_detailed_account_of_what_happened
   - file_url_what3words
   - file_url_scene_overview
   - file_url_scene_overview_1
   - file_url_other_vehicle
   - file_url_other_vehicle_1
   - file_url_vehicle_damage
   - file_url_vehicle_damage_1
   - file_url_vehicle_damage_2
4. Ensure permanent API URLs are stored (not Typeform URLs)

**Files to Review:**
- `src/controllers/webhook.controller.js` (lines 902-931)
- `src/services/imageProcessorV2.js`
- `src/services/imageRetryService.js`

**Expected Behavior:**
- Images are downloaded from Typeform
- Uploaded to Supabase Storage: `user-documents/{userId}/{documentType}/...`
- Document records created in user_documents table
- Permanent API URLs stored in incident_reports table
- Status tracking: pending → processing → completed

**Verification:**
```bash
# Submit test incident report with images
node scripts/monitor-image-processing.js --detailed
# Check user_documents table for new entries
# Verify API URLs in incident_reports table
```

**Commit Point:** `feat: Verify and enhance incident report image processing`

---

### ✅ Phase 2: Emergency Modal Fixes
**Goal:** Fix what3words integration and call functionality in emergency modal

#### Task 2.1: Fix Emergency Modal - what3words Integration
**Status:** Pending
**Priority:** MEDIUM
**Estimated Time:** 30 minutes

**Problem:** Emergency button doesn't call what3words API or display location

**Actions:**
1. Review `public/index.html` emergency modal code (lines 542-598)
2. Check what3words API endpoint: `/api/location/convert`
3. Verify geolocation request is working
4. Ensure what3words API response is displayed
5. Test error handling for failed requests

**Files to Modify:**
- `public/index.html` (emergency modal JavaScript)

**Expected Fix:**
```javascript
// Line ~583-598 in index.html
async function convertToWhat3Words(lat, lng) {
  try {
    const response = await fetch(`/api/location/convert?lat=${lat}&lng=${lng}`);
    const data = await response.json();

    if (response.ok && data.words) {
      what3wordsAddress = data.words;
      displayLocationInfo(data);  // ← Ensure this is called
    } else {
      showError('Unable to get what3words address');
    }
  } catch (error) {
    console.error('what3words error:', error);
    showError('Failed to convert location to what3words address');
  }
}
```

**Testing:**
1. Click "Get Help Now - Call 999" button
2. Allow location permissions
3. Verify what3words address appears (e.g., "filled.count.soap")
4. Verify regular address appears
5. Verify coordinates appear

**Commit Point:** `fix: Emergency modal what3words integration`

---

#### Task 2.2: Fix Emergency Modal - 999 Call Trigger
**Status:** Pending
**Priority:** MEDIUM
**Estimated Time:** 15 minutes

**Problem:** 999 call button doesn't trigger phone dialer

**Actions:**
1. Review `call999()` function (line ~666 in index.html)
2. Verify `tel:999` link is correct for UK
3. Test on mobile device

**Files to Modify:**
- `public/index.html`

**Expected Fix:**
```javascript
// Line ~666 in index.html
function call999() {
  // For mobile devices, this will trigger the phone dialer
  window.location.href = 'tel:999';
  // Alternative: window.open('tel:999', '_self');
}
```

**Testing:**
1. Click "📞 Call 999 Now" button in modal
2. Verify phone dialer opens with 999 pre-filled (mobile)
3. Verify appropriate behavior on desktop (may not work)

**Commit Point:** `fix: Emergency 999 call trigger`

---

#### Task 2.3: Fix Emergency Modal - Cancel Button
**Status:** Pending
**Priority:** LOW
**Estimated Time:** 10 minutes

**Problem:** Cancel button doesn't close modal and return to previous screen

**Actions:**
1. Review `closeModal()` function (line ~672 in index.html)
2. Ensure modal overlay is properly removed
3. Test that page returns to normal state

**Files to Modify:**
- `public/index.html`

**Expected Fix:**
```javascript
// Line ~672 in index.html
function closeModal() {
  emergencyModal.classList.remove('show');
  // Reset modal content to initial state
  modalContent.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Getting your location...</p>
    </div>
  `;
}
```

**Testing:**
1. Open emergency modal
2. Click "Cancel" button
3. Verify modal closes
4. Verify page returns to normal state
5. Verify modal can be reopened and works again

**Commit Point:** `fix: Emergency modal cancel button`

---

### ✅ Phase 3: Logo Display Fix
**Goal:** Fix logo placeholder and clean up index.html

#### Task 3.1: Fix Logo Display
**Status:** Pending
**Priority:** MEDIUM
**Estimated Time:** 20 minutes

**Problem:** Logo placeholder not displaying correctly in index.html

**Actions:**
1. Review current logo code in index.html (line ~474)
2. Replace with correct path: `/images/car-crash-lawyer-ai-450.webp`
3. Ensure responsive sizing
4. Add proper alt text and loading attributes

**Files to Modify:**
- `public/index.html`

**Current Code (line ~474):**
```html
<img src="car-crash-lawyer-ai-450.webp" alt="Car Crash Lawyer AI logo" class="site-branding" width="450" height="450" style="display:block;margin:0 auto 20px;max-width:100%;height:auto;image-rendering:crisp-edges;image-rendering:-webkit-optimize-contrast;">
```

**Fixed Code:**
```html
<img src="/images/car-crash-lawyer-ai-450.webp" alt="Car Crash Lawyer AI - Legal Support at the Scene" class="site-branding" width="450" height="450" loading="eager" style="display:block;margin:0 auto 20px;max-width:100%;height:auto;">
```

**Testing:**
1. Load index.html
2. Verify logo displays correctly
3. Test on mobile (should be responsive)
4. Check browser console for any 404 errors

**Commit Point:** `fix: Logo display path in index.html`

---

#### Task 3.2: Clean Up index.html
**Status:** Pending
**Priority:** LOW
**Estimated Time:** 30 minutes

**Problem:** index.html may have redundant code or formatting issues

**Actions:**
1. Review entire index.html file
2. Remove any duplicate styles
3. Remove commented-out code
4. Ensure consistent indentation
5. Verify all JavaScript functions are used
6. Check for any console.log statements (keep only necessary ones)

**Files to Modify:**
- `public/index.html`

**Cleanup Checklist:**
- [ ] Remove unused CSS
- [ ] Remove commented code
- [ ] Consistent indentation (2 spaces)
- [ ] Remove debug console.logs
- [ ] Verify all event listeners work
- [ ] Check for broken links

**Commit Point:** `refactor: Clean up index.html code`

---

### ✅ Phase 4: Mascot Size Increase
**Goal:** Double the mascot size across all pages

#### Task 4.1: Increase Mascot Size by 2x
**Status:** Pending
**Priority:** LOW
**Estimated Time:** 15 minutes

**Actions:**
1. Open `public/css/mascot.css`
2. Update mascot sizes:
   - Desktop: 80px → 160px
   - Tablet: 60px → 120px
   - Mobile: 50px → 100px
3. Adjust positioning if needed (may need more spacing from edge)

**Files to Modify:**
- `public/css/mascot.css`

**Current Code:**
```css
.mascot-fixed img {
    width: 80px;
    height: auto;
}

@media (max-width: 768px) {
    .mascot-fixed img {
        width: 60px;
    }
}

@media (max-width: 480px) {
    .mascot-fixed img {
        width: 50px;
    }
}
```

**Updated Code:**
```css
.mascot-fixed img {
    width: 160px;
    height: auto;
}

@media (max-width: 768px) {
    .mascot-fixed img {
        width: 120px;
    }
}

@media (max-width: 480px) {
    .mascot-fixed img {
        width: 100px;
    }
}
```

**Testing:**
1. Load any page (e.g., index.html)
2. Verify mascot is 2x larger
3. Test on desktop (160px)
4. Test on tablet (120px)
5. Test on mobile (100px)
6. Ensure mascot doesn't overlap content

**Commit Point:** `feat: Double mascot size across all pages`

---

### ✅ Phase 5: Testing
**Goal:** Create comprehensive tests for incident reports and image processing

#### Task 5.1: Create Incident Report Webhook Tests
**Status:** Pending
**Priority:** HIGH
**Estimated Time:** 60 minutes

**Actions:**
1. Create test file: `src/controllers/__tests__/webhook.incident.test.js`
2. Test webhook signature verification
3. Test incident report data parsing
4. Test database insertion
5. Test error handling

**Files to Create:**
- `src/controllers/__tests__/webhook.incident.test.js`

**Test Cases:**
```javascript
describe('Incident Report Webhook', () => {
  test('should verify Typeform signature', () => { });
  test('should parse incident report form data', () => { });
  test('should insert into incident_reports table', () => { });
  test('should handle missing fields gracefully', () => { });
  test('should reject invalid signatures', () => { });
});
```

**Commit Point:** `test: Add incident report webhook tests`

---

#### Task 5.2: Create Image Processing Tests
**Status:** Pending
**Priority:** HIGH
**Estimated Time:** 60 minutes

**Actions:**
1. Create test file: `src/services/__tests__/imageProcessorV2.test.js`
2. Test image download from Typeform
3. Test upload to Supabase Storage
4. Test status transitions (pending → processing → completed)
5. Test retry mechanism
6. Test error categorization

**Files to Create:**
- `src/services/__tests__/imageProcessorV2.test.js`
- `src/services/__tests__/imageRetryService.test.js`

**Test Cases:**
```javascript
describe('ImageProcessorV2', () => {
  test('should create document record with pending status', () => { });
  test('should download image from Typeform URL', () => { });
  test('should upload to Supabase Storage', () => { });
  test('should update status to completed', () => { });
  test('should handle failed downloads', () => { });
  test('should categorize errors correctly', () => { });
  test('should schedule retries with exponential backoff', () => { });
});

describe('ImageRetryService', () => {
  test('should find documents needing retry', () => { });
  test('should retry failed documents', () => { });
  test('should respect max_retries limit', () => { });
  test('should calculate exponential backoff correctly', () => { });
});
```

**Commit Point:** `test: Add image processing tests`

---

#### Task 5.3: Run Test Suite
**Status:** Pending
**Priority:** MEDIUM
**Estimated Time:** 15 minutes

**Actions:**
1. Run full test suite: `npm test`
2. Review coverage report
3. Fix any failing tests
4. Ensure coverage > 70%

**Commands:**
```bash
npm test
npm test -- --coverage
```

**Commit Point:** `test: Update test suite with full coverage`

---

## Execution Order

### Session 1: Incident Reports (60-90 minutes)
1. ✅ Verify incident report webhook integration
2. ✅ Verify image processing for incident reports
3. 📝 **Commit:** `feat: Verify incident report webhook and image processing`

### Session 2: Emergency Modal Fixes (45-60 minutes)
1. ✅ Fix what3words integration
2. 📝 **Commit:** `fix: Emergency modal what3words integration`
3. ✅ Fix 999 call trigger
4. 📝 **Commit:** `fix: Emergency 999 call trigger`
5. ✅ Fix cancel button
6. 📝 **Commit:** `fix: Emergency modal cancel button`

### Session 3: UI Improvements (45-60 minutes)
1. ✅ Fix logo display
2. 📝 **Commit:** `fix: Logo display path in index.html`
3. ✅ Clean up index.html
4. 📝 **Commit:** `refactor: Clean up index.html code`
5. ✅ Increase mascot size
6. 📝 **Commit:** `feat: Double mascot size across all pages`

### Session 4: Testing (90-120 minutes)
1. ✅ Create incident report webhook tests
2. 📝 **Commit:** `test: Add incident report webhook tests`
3. ✅ Create image processing tests
4. 📝 **Commit:** `test: Add image processing tests`
5. ✅ Run full test suite
6. 📝 **Commit:** `test: Update test suite with full coverage`

---

## Final Checklist

### Before Starting:
- [ ] Pull latest changes from GitHub in both Mac and Replit
- [ ] Ensure all environment variables are set
- [ ] Backup current working state

### After Each Session:
- [ ] Commit changes with descriptive message
- [ ] Push to GitHub (`git push origin feat/audit-prep`)
- [ ] **Pull in Replit:** `git pull origin feat/audit-prep`
- [ ] Restart app in Replit
- [ ] Test changes in browser

### After All Sessions:
- [ ] Run full test suite: `npm test`
- [ ] Review test coverage
- [ ] Manual testing of all features:
  - [ ] Submit user signup form (b03aFxEO)
  - [ ] Submit incident report form (WvM2ejru)
  - [ ] Test emergency modal
  - [ ] Test logo display
  - [ ] Test mascot on all pages
- [ ] Review commit history
- [ ] Create pull request to merge feat/audit-prep → main

---

## Testing Procedure

### Incident Report Testing:
1. **Open Typeform:** Form ID `WvM2ejru`
2. **Fill out all fields** (use test data)
3. **Upload test images** (at least 3-4 images)
4. **Submit form**
5. **Check webhook logs** in Replit console
6. **Verify database:**
   ```sql
   SELECT * FROM incident_reports ORDER BY created_at DESC LIMIT 1;
   SELECT * FROM user_documents WHERE document_category = 'incident_report' ORDER BY created_at DESC LIMIT 10;
   ```
7. **Check image processing:**
   ```bash
   node scripts/monitor-image-processing.js --detailed
   ```

### Emergency Modal Testing:
1. **Load index.html**
2. **Click "Get Help Now - Call 999"**
3. **Allow location access**
4. **Verify:**
   - [ ] what3words address displays (e.g., "filled.count.soap")
   - [ ] Regular address displays
   - [ ] Coordinates display
   - [ ] "Copy Location" button works
   - [ ] "Call 999" button triggers dialer (mobile)
   - [ ] "Cancel" button closes modal

### Logo Testing:
1. **Load index.html**
2. **Verify logo displays correctly**
3. **Check browser console** (no 404 errors)
4. **Test responsive:**
   - [ ] Desktop (450px width)
   - [ ] Tablet (~320px width)
   - [ ] Mobile (~260px width)

### Mascot Testing:
1. **Load all 18 HTML pages**
2. **Verify mascot appears in top-left**
3. **Verify sizes:**
   - [ ] Desktop: 160px
   - [ ] Tablet: 120px
   - [ ] Mobile: 100px
4. **Test click** (should go to homepage)

---

## Commit Message Templates

### Feature:
```
feat: [description]

- [change 1]
- [change 2]
- [change 3]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Fix:
```
fix: [description]

Problem: [what was broken]
Solution: [how it was fixed]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Test:
```
test: [description]

- Added tests for [feature]
- Coverage: [percentage]%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Notes

- **Replit Pull Reminders:** After each push to GitHub, pull in Replit before testing
- **Branch:** All work on `feat/audit-prep`
- **Testing:** Manual testing required after each session
- **Database:** Use Supabase dashboard to verify data insertion
- **Logs:** Monitor Replit console for webhook/image processing logs

---

**Last Updated:** 2025-10-17
**Status:** Ready to Execute
**Total Estimated Time:** 5-6 hours (across 4 sessions)
