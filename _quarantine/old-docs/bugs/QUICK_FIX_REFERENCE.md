# Quick Fix Reference Card

**🔴 CRITICAL BUG: Pages 5, 9, 10 Data Loss**
**📊 Impact: 46+ fields lost per submission**
**⏱️ Fix Time: 45 minutes**

---

## The Problem (1 Line)
Pages 5, 9, 10 save to `localStorage.pageX_data` but Page 12 reads from `sessionStorage.incident_pageX`

---

## The Fix (6 Lines)

### Page 5 (`/public/incident-form-page5-vehicle.html`)
```diff
- Line 1158: localStorage.setItem('page5_data', JSON.stringify(formData));
+ Line 1158: sessionStorage.setItem('incident_page5', JSON.stringify(formData));

- Line 1164: const saved = localStorage.getItem('page5_data');
+ Line 1164: const saved = sessionStorage.getItem('incident_page5');
```

### Page 9 (`/public/incident-form-page9-witnesses.html`)
```diff
- Line 605: localStorage.setItem('page9_data', JSON.stringify(data));
+ Line 605: sessionStorage.setItem('incident_page9', JSON.stringify(data));

- Line 605: const saved = localStorage.getItem('page9_data');
+ Line 605: const saved = sessionStorage.getItem('incident_page9');
```

### Page 10 (`/public/incident-form-page10-police-details.html`)
```diff
- Line 772: localStorage.setItem('page10_data', JSON.stringify(data));
+ Line 772: sessionStorage.setItem('incident_page10', JSON.stringify(data));

- Line 778: const saved = localStorage.getItem('page10_data');
+ Line 778: const saved = sessionStorage.getItem('incident_page10');
```

---

## Quick Test (30 seconds)

```javascript
// Open browser console (F12) and run:

// Fill Page 5, then check:
sessionStorage.getItem('incident_page5')  // Should return data

// Fill Page 9, then check:
sessionStorage.getItem('incident_page9')  // Should return data

// Fill Page 10, then check:
sessionStorage.getItem('incident_page10')  // Should return data

// If all return JSON (not null) = ✅ WORKING
```

---

## Before You Deploy

- [ ] Backup 3 files:
  - `incident-form-page5-vehicle.html`
  - `incident-form-page9-witnesses.html`
  - `incident-form-page10-police-details.html`

- [ ] Apply 6 changes (listed above)

- [ ] Test each page individually

- [ ] Complete end-to-end test (Page 1 → Page 12)

- [ ] Verify database receives all fields

---

## Verify Success

### Database Query
```sql
SELECT
  usual_vehicle,        -- Page 5 (should NOT be NULL)
  vehicle_license_plate, -- Page 5 (should NOT be NULL)
  witnesses_present,    -- Page 9 (should NOT be NULL)
  police_attended       -- Page 10 (should NOT be NULL)
FROM incident_reports
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: All fields populated (not NULL)

---

## Rollback (if needed)

```bash
# Restore from backup
cp /backup/incident-form-page5-vehicle.html /public/
cp /backup/incident-form-page9-witnesses.html /public/
cp /backup/incident-form-page10-police-details.html /public/
```

---

## Reference Implementation

**Page 7 is CORRECT** - use it as template:
```javascript
// Page 7 - Line 1350 ✅
sessionStorage.setItem('incident_page7', JSON.stringify(skipData));
```

---

## Full Documentation

See these files for complete details:
- `FIELD_MISMATCHES_REPORT.md` - Root cause analysis
- `RECOMMENDED_FIXES.md` - Complete code changes
- `PAGE_5_7_9_10_SPECIFIC_ANALYSIS.md` - Technical deep dive
- `FIELD_AUDIT_COMPLETE.csv` - Field comparison matrix
- `AUDIT_SUMMARY.md` - Executive summary

---

**Priority**: 🔴 CRITICAL
**Risk**: 🟢 LOW
**Time**: ⏱️ 45 min
**Fix**: ✅ READY
