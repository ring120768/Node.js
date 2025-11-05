# Page-by-Page Reconciliation Process

**Purpose**: Systematically verify and fix field mapping for all form pages to ensure 0% data loss.

**Status**: In Progress - Page 10 Complete ✅

---

## 📋 Process Overview

For each page, we follow this 4-step process:

### 1️⃣ **REVIEW** - Analyze the page
- Identify all fields collected on frontend
- Check backend controller mapping
- Verify database columns exist
- Document any discrepancies

### 2️⃣ **ITERATE** - Fix issues found
- Create database migration if columns missing
- Update backend controller mapping
- Fix frontend inconsistencies
- Update documentation

### 3️⃣ **CONFIRM** - Verify fixes
- Review migration SQL
- Check controller field mappings
- Verify field name consistency
- Get user approval before proceeding

### 4️⃣ **TEST** - Validate end-to-end
- Run automated test script
- Manual test with real data
- Verify database persistence
- Document results

---

## 📊 Page Status Tracker

| Page | Form File | Backend Section | Status | Data Loss | Notes |
|------|-----------|----------------|--------|-----------|-------|
| **1** | signup-auth.html | N/A (auth only) | ⏳ Pending | TBD | Authentication page |
| **2** | signup-form.html (p2) | user_signup table | ⏳ Pending | TBD | Personal details |
| **3** | signup-form.html (p3) | user_signup table | ⏳ Pending | TBD | Vehicle details |
| **4** | incident-form-page4.html | Page 4 mapping | ✅ Fixed | 0% | Location, map screenshots |
| **4a** | incident-form-page4a-location-photos.html | Photo finalization | ✅ Fixed | 0% | Scene photos |
| **5** | incident-form-page5-vehicle-details.html | Page 5 mapping | ⏳ Pending | TBD | Your vehicle |
| **6** | incident-form-page6-vehicle-images.html | Photo finalization | ✅ Fixed | 0% | Damage photos |
| **7** | incident-form-page7-other-vehicles.html | incident_other_vehicles | ⏳ Pending | TBD | Other vehicles |
| **8** | incident-form-page8-incident-details.html | Page 8 mapping | ⏳ Pending | TBD | Accident details |
| **9** | incident-form-page9-witnesses.html | Page 9 mapping | ⏳ Pending | TBD | Witness info |
| **10** | incident-form-page10-police-details.html | Page 10 mapping | ✅ Fixed | 0% | Police & safety (migration pending) |
| **11** | incident-form-page11-injuries.html | Page 11 mapping | ⏳ Pending | TBD | Injury details |
| **12** | incident-form-page12-medical.html | Page 12 mapping | ⏳ Pending | TBD | Medical treatment |
| **13** | incident-form-page13-confirmation.html | Final submission | ⏳ Pending | TBD | Summary & submit |

---

## 🔍 Review Checklist (Step 1)

For each page, answer these questions:

### Frontend Analysis
- [ ] How many fields does the page collect?
- [ ] What are the field names in localStorage/sessionStorage?
- [ ] Are there any conditional fields (only shown based on user selection)?
- [ ] Does the page use localStorage or sessionStorage?
- [ ] Are there any file uploads (photos, documents)?

### Backend Analysis
- [ ] Which controller section handles this page's data?
- [ ] How many fields are mapped in the controller?
- [ ] Do the field names match the frontend exactly?
- [ ] Are there proper type conversions (string → boolean, etc.)?
- [ ] Are conditional fields handled correctly?

### Database Analysis
- [ ] Which table(s) store this page's data?
- [ ] How many columns exist for this page?
- [ ] Do all frontend fields have corresponding columns?
- [ ] Are data types correct (TEXT, BOOLEAN, INTEGER, etc.)?
- [ ] Are there any indexes for performance?

### Discrepancy Analysis
- [ ] **Missing columns**: Frontend fields with no DB column
- [ ] **Name mismatches**: Different names between frontend/backend/DB
- [ ] **Missing mappings**: Frontend fields not mapped in controller
- [ ] **Type issues**: Incorrect type conversions or storage
- [ ] **Storage issues**: sessionStorage vs localStorage inconsistencies

---

## 🔧 Iteration Checklist (Step 2)

### Database Migration (if needed)
- [ ] Create migration file: `supabase/migrations/00X_add_pageN_fields.sql`
- [ ] Add missing columns with correct types
- [ ] Add column comments for documentation
- [ ] Add indexes where appropriate
- [ ] Include rollback instructions
- [ ] Test migration syntax

### Backend Controller Updates
- [ ] Locate page mapping section in `incidentForm.controller.js`
- [ ] Update field names to match frontend
- [ ] Add missing field mappings
- [ ] Fix type conversions (boolean, integer, etc.)
- [ ] Handle conditional logic correctly
- [ ] Add inline comments

### Frontend Fixes (if needed)
- [ ] Fix localStorage vs sessionStorage inconsistencies
- [ ] Update field names if needed
- [ ] Fix validation logic if needed
- [ ] Ensure data structure consistency

### Documentation
- [ ] Create/update page-specific documentation
- [ ] Document all field mappings
- [ ] Include before/after comparisons
- [ ] Add testing instructions
- [ ] Include troubleshooting guide

---

## ✅ Confirmation Checklist (Step 3)

Before applying fixes:

### Code Review
- [ ] Review migration SQL for syntax errors
- [ ] Check controller mappings line-by-line
- [ ] Verify field name consistency
- [ ] Review type conversions
- [ ] Check conditional logic

### User Approval
- [ ] Present findings summary
- [ ] Show before/after comparison
- [ ] Explain impact (data loss percentage)
- [ ] Get explicit confirmation to proceed

### Pre-Deployment Check
- [ ] All files created/modified
- [ ] No syntax errors
- [ ] Documentation complete
- [ ] Test script ready

---

## 🧪 Testing Checklist (Step 4)

### Automated Tests
- [ ] Create test script: `test-pageN-persistence.js`
- [ ] Test 1: Database schema verification
- [ ] Test 2: Frontend field name validation
- [ ] Test 3: Backend mapping verification
- [ ] Test 4: Data persistence with real data
- [ ] Test 5: Type conversion validation
- [ ] Test 6: Conditional logic validation
- [ ] Run test suite and document results

### Manual Testing
- [ ] Open page in browser
- [ ] Fill out all fields (include edge cases)
- [ ] Complete form submission
- [ ] Query database to verify data saved
- [ ] Check all fields persisted correctly
- [ ] Verify data types correct
- [ ] Test conditional logic paths

### Regression Testing
- [ ] Test previous pages still work
- [ ] Verify no data loss on earlier pages
- [ ] Check photo uploads still work
- [ ] Confirm full form submission works

---

## 📝 Page Review Template

Use this template for each page:

```markdown
## Page [N]: [Page Name]

**File**: `[filename].html`
**Backend**: `[controller section or table]`
**Status**: ⏳ Pending Review

### 1️⃣ REVIEW

#### Frontend Fields ([X] total)
1. field_name_1 (type) - Description
2. field_name_2 (type) - Description
...

#### Backend Mapping ([Y] fields mapped)
- ✅ field_name_1 → column_name_1 (matches)
- ❌ field_name_2 → **MISSING** (not mapped)
...

#### Database Schema ([Z] columns)
- ✅ column_name_1 (TYPE) - Exists
- ❌ column_name_2 - **MISSING** (needs migration)
...

#### Discrepancies Found
- **Missing columns**: [count]
- **Name mismatches**: [count]
- **Missing mappings**: [count]
- **Data loss estimate**: [percentage]%

### 2️⃣ ITERATE

#### Migration Required: [Yes/No]
[If yes, list columns to add]

#### Controller Updates Required: [Yes/No]
[If yes, list mappings to fix/add]

#### Frontend Updates Required: [Yes/No]
[If yes, list changes needed]

### 3️⃣ CONFIRM

**Impact Summary**:
- Before: [X]% data loss
- After: 0% data loss
- Critical fields affected: [list]

**User Approval**: ⏳ Awaiting confirmation

### 4️⃣ TEST

**Automated Tests**: ⏳ Not run yet
**Manual Tests**: ⏳ Not run yet
**Regression Tests**: ⏳ Not run yet

**Final Status**: ⏳ Pending
```

---

## 🎯 Success Criteria

For each page to be considered "complete":

1. ✅ All frontend fields identified and documented
2. ✅ All database columns exist (migration applied if needed)
3. ✅ All fields mapped correctly in backend controller
4. ✅ 0% data loss verified through testing
5. ✅ localStorage/sessionStorage consistent with other pages
6. ✅ Documentation complete
7. ✅ Automated test script created and passing
8. ✅ Manual test completed with real data
9. ✅ Regression test confirms no impact on other pages
10. ✅ Changes committed to git with clear commit message

---

## 📁 File Organization

For each page reconciliation, create:

### Documentation
- `docs/PAGE_[N]_RECONCILIATION.md` - Complete page analysis and fixes

### Tests
- `test-page[N]-persistence.js` - Automated test suite

### Migrations (if needed)
- `supabase/migrations/00[X]_add_page[N]_fields.sql` - Database changes

### Scripts (if needed)
- `scripts/run-page[N]-migration.js` - Migration runner

---

## 🚀 Current Progress

**Completed Pages**: 3 (Pages 4, 4a, 6, 10)
**Remaining Pages**: 10 (Pages 1-3, 5, 7-9, 11-13)

**Next Page**: Page 1 (signup-auth.html)

---

## 💡 Tips for Efficiency

1. **Batch similar pages**: If Pages 8-9 have similar structure, review together
2. **Reuse patterns**: Use Page 10 as template for similar fixes
3. **Automate where possible**: Create reusable test scripts
4. **Document as you go**: Don't wait until end to write docs
5. **Test frequently**: Don't batch all testing to the end

---

**Last Updated**: 2025-11-04
**Process Version**: 1.0
