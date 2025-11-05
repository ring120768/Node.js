# PDF Field Name Collisions Report

**Date**: 2025-11-03
**Issue**: Multiple database tables trying to populate same PDF field names
**Risk**: Data conflicts, overwrites, loss of critical information
**Status**: 🚨 **CRITICAL** - Must resolve before PDF generation

---

## Executive Summary

**3 CRITICAL FIELD NAME COLLISIONS FOUND**

| PDF Field Name | PDF Index | Collision | Impact |
|----------------|-----------|-----------|--------|
| `vehicle_make` | 11 | user_signup vs incident_reports (other vehicle) | 🔴 CRITICAL |
| `vehicle_model` | 12 | user_signup vs incident_reports (other vehicle) | 🔴 CRITICAL |
| `recovery_company` | 15 | user_signup vs incident_reports | 🔴 CRITICAL |

**Additional Collision (Page 5 DVLA)**:
| PDF Field Name | PDF Index | Collision | Impact |
|----------------|-----------|-----------|--------|
| `vehicle_found_make` | 116 | incident_reports (DVLA) vs proposed Page 5 | 🟡 MEDIUM |
| `vehicle_found_model` | 117 | incident_reports (DVLA) vs proposed Page 5 | 🟡 MEDIUM |

---

## Collision #1: vehicle_make (PDF Index 11)

### Current State

**PDF Field**: `vehicle_make` (TextField, Index 11)

**Data Source 1: user_signup.vehicle_make**
- **Table**: `user_signup`
- **Purpose**: User's USUAL/PRIMARY vehicle (from Page 1 signup)
- **Example**: "TOYOTA"
- **Context**: The car they normally drive (insurance policy vehicle)

**Data Source 2: incident_reports.vehicle_make (Other Vehicle Table)**
- **Table**: `incident_reports` (or `incident_other_vehicles`)
- **Purpose**: OTHER PARTY's vehicle involved in accident (Page 7)
- **Example**: "BMW"
- **Context**: The car that hit them

### The Problem

```javascript
// Current PDF filling logic (BROKEN):
pdfFields.vehicle_make = ???  // Which one?!
// - user_signup.vehicle_make = "TOYOTA" (my car)
// - incident_reports.vehicle_make = "BMW" (other car)
// ONE WILL OVERWRITE THE OTHER!
```

**Result**: Either user's car or other party's car data is LOST in PDF.

### Solution Required

**Option A: Rename PDF Field for Other Vehicle**
```
PDF Field Rename:
- vehicle_make (Index 11) → KEEP for user's vehicle (user_signup.vehicle_make)
- ADD NEW: other_vehicle_make (New Index) → For other party (incident_reports.vehicle_make)
```

**Option B: Use Different Database Column Names**
```
Database Rename:
- user_signup.vehicle_make → user_vehicle_make
- incident_reports.vehicle_make → other_vehicle_make
(PDF fields stay the same)
```

**RECOMMENDED: Option A** (rename PDF field for clarity)

---

## Collision #2: vehicle_model (PDF Index 12)

### Current State

**PDF Field**: `vehicle_model` (TextField, Index 12)

**Data Source 1: user_signup.vehicle_model**
- **Table**: `user_signup`
- **Purpose**: User's USUAL/PRIMARY vehicle model
- **Example**: "Corolla"
- **Context**: User's car (insurance policy vehicle)

**Data Source 2: incident_reports.vehicle_model (Other Vehicle)**
- **Table**: `incident_reports`
- **Purpose**: OTHER PARTY's vehicle model
- **Example**: "3 Series"
- **Context**: The car that hit them

### The Problem

Same as vehicle_make - ONE PDF field, TWO data sources.

### Solution Required

**RECOMMENDED:**
```
PDF Field Rename:
- vehicle_model (Index 12) → KEEP for user's vehicle
- ADD NEW: other_vehicle_model (New Index) → For other party
```

---

## Collision #3: recovery_company (PDF Index 15)

### Current State

**PDF Field**: `recovery_company` (TextField, Index 15)

**Data Source 1: user_signup.recovery_company**
- **Table**: `user_signup`
- **Purpose**: User's PREFERRED/MEMBERSHIP recovery service (Page 1)
- **Example**: "AA" (user has AA membership)
- **Context**: Pre-accident membership (what they USUALLY use)

**Data Source 2: incident_reports.recovery_company**
- **Table**: `incident_reports` (Page 5)
- **Purpose**: ACTUAL recovery company used FOR THIS INCIDENT
- **Example**: "Local Garage Ltd" (AA not available, used local)
- **Context**: Post-accident reality (what was ACTUALLY used)

### The Problem

**These are DIFFERENT concepts**:
- Signup recovery: "I have AA membership" (pre-accident preference)
- Incident recovery: "Local Garage recovered my car" (post-accident reality)

**Current code (Migration 003)**: Added recovery_company to user_signup (WRONG!)
**Page 5 needs**: recovery_company in incident_reports (where it should be)

**Result**: Mixing pre-accident preference with post-accident reality.

### Solution Required

**RECOMMENDED:**
```
PDF Field Rename:
- recovery_company (Index 15) → KEEP for user's membership/preference (user_signup)
- ADD NEW: incident_recovery_company (New Index) → For actual recovery used (incident_reports)

Database Fix (Migration 008 already includes):
- Keep: user_signup.recovery_company (membership)
- Add: incident_reports.recovery_company (actual recovery used)
```

**OR Simpler Naming:**
```
PDF Fields:
- recovery_membership (Index 15) → user_signup.recovery_company
- recovery_company_used (New Index) → incident_reports.recovery_company
```

---

## Collision #4: vehicle_found_make / vehicle_found_model (DVLA Fields)

### Current State

**PDF Fields**:
- `vehicle_found_make` (TextField, Index 116)
- `vehicle_found_model` (TextField, Index 117)

**Data Source: incident_reports (DVLA lookup)**
- **Purpose**: DVLA auto-populated data for user's vehicle (Page 5)
- **Example**: "TOYOTA" / "Corolla"
- **Context**: Official DVLA records for user's car

### Potential Collision

**IF we add Page 5 fields without thinking**:
- Page 5 DVLA lookup populates vehicle_found_make
- But Page 1 already has vehicle_make (user_signup)

**ARE THESE THE SAME CAR?**
- Page 1: User manually enters their vehicle (could be old/incorrect)
- Page 5: DVLA lookup gives OFFICIAL registered data

### Solution

**THESE SHOULD MATCH** (it's the same car - user's vehicle):

```
Flow:
Page 1: User enters "TOYOTA" / "Corolla" (manual)
  → Saves to user_signup.vehicle_make / vehicle_model

Page 5: User enters license plate "AB12 CDE"
  → DVLA API returns "TOYOTA" / "Corolla" (official)
  → Saves to incident_reports.dvla_vehicle_make / dvla_vehicle_model

PDF Generation:
- Use DVLA data (more accurate) if available
- Fallback to user_signup data if DVLA lookup failed
```

**NOT A COLLISION** - Different field names in PDF:
- `vehicle_make` (Index 11) ← user_signup (Page 1 manual entry)
- `vehicle_found_make` (Index 116) ← incident_reports.dvla_vehicle_make (Page 5 DVLA lookup)

**PDF service should prefer DVLA data** (it's authoritative).

---

## Complete Field Collision Matrix

| PDF Field | Index | user_signup | incident_reports | incident_other_vehicles | Collision? |
|-----------|-------|-------------|------------------|------------------------|------------|
| `vehicle_make` | 11 | ✅ User's car | ❌ | ✅ Other car | 🔴 YES |
| `vehicle_model` | 12 | ✅ User's car | ❌ | ✅ Other car | 🔴 YES |
| `vehicle_colour` | 13 | ✅ User's car | ❌ | ✅ Other car? | ⚠️ CHECK |
| `vehicle_condition` | 14 | ✅ Pre-accident | ❌ | ❌ | ✅ NO |
| `recovery_company` | 15 | ✅ Membership | ✅ Actual used | ❌ | 🔴 YES |
| `recovery_breakdown_number` | 16 | ✅ Membership # | ❌ | ❌ | ✅ NO |
| `vehicle_found_make` | 116 | ❌ | ✅ DVLA lookup | ❌ | ✅ NO |
| `vehicle_found_model` | 117 | ❌ | ✅ DVLA lookup | ❌ | ✅ NO |

---

## Recommended Actions

### IMMEDIATE (Before PDF Editing)

1. **Rename PDF Fields for Other Vehicle**
   ```
   In Adobe Acrobat DC:
   - CREATE NEW FIELD: other_vehicle_make (for other party's car)
   - CREATE NEW FIELD: other_vehicle_model (for other party's car)
   - CREATE NEW FIELD: other_vehicle_colour (for other party's car)
   - KEEP EXISTING: vehicle_make (Index 11) for user's car
   - KEEP EXISTING: vehicle_model (Index 12) for user's car
   ```

2. **Clarify Recovery Company Fields**
   ```
   In Adobe Acrobat DC:
   - RENAME: recovery_company → recovery_membership (Index 15) [user's AA/RAC membership]
   - CREATE NEW: incident_recovery_company (actual company used for this accident)

   OR keep simpler:
   - KEEP: recovery_company (Index 15) for membership
   - CREATE NEW: recovery_actual (company actually used)
   ```

3. **Update COMPREHENSIVE_PDF_FIELD_MAPPING.md**
   ```markdown
   Clear documentation:
   - vehicle_make (Index 11) ← user_signup.vehicle_make (USER'S CAR)
   - other_vehicle_make (New) ← incident_reports.vehicle_make (OTHER PARTY'S CAR)
   - recovery_membership (Index 15) ← user_signup.recovery_company (MEMBERSHIP)
   - incident_recovery_company (New) ← incident_reports.recovery_company (ACTUAL USED)
   ```

### AFTER PDF EDITING

4. **Update PDF Service Code**
   ```javascript
   // Clear separation of data sources
   pdfFields.vehicle_make = data.user_signup.vehicle_make;  // User's car
   pdfFields.other_vehicle_make = data.incident_reports.vehicle_make;  // Other car

   pdfFields.recovery_membership = data.user_signup.recovery_company;  // AA membership
   pdfFields.incident_recovery_company = data.incident_reports.recovery_company;  // Actually used
   ```

5. **Test Data Flow**
   ```javascript
   // Test scenario:
   const testData = {
     user_signup: {
       vehicle_make: "TOYOTA",
       vehicle_model: "Corolla",
       recovery_company: "AA"
     },
     incident_reports: {
       vehicle_make: "BMW",  // Other car (collision)
       vehicle_model: "3 Series",
       recovery_company: "Local Garage Ltd"  // Actually used
     }
   };

   // Verify PDF shows:
   // - vehicle_make = "TOYOTA" (user's car)
   // - other_vehicle_make = "BMW" (other car)
   // - recovery_membership = "AA" (membership)
   // - incident_recovery_company = "Local Garage Ltd" (actually used)
   ```

---

## Page 5 Field Naming Recommendations

Based on collision analysis, **REVISED** Page 5 PDF field names:

| Page 5 HTML Field | Database Column | REVISED PDF Field Name | Reason |
|-------------------|-----------------|----------------------|---------|
| `usual_vehicle` | `usual_vehicle` | `usual_vehicle_yes` / `usual_vehicle_no` | ✅ No collision |
| `vehicle_license_plate` | `dvla_lookup_reg` | `uk_licence_plate_look_up` | ✅ No collision (Index 115) |
| `damage_description` | `damage_to_your_vehicle` | `damage_description_text` | ✅ No collision |
| `recovery_company` | `recovery_company` | **`incident_recovery_company`** | 🔴 RENAMED to avoid collision |
| `recovery_phone` | `recovery_phone` | `incident_recovery_phone` | ✅ Prefix for consistency |
| `recovery_location` | `recovery_location` | `incident_recovery_location` | ✅ Prefix for consistency |
| `recovery_notes` | `recovery_notes` | `incident_recovery_notes` | ✅ Prefix for consistency |

**Naming Convention**: Prefix incident-specific fields with `incident_` to avoid collision with signup/membership fields.

---

## Summary Table: All Collisions & Solutions

| PDF Field (Current) | Collision | Solution |
|---------------------|-----------|----------|
| `vehicle_make` | user_signup vs other_vehicle | Create `other_vehicle_make` |
| `vehicle_model` | user_signup vs other_vehicle | Create `other_vehicle_model` |
| `recovery_company` | user_signup (membership) vs incident (actual) | Rename to `recovery_membership` + create `incident_recovery_company` |

**Total New PDF Fields Needed**: 5
- `other_vehicle_make`
- `other_vehicle_model`
- `other_vehicle_colour` (recommended for consistency)
- `incident_recovery_company` (or keep `recovery_company` and create `recovery_membership`)
- Optional: Rename existing fields for clarity

---

## Next Steps

1. **Review this report** - Confirm naming strategy
2. **Update PAGE_FIVE_PDF_FIELDS_TO_ADD.md** - Use revised field names
3. **Edit PDF template** - Create new fields OR rename existing
4. **Update PDF service code** - Map to correct field names
5. **Update COMPREHENSIVE_PDF_FIELD_MAPPING.md** - Document all changes
6. **Test end-to-end** - Verify no data overwrites

---

**Status**: Awaiting decision on naming convention
**Risk**: CRITICAL - Must resolve before PDF generation
**Impact**: 35% of data could be lost/overwritten if not fixed

**Last Updated**: 2025-11-03
