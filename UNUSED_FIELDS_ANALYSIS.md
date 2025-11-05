# Unused Fields Analysis - Database Cleanup Opportunity

**Analysis Date**: 2025-10-31
**Database Columns**: 106 in `incident_reports` table
**New HTML Form Fields**: 99 fields
**Finding**: **27 database columns are no longer used** by the new HTML forms

---

## EXECUTIVE SUMMARY

### Database State
- **Total columns**: 106 in `incident_reports`
- **Unused legacy fields**: 27 columns (25.5%)
- **Still in use**: 79 columns (74.5%)
- **New fields needed**: 20+ fields from new HTML forms

### Recommendation
**Soft delete unused fields** - Mark as deprecated, keep for 7 years (GDPR retention), then hard delete.

---

## PART 1: UNUSED LEGACY FIELDS (27 fields)

These fields exist in the database but are **NOT** in the new HTML forms:

### Typeform-Specific Fields (7 fields)
❌ `form_id` - Typeform form identifier (no longer needed)
❌ `transcription_id` - Old transcription system (replaced)
❌ `submit_date` - Redundant with `created_at`
❌ `accident_reference_number` - Auto-generated, not user input
❌ `retention_until` - GDPR calculated field (redundant)
❌ `upgrade_to_premium` - Old upsell field (removed)
❌ `deleted_at` - Soft delete timestamp (system field, keep)

### Old File URL Fields (10 fields)
❌ `file_url_documents` - Old document upload system
❌ `file_url_documents_1` - Duplicate document field
❌ `file_url_other_vehicle` - Old photo storage
❌ `file_url_other_vehicle_1` - Duplicate photo field
❌ `file_url_record_detailed_account_of_what_happened` - Audio recording (replaced)
❌ `file_url_scene_overview` - Old scene photo
❌ `file_url_scene_overview_1` - Duplicate scene photo
❌ `file_url_vehicle_damage` - Old damage photo
❌ `file_url_vehicle_damage_1` - Duplicate damage photo
❌ `file_url_vehicle_damage_2` - Duplicate damage photo

**Note**: New system uses `user_documents` table instead

### Redundant Weather Fields (3 fields)
❌ `weather_bright_daylight` - Merged into `visibility_level`
❌ `weather_dusk` - Merged into `visibility_level`
❌ `weather_street_lights` - Merged into `visibility_factors`

**Note**: New system uses checkbox arrays instead

### Old Medical Fields (3 fields)
❌ `medical_attention_from_who` - Replaced by `medical_hospital_name`
❌ `medical_please_be_completely_honest` - Removed (unnecessary prompt)
❌ `medical_uncontrolled_bleeding` - Merged into `medical_symptoms[]`

### Old Safety Check Fields (3 fields)
❌ `six_point_safety_check` - Removed (too complex for users)
❌ `call_emergency_contact` - Removed (not legal requirement)
❌ `call_recovery` - Replaced by `recovery_company_name` + `recovery_company_phone`

### Unclear/Poorly Named Fields (1 field)
❌ `anything_else` - Vague catch-all (replaced by structured fields)

---

## PART 2: FIELDS STILL IN USE (79 fields)

These database columns **ARE USED** by the new HTML forms:

### Basic Incident Info (9 fields)
✅ `when_did_the_accident_happen` → Maps to `accident_date`
✅ `what_time_did_the_accident_happen` → Maps to `accident_time`
✅ `where_exactly_did_this_happen` → Maps to `location`
✅ `license_plate_number` → Maps to `license_plate`
✅ `make_of_car` → Maps to vehicle info
✅ `model_of_car` → Maps to vehicle info
✅ `speed_limit` → Still used
✅ `direction_and_speed` → Maps to `your_speed`
✅ `date` → Still used

### Medical Fields (13 fields)
✅ `medical_attention` → Maps to `medical_attention_needed`
✅ `medical_severe_headache` → Maps to `medical_symptom_severe_headache`
✅ `medical_loss_of_consciousness` → Maps to `medical_symptom_loss_of_consciousness`
✅ `medical_chest_pain` → Maps to `medical_symptom_chest_pain`
✅ `medical_breathlessness` → Maps to `medical_symptom_breathlessness`
✅ `medical_abdominal_pain` → Maps to `medical_symptom_abdominal_pain`
✅ `medical_abdominal_bruising` → Merged into symptoms
✅ `medical_limb_pain` → Maps to `medical_symptom_limb_pain_mobility`
✅ `medical_limb_weakness` → Merged into symptoms
✅ `medical_change_in_vision` → Maps to `medical_symptom_vision_problems`
✅ `medical_none_of_these` → Maps to `medical_symptom_none`
✅ `medical_how_are_you_feeling` → Maps to `final_feeling`
✅ `further_medical_attention` → Still used

### Weather Conditions (9 fields)
✅ `weather_conditions` → General weather field
✅ `weather_clear_and_dry` → Maps to `weather_clear`
✅ `weather_overcast` → Maps to `weather_cloudy`
✅ `weather_light_rain` → Maps to `weather_drizzle`
✅ `weather_heavy_rain` → Still used
✅ `weather_fog` → Still used
✅ `weather_snow` → Still used
✅ `weather_snow_on_road` → Maps to `road_surface_snow_covered`
✅ `weather_wet_road` → Maps to `road_surface_wet`

### Vehicle Damage (6 fields)
✅ `damage_to_your_vehicle` → Maps to `damage_description`
✅ `damage_caused_by_accident` → Still used
✅ `any_damage_prior` → Still used
✅ `airbags_deployed` → Maps to `damage_airbags_deployed`
✅ `wearing_seatbelts` → Maps to `damage_seatbelts_used`
✅ `reason_no_seatbelts` → Still used

### Road/Junction Info (10 fields)
✅ `road_type` → Still used
✅ `junction_information` → Still used
✅ `junction_information_t_junction` → Maps to `junction_type`
✅ `junction_information_crossroads` → Maps to `junction_type`
✅ `junction_information_roundabout` → Maps to `junction_type`
✅ `junction_information_traffic_lights` → Maps to `junction_control`
✅ `special_conditions` → Still used
✅ `special_conditions_roadworks` → Maps to hazards
✅ `special_conditions_animals` → Maps to `hazard_animals`
✅ `special_conditions_workman` → Maps to hazards

### Other Driver/Vehicle (11 fields)
✅ `other_drivers_name` → Still used
✅ `other_drivers_number` → Maps to `other_driver_phone`
✅ `other_drivers_address` → Still used
✅ `other_make_of_vehicle` → Maps to `other_vehicle_make`
✅ `other_model_of_vehicle` → Maps to `other_vehicle_model`
✅ `vehicle_license_plate` → Maps to `other_vehicle_registration`
✅ `other_insurance_company` → Still used
✅ `other_policy_number` → Maps to `other_insurance_policy_number`
✅ `other_policy_holder` → Still used
✅ `other_policy_cover` → Still used
✅ `other_damage_accident` → Still used

### Police/Witness/Other (11 fields)
✅ `did_police_attend` → Maps to `police_attended`
✅ `police_force_details` → Still used
✅ `police_officers_name` → Still used
✅ `police_officer_badge_number` → Still used
✅ `breath_test` → Maps to `breath_test_you`
✅ `other_breath_test` → Maps to `breath_test_other_driver`
✅ `any_witness` → Maps to `witnesses_present`
✅ `witness_contact_information` → Still used
✅ `are_you_safe` → Still used
✅ `impact` → Maps to damage fields
✅ `detailed_account_of_what_happened` → Maps to `accident_narrative`

### System Fields (10 fields - KEEP)
✅ `id` - Primary key
✅ `create_user_id` - User reference
✅ `auth_user_id` - Supabase Auth reference
✅ `user_id` - Duplicate user reference
✅ `created_at` - Timestamp
✅ `updated_at` - Timestamp
✅ `deleted_at` - Soft delete (GDPR)
✅ `file_url_what3words` - Location reference
✅ `other_damage_prior` - Pre-accident damage tracking
✅ `special_conditions_oil_spills` - Road hazard
✅ `special_conditions_defective_road` - Road hazard

---

## PART 3: NEW FIELDS NEEDED (20+ fields)

These fields are in the new HTML forms but **NOT YET** in the database:

### New Medical Fields (7 fields)
🆕 `medical_ambulance_called` - Yes/No/N/A radio
🆕 `medical_hospital_name` - Text input
🆕 `medical_injury_severity` - 5-level radio group
🆕 `medical_symptom_dizziness` - Checkbox
🆕 `medical_symptom_nausea` - Checkbox
🆕 `medical_symptom_back_neck_pain` - Checkbox
🆕 `medical_symptom_whiplash` - Checkbox
🆕 `medical_symptom_psychological_distress` - Checkbox
🆕 `medical_symptom_other` - Checkbox
🆕 `medical_injury_details` - Textarea
🆕 `medical_treatment_received` - Textarea

### New Location Fields (2 fields)
🆕 `what3words` - what3words address (separate from file_url)
🆕 `nearestLandmark` - Landmark reference

### New Visibility Fields (8 fields)
🆕 `visibility_level` - 6-level radio group (Excellent to Zero)
🆕 `road_markings_visibility` - 4-level radio group
🆕 `visibility_factor_rain` - Checkbox
🆕 `visibility_factor_fog` - Checkbox
🆕 `visibility_factor_snow` - Checkbox
🆕 `visibility_factor_headlight_glare` - Checkbox
🆕 `visibility_factor_sun_glare` - Checkbox
🆕 `visibility_factor_other` - Checkbox

### New Traffic/Road Fields (4 fields)
🆕 `traffic_density` - 4-level radio (Light/Moderate/Heavy/Stationary)
🆕 `traffic_light_status` - 5-option radio
🆕 `hazard_pedestrians` - Checkbox
🆕 `hazard_cyclists` - Checkbox

### New Vehicle Fields (3 fields)
🆕 `usual_vehicle` - Yes/No radio (was this your regular vehicle?)
🆕 `damage_still_driveable` - Yes/No radio
🆕 `damage_impact_point_front` - Checkbox
🆕 `damage_impact_point_rear` - Checkbox

### New Other Driver Fields (2 fields)
🆕 `other_vehicle_color` - Text input
🆕 `other_driver_admitted_fault` - Yes/No/Unsure radio

### New Recovery Fields (3 fields)
🆕 `recovery_company_name` - Text input
🆕 `recovery_company_phone` - Text input
🆕 `vehicle_current_location` - Textarea

### New Declaration Fields (4 fields)
🆕 `declaration_full_name` - Text input
🆕 `declaration_date` - Date input
🆳 `declaration_time` - Time input
🆕 `declaration_signature` - Signature field

### New Manoeuvre Field (1 field)
🆕 `your_manoeuvre` - Dropdown (20+ options)

### New Metadata Fields (3 fields)
🆕 `report_generated_date` - Auto-populated
🆕 `report_generated_time` - Auto-populated
🆕 `report_uuid` - Auto-populated unique ID

### New Weather Checkbox Fields (Array Storage)
🆕 `weather_bright_sunlight` - Checkbox
🆕 `weather_raining` - Checkbox (generic rain)
🆕 `weather_ice` - Checkbox
🆕 `weather_hail` - Checkbox
🆕 `weather_windy` - Checkbox
🆕 `weather_thunder_lightning` - Checkbox
🆕 `weather_other` - Checkbox
🆕 `weather_unknown` - Checkbox

### New Road Surface Checkbox Fields (Array Storage)
🆕 `road_surface_dry` - Checkbox
🆕 `road_surface_icy` - Checkbox
🆕 `road_surface_loose_surface` - Checkbox
🆕 `road_surface_other` - Checkbox

---

## PART 4: CLEANUP RECOMMENDATIONS

### Phase 1: Soft Delete Unused Fields (Immediate)
**Action**: Mark these 27 fields as deprecated in database schema

**SQL Migration**:
```sql
-- Add deprecation comment to unused fields
COMMENT ON COLUMN incident_reports.form_id IS 'DEPRECATED: Typeform legacy field. Remove after 2032-10-31 (7-year retention)';
COMMENT ON COLUMN incident_reports.file_url_documents IS 'DEPRECATED: Old upload system. Use user_documents table instead.';
-- ... repeat for all 27 fields
```

**Code Changes**:
- Stop writing to these fields in controllers
- Keep fields in SELECT queries for backwards compatibility (read old reports)
- Add `@deprecated` JSDoc comments in code

### Phase 2: Add New Fields (Next Sprint)
**Action**: Add 20+ new fields via migration

**Recommended Approach**: PostgreSQL TEXT[] arrays for checkboxes
```sql
ALTER TABLE incident_reports ADD COLUMN medical_symptoms TEXT[];
ALTER TABLE incident_reports ADD COLUMN weather_conditions TEXT[];
ALTER TABLE incident_reports ADD COLUMN road_surface_conditions TEXT[];
ALTER TABLE incident_reports ADD COLUMN visibility_factors TEXT[];
-- ... etc
```

**Benefits**:
- Reduces 45 checkbox columns to 6 array columns
- Easier to query ("does array contain X?")
- More flexible (add new checkboxes without migrations)

### Phase 3: Hard Delete (After 7 Years - 2032)
**Action**: Drop deprecated columns after GDPR retention period

**SQL Migration** (2032-10-31):
```sql
ALTER TABLE incident_reports DROP COLUMN form_id;
ALTER TABLE incident_reports DROP COLUMN file_url_documents;
-- ... drop all 27 deprecated fields
```

---

## PART 5: STORAGE OPTIMIZATION

### Current State
- 106 total columns in `incident_reports`
- Many individual checkbox columns (inefficient)

### Proposed State
- Remove 27 unused legacy fields
- Add 20+ new fields (but use arrays for checkboxes)
- **Net result**: ~99 database columns (vs 106 now)

### Storage Savings
Using PostgreSQL TEXT[] arrays for checkbox groups:

**Before** (Current):
```
medical_severe_headache BOOLEAN
medical_chest_pain BOOLEAN
medical_breathlessness BOOLEAN
... (14 columns for medical symptoms)
```

**After** (Optimized):
```
medical_symptoms TEXT[]
-- Example value: ['severe_headache', 'chest_pain', 'breathlessness']
```

**Savings**: 14 columns → 1 column (13 column reduction per checkbox group)

### Total Optimization
- Medical symptoms: 14 → 1 column (saves 13)
- Weather conditions: 14 → 1 column (saves 13)
- Road surface: 6 → 1 column (saves 5)
- Visibility factors: 6 → 1 column (saves 5)
- Hazards: 3 → 1 column (saves 2)
- Damage impact points: 2 → 1 column (saves 1)

**Total**: 45 columns → 6 columns (saves 39 columns)

**Final count**: 106 - 27 (removed) - 39 (optimized) + 6 (arrays) + 20 (new singles) = **66 total columns**

---

## PART 6: MIGRATION PLAN

### Week 1: Preparation
1. Export all existing data (backup)
2. Document field mappings (old → new)
3. Create migration scripts
4. Test migrations on staging database

### Week 2: Soft Delete
1. Deploy code that stops writing to deprecated fields
2. Add deprecation comments to schema
3. Monitor for any errors
4. Update documentation

### Week 3: Add New Fields
1. Run migration to add new columns (arrays + singles)
2. Deploy controller updates to write new data
3. Test new HTML forms → database flow
4. Verify PDF generation works with new fields

### Week 4: Validation
1. Compare old vs new data structures
2. Ensure old reports still display correctly
3. Test GDPR export includes both old and new fields
4. Performance testing

### 2032: Hard Delete
1. Verify no systems depend on deprecated fields
2. Run migration to DROP deprecated columns
3. Update all queries to remove references
4. Clean up code comments

---

## PART 7: RISK ASSESSMENT

### Low Risk
✅ Soft delete (keeps data, just stops using it)
✅ Adding new columns (non-breaking change)
✅ Using arrays for new checkboxes

### Medium Risk
⚠️ Migrating old checkbox data to arrays (requires data transformation)
⚠️ PDF generation may reference old field names
⚠️ Old reports must still display correctly

### High Risk
❌ Hard deleting columns before retention period ends (GDPR violation)
❌ Losing data during migration (backup required)
❌ Breaking existing integrations (need comprehensive testing)

### Mitigation Strategies
1. **Always backup before migrations**
2. **Test on staging database first**
3. **Deploy in phases (soft delete → add new → hard delete)**
4. **Keep deprecated fields for 7 years (GDPR compliance)**
5. **Maintain backwards compatibility in queries**

---

## SUMMARY

### Current Database State
- **106 total columns** in `incident_reports`
- **27 unused legacy fields** (25.5% waste)
- **79 fields still in use** (74.5%)

### Cleanup Opportunity
- **Remove**: 27 deprecated fields (soft delete now, hard delete 2032)
- **Add**: 20+ new fields (mostly arrays for checkboxes)
- **Optimize**: 45 checkbox columns → 6 arrays (saves 39 columns)
- **Final count**: ~66 optimized columns (37% reduction)

### Benefits
✅ **Cleaner schema** - Remove confusing legacy fields
✅ **Better performance** - Fewer columns to scan
✅ **Easier maintenance** - Arrays more flexible than individual columns
✅ **GDPR compliant** - 7-year retention before hard delete
✅ **Cost savings** - Smaller database size

### Next Steps
1. Review this analysis
2. Approve soft delete of 27 legacy fields
3. Approve addition of new fields as arrays
4. Schedule migration for next sprint
5. Update controllers and PDF generator

---

**Document Version**: 1.0
**Analysis Date**: 2025-10-31
**Recommendation**: **Proceed with soft delete + array optimization**
**Estimated Effort**: 2-3 weeks for full migration
**Risk Level**: **Low** (with proper backups and testing)
