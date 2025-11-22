# Page 7 - Other Driver & Vehicle Naming Convention

**Date**: 2025-11-03
**Pattern**: Prefix all Page 7 fields with `other_` to prevent collisions with user's vehicle (Page 1) and incident vehicle (Page 5)

---

## Naming Convention Summary

| Page | Vehicle Type | Field Prefix | Database Table | PDF Pages |
|------|-------------|--------------|----------------|-----------|
| **Page 1** | User's USUAL/REGISTERED vehicle | None (e.g., `vehicle_make`) | `user_signup` | PDF 1-2 |
| **Page 5** | Vehicle in THIS ACCIDENT | `dvla_vehicle_lookup_*` | `incident_reports` | PDF 5 |
| **Page 7** | OTHER PARTY's vehicle | `other_vehicle_*` | `incident_reports` | PDF 7 |

---

## Page 7 Field Names (Based on CSV Column J)

### Other Driver Details

| UI Field | HTML Field Name | Database Column | Data Type | Notes |
|----------|-----------------|-----------------|-----------|-------|
| Full Name | `other_driver_name` | `other_driver_name` | text | Other party's name |
| Contact Number | `other_driver_phone` | `other_driver_phone` | text | UK phone format |
| Email Address | `other_driver_email` | `other_driver_email` | text | Optional |
| Driving License Number | `other_driver_license` | `other_driver_license` | text | Optional |

### Other Vehicle Details (DVLA Lookup + Fallback)

| UI Field | HTML Field Name | Database Column | Data Type | Notes |
|----------|-----------------|-----------------|-----------|-------|
| Other Vehicle Registration | `other_license_plate` | `other_license_plate` | text | For DVLA lookup |
| **DVLA Lookups (auto-populated):** |  |  |  |  |
| Vehicle Make | `other_vehicle_make` | `other_vehicle_make` | text | Auto or manual |
| Vehicle Model | `other_vehicle_model` | `other_vehicle_model` | text | Auto or manual |
| Vehicle Colour | `other_vehicle_colour` | `other_vehicle_colour` | text | Auto or manual |
| Vehicle Year | `other_vehicle_year` | `other_vehicle_year` | text | Auto or manual |
| Vehicle Fuel Type | `other_vehicle_fuel_type` | `other_vehicle_fuel_type` | text | Auto or manual |
| MOT Status | `other_vehicle_mot_status` | `other_vehicle_mot_status` | text | Auto or manual |
| MOT Expiry | `other_vehicle_mot_expiry` | `other_vehicle_mot_expiry` | text | Auto or manual |
| Tax Status | `other_vehicle_tax_status` | `other_vehicle_tax_status` | text | Auto or manual |
| Tax Due Date | `other_vehicle_tax_due_date` | `other_vehicle_tax_due_date` | text | Auto or manual |
| Insurance Status | `other_vehicle_insurance_status` | `other_vehicle_insurance_status` | text | Auto or manual |

### Other Vehicle Insurance

| UI Field | HTML Field Name | Database Column | Data Type | Notes |
|----------|-----------------|-----------------|-----------|-------|
| Insurance Company | `other_insurance_company` | `other_insurance_company` | text | Name of insurer |
| Policy Number | `other_policy_number` | `other_policy_number` | text | Optional |
| Policy Holder Name | `other_policy_holder` | `other_policy_holder` | text | May differ from driver |
| Policy Cover Type | `other_policy_cover` | `other_policy_cover` | text | Dropdown: Third Party, Comprehensive, etc. |

### Other Vehicle Damage

| UI Field | HTML Field Name | Database Column | Data Type | Notes |
|----------|-----------------|-----------------|-----------|-------|
| Point of Impact | `other_impact_point` | `other_impact_point` | text[] | Array of impact points |
| Describe Damage to Other Vehicle | `other_damage_description` | `other_damage_description` | text | Textarea |

---

## Why This Pattern Works

### ✅ **Prevents ALL Collisions**

**No Conflicts Between:**
- `vehicle_make` (Page 1 - user's usual car, `user_signup` table)
- `dvla_vehicle_lookup_make` (Page 5 - incident vehicle, `incident_reports` table)
- `other_vehicle_make` (Page 7 - other party's car, `incident_reports` table)

### ✅ **Crystal Clear Data Flow**

```javascript
// Example scenario: User in rental car, hit by BMW

Page 1 (Signup):
  vehicle_make: "TOYOTA"          // User's registered car
  vehicle_model: "Corolla"

Page 5 (Incident):
  dvla_vehicle_lookup_make: "FORD"  // Rental car user was driving
  dvla_vehicle_lookup_model: "Focus"

Page 7 (Other Party):
  other_vehicle_make: "BMW"        // Car that hit them
  other_vehicle_model: "3 Series"
```

### ✅ **PDF Mapping is Unambiguous**

```markdown
PDF Field Index 11: vehicle_make           → user_signup.vehicle_make
PDF Field Index 116: dvla_vehicle_lookup_make → incident_reports.dvla_vehicle_lookup_make
PDF Field Index NEW: other_vehicle_make    → incident_reports.other_vehicle_make
```

---

## Implementation Checklist for Page 7

### Phase 1: Update HTML Field Names
- [ ] Rename all `other_driver_*` fields to match convention
- [ ] Rename all `other_vehicle_*` DVLA lookup fields
- [ ] Rename `other_insurance_*` fields
- [ ] Update `other_impact_point` to use array

### Phase 2: Update Database Schema
- [ ] Verify all `other_*` columns exist in `incident_reports` table
- [ ] Ensure `other_impact_point` is TEXT[] (not TEXT)
- [ ] Add any missing columns

### Phase 3: Update PDF Template
- [ ] Add PDF fields with `other_vehicle_*` names (avoid collision with Index 11-12)
- [ ] Add `other_insurance_*` fields
- [ ] Add `other_driver_*` fields

### Phase 4: Update PDF Service Code
- [ ] Map `other_vehicle_make` → PDF field `other_vehicle_make`
- [ ] Map `other_insurance_company` → PDF field `other_insurance_company`
- [ ] Handle `other_impact_point` array → checkboxes

### Phase 5: Testing
- [ ] Test DVLA lookup for other vehicle
- [ ] Test manual entry fallback
- [ ] Test PDF generation with 3 different vehicles (user's, incident, other)
- [ ] Verify no data overwrites or collisions

---

## Flexibility Benefits

**Page 7 handles scenarios like:**
- ✅ Other party refuses to provide details (fields optional)
- ✅ Other party fled scene (no license plate for DVLA lookup)
- ✅ Hit-and-run (only partial vehicle description)
- ✅ Multiple other vehicles involved (repeater pattern)

---

**Status**: Pattern defined, ready for Page 7 implementation
**Next**: Apply this pattern when analyzing Page 7 HTML

**Last Updated**: 2025-11-03
