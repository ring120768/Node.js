# Supabase Schema Analysis Summary

**Date:** 2025-10-31
**Purpose:** Complete schema analysis for field mapping project
**Tables Analyzed:** user_signup, incident_reports, incident_witnesses, incident_other_vehicles

---

## Overview

This document provides a complete analysis of the current Supabase database schema, identifying existing columns, missing fields, and gaps between the old Typeform system and the new in-house HTML forms.

---

## Table 1: user_signup

**Purpose:** Stores personal information, vehicle details, and insurance data from user registration.

**Status:** ✅ Schema defined (from migrations and previous fixes)
**Column Count:** ~24 data fields + 5 image fields = 29 total

### Known Columns (from FIELD_MAPPING_FIX_SUMMARY.md):

**Personal Information:**
- `name` (maps from frontend `first_name`)
- `surname` (maps from frontend `last_name`)
- `email`
- `mobile` (maps from frontend `mobile_number`)

**Address:**
- `street_address`
- `town`
- `postcode`
- `country`

**Vehicle:**
- `vehicle_license` (maps from `driving_license`)
- `registration`
- `make`, `model`, `color`, `condition`

**Emergency Contact (Pipe-Delimited):**
- `emergency_contact` - Format: "Name | Phone | Email | Company"

**Recovery:**
- `recovery_breakdown_number`
- `recovery_breakdown_email`

**Insurance:**
- `insurance_company`
- `policy_number`
- `policy_cover`
- `policy_holder`

**Documents (5 Image Fields):**
- `file_url_driving_licence`
- `file_url_v5c`
- `file_url_mot`
- `file_url_insurance`
- `file_url_other`

**Audit Fields:**
- `create_user_id` (PRIMARY KEY)
- `created_at`, `updated_at`, `deleted_at`
- `gdpr_consent`
- `form_id`, `submit_date`

---

## Table 2: incident_reports

**Purpose:** Stores complete accident incident details (131+ columns from Typeform).

**Status:** ✅ Fully defined with 106 columns in current database
**Typeform Fields:** 131+ (120+ data fields + 11 image fields)

### Column Categories (from schema analysis):

**Medical Information (17 columns):**
- `medical_how_are_you_feeling`
- `medical_attention`, `medical_attention_from_who`
- `further_medical_attention`
- `are_you_safe`, `six_point_safety_check`
- `medical_chest_pain`, `medical_breathlessness`, `medical_abdominal_bruising`
- `medical_uncontrolled_bleeding`, `medical_severe_headache`
- `medical_change_in_vision`, `medical_abdominal_pain`
- `medical_limb_pain`, `medical_limb_weakness`
- `medical_loss_of_consciousness`, `medical_none_of_these`
- `medical_please_be_completely_honest`

**Accident Details (4 columns):**
- `when_did_the_accident_happen` (DATE)
- `what_time_did_the_accident_happen` (TIME)
- `where_exactly_did_this_happen` (TEXT)
- `detailed_account_of_what_happened` (TEXT - long narrative)

**Weather Conditions (12 columns):**
- `weather_conditions` (general)
- `weather_overcast`, `weather_street_lights`, `weather_heavy_rain`
- `weather_wet_road`, `weather_fog`, `weather_snow_on_road`
- `weather_bright_daylight`, `weather_light_rain`, `weather_clear_and_dry`
- `weather_dusk`, `weather_snow`

**Vehicle Information (6 columns):**
- `wearing_seatbelts`, `reason_no_seatbelts`
- `airbags_deployed`
- `damage_to_your_vehicle`
- `damage_caused_by_accident`, `any_damage_prior`

**Road Information (8 columns):**
- `road_type`, `speed_limit`
- `junction_information` (general)
- `junction_information_roundabout`, `junction_information_t_junction`
- `junction_information_traffic_lights`, `junction_information_crossroads`
- `direction_and_speed`

**Special Conditions (6 columns):**
- `special_conditions` (general)
- `special_conditions_animals`, `special_conditions_roadworks`
- `special_conditions_defective_road`, `special_conditions_oil_spills`
- `special_conditions_workman`

**Your Vehicle (3 columns):**
- `make_of_car`, `model_of_car`, `license_plate_number`
- `impact` (impact description)

**Other Driver Information (12 columns):**
- `other_drivers_name`, `other_drivers_number`, `other_drivers_address`
- `other_make_of_vehicle`, `other_model_of_vehicle`, `vehicle_license_plate`
- `other_policy_number`, `other_insurance_company`
- `other_policy_cover`, `other_policy_holder`
- `other_damage_accident`, `other_damage_prior`

**Police Information (7 columns):**
- `did_police_attend`
- `accident_reference_number`, `police_officer_badge_number`
- `police_officers_name`, `police_force_details`
- `breath_test`, `other_breath_test`

**Witness Information (2 columns):**
- `any_witness`, `witness_contact_information`

**Additional (4 columns):**
- `anything_else`
- `call_recovery`, `call_emergency_contact`
- `upgrade_to_premium`

**Document Uploads (11 Image Fields):**
- `file_url_documents`, `file_url_documents_1`
- `file_url_record_detailed_account_of_what_happened` (audio/video)
- `file_url_what3words` (location image)
- `file_url_scene_overview`, `file_url_scene_overview_1`
- `file_url_other_vehicle`, `file_url_other_vehicle_1`
- `file_url_vehicle_damage`, `file_url_vehicle_damage_1`, `file_url_vehicle_damage_2`

**System/Audit Fields (11 columns):**
- `id` (UUID primary key)
- `create_user_id` (links to user_signup)
- `auth_user_id`, `user_id` (authentication IDs)
- `form_id`, `date`, `submit_date`
- `transcription_id` (links to ai_transcription)
- `created_at`, `updated_at`, `deleted_at`
- `retention_until` (GDPR)

**Total:** 106 columns (current database state)

---

## Table 3: incident_witnesses

**Purpose:** Stores witness information (multiple witnesses per incident).

**Status:** ✅ Schema defined, table exists but empty
**Column Count:** 11 columns

### Columns (from SQL schema):

1. `id` - UUID PRIMARY KEY
2. `incident_id` - UUID (FK to incident_reports)
3. `create_user_id` - UUID (FK to user_signup)
4. `witness_name` - TEXT (required)
5. `witness_phone` - TEXT
6. `witness_email` - TEXT
7. `witness_address` - TEXT
8. `witness_statement` - TEXT (what they saw/heard)
9. `created_at` - TIMESTAMP WITH TIME ZONE
10. `updated_at` - TIMESTAMP WITH TIME ZONE
11. `deleted_at` - TIMESTAMP WITH TIME ZONE (soft delete)
12. `gdpr_consent` - BOOLEAN

**Indexes:**
- `idx_incident_witnesses_incident_id`
- `idx_incident_witnesses_user_id`
- `idx_incident_witnesses_deleted_at`

**RLS Policies:** ✅ Enabled (users can only access own records)

---

## Table 4: incident_other_vehicles

**Purpose:** Stores information about other vehicles involved (multiple vehicles per incident).

**Status:** ⚠️ Schema defined but MISSING 7 DVLA fields
**Current Columns:** 18 base columns
**Expected Columns:** 25 columns (after adding DVLA fields)

### Current Columns (from SQL schema):

**Primary Keys:**
1. `id` - UUID PRIMARY KEY
2. `incident_id` - UUID (FK to incident_reports)
3. `create_user_id` - UUID (FK to user_signup)

**Driver Information:**
4. `driver_name` - TEXT
5. `driver_phone` - TEXT
6. `driver_address` - TEXT
7. ⚠️ **MISSING:** `driver_email` - TEXT (DVLA field)

**Vehicle Information:**
8. `vehicle_license_plate` - TEXT (required for DVLA lookup)
9. `vehicle_make` - TEXT
10. `vehicle_model` - TEXT
11. `vehicle_color` - TEXT
12. `vehicle_year_of_manufacture` - TEXT
13. ⚠️ **MISSING:** `mot_status` - TEXT (DVLA field)
14. ⚠️ **MISSING:** `mot_expiry_date` - DATE (DVLA field)
15. ⚠️ **MISSING:** `tax_status` - TEXT (DVLA field)
16. ⚠️ **MISSING:** `tax_due_date` - DATE (DVLA field)
17. ⚠️ **MISSING:** `fuel_type` - TEXT (DVLA field)
18. ⚠️ **MISSING:** `engine_capacity` - TEXT (DVLA field)

**Insurance Information:**
19. `insurance_company` - TEXT
20. `policy_number` - TEXT
21. `policy_cover` - TEXT
22. `policy_holder` - TEXT
23. `last_v5c_issued` - TEXT

**Damage:**
24. `damage_description` - TEXT

**DVLA Metadata:**
25. `dvla_lookup_successful` - BOOLEAN
26. `dvla_lookup_timestamp` - TIMESTAMP WITH TIME ZONE
27. `dvla_error_message` - TEXT

**Audit Fields:**
28. `created_at` - TIMESTAMP WITH TIME ZONE
29. `updated_at` - TIMESTAMP WITH TIME ZONE
30. `deleted_at` - TIMESTAMP WITH TIME ZONE
31. `gdpr_consent` - BOOLEAN

**Indexes:**
- `idx_incident_other_vehicles_incident_id`
- `idx_incident_other_vehicles_user_id`
- `idx_incident_other_vehicles_deleted_at`
- `idx_incident_other_vehicles_license_plate` (for DVLA lookups)

**RLS Policies:** ✅ Enabled (users can only access own records)

---

## Missing Fields Summary

### ⚠️ incident_other_vehicles - Missing 7 DVLA Fields

These fields are required by the PDF generation system and DVLA integration but are NOT currently in the database schema:

1. **driver_email** (TEXT)
   - Why needed: Contact information for other driver
   - Used in: PDF report, email notifications

2. **mot_status** (TEXT)
   - Why needed: MOT validity status from DVLA
   - Values: 'Valid', 'No details held', 'No results returned'
   - Used in: PDF report page 16 (DVLA section)

3. **mot_expiry_date** (DATE)
   - Why needed: When MOT expires
   - Used in: PDF report page 16

4. **tax_status** (TEXT)
   - Why needed: Tax validity status from DVLA
   - Values: 'Taxed', 'SORN', 'Untaxed'
   - Used in: PDF report page 16

5. **tax_due_date** (DATE)
   - Why needed: When tax expires/renews
   - Used in: PDF report page 16

6. **fuel_type** (TEXT)
   - Why needed: Vehicle fuel type from DVLA
   - Values: 'Petrol', 'Diesel', 'Electric', 'Hybrid', etc.
   - Used in: PDF report page 16

7. **engine_capacity** (TEXT)
   - Why needed: Engine size from DVLA
   - Example: '1997cc'
   - Used in: PDF report page 16

**Action Required:** These 7 fields must be added to the `incident_other_vehicles` table before PDF generation can work correctly for witness/vehicle reports.

**SQL Migration File:** `scripts/update-incident-other-vehicles-table.sql`

---

## Comparison: Old Typeform vs. New In-House Forms

### Old Typeform System (Baseline):

| Table | Data Fields | Image Fields | Total |
|-------|-------------|--------------|-------|
| user_signup | 24 | 5 | 29 |
| incident_reports | 120+ | 11 | 131+ |
| **TOTAL** | **144+** | **16** | **160+** |

### New In-House Forms:

**HTML Form Pages Identified:**

**User Signup:**
1. `signup-auth.html` - Page 1 (Authentication)
2. `signup-form.html` - Pages 2-9 (Data collection)

**Incident Report:**
1. `incident-form-page1.html`
2. `incident-form-page2.html`
3. `incident-form-page3.html`
4. `incident-form-page4.html`
5. `incident-form-page4a-location-photos.html`
6. `incident-form-page5-vehicle.html`
7. `incident-form-page6-vehicle-images.html`
8. `incident-form-page7-other-vehicle.html`
9. `incident-form-page8-other-damage-images.html`
10. `incident-form-page9-witnesses.html`
11. `incident-form-page10-police-details.html`
12. `incident-form-page12-final-medical-check.html`

**Post-Incident:**
13. `transcription-status.html` - Audio transcription
14. `declaration.html` - Final legal declaration

**Total HTML Forms:** 16 files

---

## Next Steps

### Phase 1: ✅ COMPLETE
- [x] Read all 4 field mapping documentation files
- [x] Verify MCP servers working
- [x] Analyze Supabase schema

### Phase 2: IN PROGRESS
- [ ] Use Playwright MCP to analyze all 16 HTML form pages
- [ ] Extract ALL field names, types, and attributes
- [ ] Document field properties (required, patterns, validation)

### Phase 3: PENDING
- [ ] Compare HTML fields vs. Typeform baseline (160+ fields)
- [ ] Identify NEW fields in HTML forms (estimated 20-25)
- [ ] Identify REMOVED fields (if any)
- [ ] Map HTML field names to database column names

### Phase 4: PENDING
- [ ] Add 7 missing DVLA fields to incident_other_vehicles table
- [ ] Create field mapping document with ultrathinking
- [ ] Generate implementation plan with SQL migrations

---

**Report Generated:** 2025-10-31
**Next Action:** Use Playwright MCP to analyze HTML form pages and extract all field definitions
