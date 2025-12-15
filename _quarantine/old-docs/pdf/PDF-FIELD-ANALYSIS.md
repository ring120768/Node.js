# PDF Field Population Analysis

**Generated:** 2025-10-23
**Purpose:** Comprehensive analysis of PDF form fields vs. database data

---

## Executive Summary

### PDF Templates Analyzed

1. **Main Incident Report:** `Car-Crash-Lawyer-AI-incident-report.pdf`
   - **Total Fields:** 168 (130 text, 36 checkboxes, 2 signatures)

2. **Additional Vehicles/Witnesses:** `Car Crash Lawyer AI Incident Report other vehicles and witness.pdf`
   - **Total Fields:** 24 (all text)

**Grand Total:** 192 form fields across both PDFs

### Test Data Status

**Database Fields Populated:**
- User Signup: 63 fields
- Incident Report: 105 fields
- **Total in Database:** 168 fields

**PDF Generation Test Results:**
- ✅ PDF generated successfully (1961 KB)
- ✅ Data fetched from Supabase
- ⚠️ ~60 field mapping warnings (field name mismatches)

---

## Detailed Field Analysis

### Main PDF: 168 Fields

#### 1. Personal Information (17 fields)
**PDF Fields:**
```
- create_user_id              ✅ Populated
- driver_name                 ✅ Populated (maps to 'name')
- name                        ✅ Populated
- surname                     ✅ Populated
- email                       ✅ Populated
- mobile                      ✅ Populated
- street                      ✅ Populated (maps to 'street_address')
- street_address_optional     ✅ Populated
- town                        ✅ Populated
- postcode                    ✅ Populated
- country                     ✅ Populated
- driving_license_number      ✅ Populated
- driving_license_picture     ❌ URL field - not populated in test
- emergency_contact           ✅ Populated (pipe-delimited format)
- user_id                     ✅ Populated (same as create_user_id)
- form_id                     ❌ Not in test data
- submit_date                 ❌ Not in test data
```

#### 2. Vehicle Information - User's Vehicle (20 fields)
**PDF Fields:**
```
- license_plate                  ✅ Populated (maps to 'car_registration_number')
- license_plate_number           ✅ Populated
- vehicle_license_plate          ✅ Populated
- vehicle_make                   ✅ Populated
- make_of_car                    ✅ Populated
- model_of_car                   ✅ Populated
- vehicle_model                  ✅ Populated
- vehicle_colour                 ✅ Populated
- user_colour                    ✅ Populated
- vehicle_condition              ✅ Populated
- user_registration_number       ✅ From DVLA lookup
- user_make                      ✅ From DVLA lookup
- user_fuel_type                 ✅ From DVLA lookup
- user_year_of_manufacture       ✅ From DVLA lookup
- user_month_of_manufacture      ✅ From DVLA lookup
- user_vehicle_co2_emissions     ✅ From DVLA lookup
- user_vehicle_engine_capacity   ✅ From DVLA lookup
- user_mot_status                ✅ From DVLA lookup
- user_mot_expiry                ✅ From DVLA lookup
- user_tax_status                ✅ From DVLA lookup
```

**Note:** DVLA fields populated from `dvla_vehicle_info_new` table.

#### 3. Insurance Details (5 fields)
```
- insurance_company           ✅ Populated
- policy_number               ✅ Populated
- policy_holder               ✅ Populated
- cover_type                  ✅ Populated
- i_agree_to_share_my_data    ❌ Not in test (GDPR field)
```

#### 4. Recovery/Breakdown (3 fields)
```
- recovery_company              ❌ Not in minimal test data
- recovery_breakdown_number     ❌ Not in minimal test data
- recovery_breakdown_email      ❌ Not in minimal test data
```

#### 5. Vehicle Images (4 URL fields)
```
- vehicle_picture_front          ❌ No images in test data
- vehicle_picture_driver_side    ❌ No images in test data
- vehicle_picture_passenger_side ❌ No images in test data
- vehicle_picture_back           ❌ No images in test data
```

#### 6. Safety Check (3 checkbox fields)
```
- are_you_safe                 ❌ Not in minimal test data
- six_point_safety_check       ❌ Not in minimal test data
- call_emergency_contact       ❌ Not in minimal test data
```

#### 7. Medical Information (12 checkbox fields)
```
- medical_attention               ❌ Not in test (boolean expected)
- medical_how_are_you_feeling     ✅ Text field populated
- medical_chest_pain              ❌ Not in test
- medical_uncontrolled_bleeding   ❌ Not in test
- medical_breathlessness          ❌ Not in test
- medical_limb_weakness           ❌ Not in test
- medical_loss_of_consciousness   ❌ Not in test
- medical_severe_headache         ❌ Not in test
- medical_abdominal_bruising      ❌ Not in test
- medical_change_in_vision        ❌ Not in test
- medical_abdominal_pain          ❌ Not in test
- medical_limb_pain               ❌ Not in test
- medical_none_of_these           ❌ Not in test
- medical_attention_from_who      ❌ Not in test
- further_medical_attention       ❌ Not in test
- medical_please_be_completely_honest  ❌ Not in test
```

**Issue:** Test data has `medical_how_are_you_feeling` as text, but PDF expects individual symptom checkboxes.

#### 8. Accident Details (13 fields)
```
- when_did_the_accident_happen        ❌ Field mismatch (DB has different name)
- what_time_did_the_accident_happen   ❌ Field mismatch
- where_exactly_did_this_happen       ✅ Populated
- detailed_account_of_what_happened   ✅ Populated
- direction_and_speed                 ❌ Not in test
- impact                              ❌ Not in test
- reason_no_seatbelts                 ❌ Not in test
- wearing_seatbelts                   ❌ Not in test (checkbox)
- airbags_deployed                    ❌ Not in test (checkbox)
- damage_to_your_vehicle              ✅ Populated (text: "Yes")
- damage_caused_by_accident           ✅ Populated
- any_damage_prior_to_accident        ❌ Not in test
- anything_else                       ❌ Not in test
```

#### 9. Weather Conditions (11 checkbox fields)
```
- weather_conditions                  ❌ Text field, not in test
- weather_clear_and_dry               ❌ Checkbox not in test
- weather_bright_daylight             ❌ Checkbox not in test
- weather_overcast                    ❌ Checkbox not in test
- weather_fog                         ❌ Checkbox not in test
- weather_light_rain                  ❌ Checkbox not in test
- weather_heavy_rain                  ❌ Checkbox not in test
- weather_wet_road                    ❌ Checkbox not in test
- weather_snow                        ❌ Checkbox not in test
- weather_snow_on_road                ❌ Checkbox not in test
- weather_dusk                        ❌ Checkbox not in test
- weather_street_lights               ❌ Checkbox not in test
```

**Issue:** Supabase has individual weather boolean columns, PDF has checkboxes - mapping needed.

#### 10. Road Information (6 fields)
```
- road_type                           ❌ Not in test
- speed_limit                         ❌ Not in test
- junction_information                ❌ Not in test
- junction_information_crossroads     ❌ Not in test
- junction_information_roundabout     ❌ Not in test (but test mentions roundabout)
- junction_information_t_junction     ❌ Not in test
- junction_information_traffic_lights ❌ Not in test
- special_conditions                  ❌ Not in test
- special_conditions_roadworks        ❌ Not in test
- special_conditions_oil_spills       ❌ Not in test
- special_conditions_defective_road   ❌ Not in test
- special_conditions_workman          ❌ Not in test
```

#### 11. Other Vehicle/Driver (30 fields)
```
- other_drivers_name                  ✅ Populated
- other_drivers_number                ✅ Populated
- other_drivers_address               ❌ Not in test
- other_registration_number           ✅ Populated (maps to 'vehicle_license_plate')
- other_make_of_car                   ❌ Not in test
- other_make_of_vehicle               ❌ Not in test
- other_model_of_vehicle              ❌ Not in test
- other_colour_of_car                 ❌ Not in test
- other_insurance_company             ✅ Populated
- other_policy_holder                 ❌ Not in test
- other_policy_number                 ❌ Not in test
- other_policy_cover                  ❌ Not in test
- other_damage_accident               ❌ Not in test
- other_damage_prior                  ❌ Not in test
- other_breath_test                   ❌ Not in test (checkbox)
```

**DVLA Fields for Other Vehicle (15 fields):**
```
- other_fuel_type
- other_year_of_manufacture
- other_month_of_manufacture
- other_co2_emissions
- other_engine_capacity
- other_mot_status
- other_mot_expiry
- other_tax_status
- other_tax_due_date
- other_marked_for_export
- other_type_approval
- other_wheelplan
- other_revenue_weight
- other_vehicle_last_v5c_issued
```
**All ❌ - Not in test, would require DVLA lookup for other vehicle**

#### 12. Police Information (5 fields)
```
- did_police_attend                 ❌ Not in test (checkbox)
- accident_reference_number         ❌ Not in test
- police_officers_name              ❌ Not in test
- police_officer_badge_number       ❌ Not in test
- police_force_details              ❌ Not in test
- breath_test                       ❌ Not in test (checkbox)
```

#### 13. Witness Information (2 fields)
```
- any_witness                       ❌ Not in test (checkbox)
- witness_contact_information       ❌ Not in test
```

#### 14. File URLs / Evidence (10 fields)
```
- file_url_documents                ❌ No images in test
- file_url_documents_1              ❌ No images in test
- file_url_scene_overview           ❌ No images in test
- file_url_scene_overview_1         ❌ No images in test
- file_url_other_vehicle            ❌ No images in test
- file_url_other_vehicle_1          ❌ No images in test
- file_url_vehicle_damage           ❌ No images in test
- file_url_vehicle_damage_1         ❌ No images in test
- file_url_vehicle_damage_2         ❌ No images in test
- file_url_what3words               ❌ No images in test
- file_url_record_detailed_account_of_what_happened  ❌ No audio in test
```

#### 15. AI-Generated Content (2 fields)
```
- ai_summary_of_accident_data                    ❌ No AI summary in test
- ai_summary_of_accident_data_transcription      ❌ No AI transcription in test
```

#### 16. Recovery/Upgrade (2 checkbox fields)
```
- call_your_recovery                ❌ Not in test
- upgrade_to_premium                ❌ Not in test
```

#### 17. Declaration (3 fields)
```
- declaration                       ❌ Not in test
- Signature138                      ❌ Signature field (cannot be filled programmatically)
- subscription_start_date           ❌ Signature field (cannot be filled programmatically)
- Date139_af_date                   ❌ Not in test
- Check Box137                      ❌ Not in test (checkbox)
```

---

### Additional PDF: 24 Fields

**Additional Vehicle #2+ (19 fields):**
```
- additional_registration_number    ❌ Only 1 other vehicle in test
- additional_driver_name
- additional_driver_address
- additional_driver_email
- additional_driver_mobile
- additional_make_of_vehicle
- additional_model_of_vehicle
- additional_vehicle_colour
- additional_vehicle_year
- additional_insurance_company
- additional_policy_holder
- additional_policy_cover
- additional_fuel_type
- additional_mot_status
- additional_mot_expiry_date
- additional_tax_status
- additional_tax_due_date
- additional_marked_for_export
```

**Additional Witnesses (5 fields):**
```
- witness_name                      ❌ No witnesses in test
- witness_address
- witness_email
- witness_mobile
- Witness Statement
- create_user_id                    ✅ Would be populated
```

---

## Summary Statistics

### Field Population Status

**Main PDF (168 fields):**
- ✅ **Populated:** ~45 fields (27%)
  - All personal information
  - Basic vehicle details
  - User DVLA data
  - Basic accident details (location, description)
  - One other driver's basic info

- ❌ **Not Populated:** ~123 fields (73%)
  - Medical symptom checkboxes (12 fields)
  - Weather condition checkboxes (11 fields)
  - Road/junction details (12 fields)
  - Other vehicle DVLA data (15 fields)
  - Police information (5 fields)
  - Witness information (2 fields)
  - Image URLs (14 fields)
  - AI content (2 fields)
  - Safety checks (3 fields)
  - Recovery/premium options (2 fields)
  - Signatures (2 fields - can't be filled programmatically)
  - Various optional details (40+ fields)

**Additional PDF (24 fields):**
- ✅ **Populated:** 1 field (create_user_id only)
- ❌ **Not Populated:** 23 fields (need multiple vehicles/witnesses)

**Total Across Both PDFs:**
- ✅ **Populated:** ~46 of 192 fields (24%)
- ❌ **Not Populated:** ~146 of 192 fields (76%)

---

## Field Name Mapping Issues

### Discrepancies Between Code and PDF

The `lib/pdfGenerator.js` code uses field names that don't exist in the actual PDF:

**Missing Fields (attempted by code, not in PDF):**
```
- accident_date              → PDF uses: when_did_the_accident_happen
- accident_time              → PDF uses: what_time_did_the_accident_happen
- accident_location          → PDF uses: where_exactly_did_this_happen
- other_driver_name          → PDF uses: other_drivers_name
- other_driver_number        → PDF uses: other_drivers_number
- other_make                 → PDF uses: other_make_of_car / other_make_of_vehicle
- other_model                → PDF uses: other_model_of_vehicle
- other_license              → PDF uses: other_registration_number
- other_insurance            → PDF uses: other_insurance_company
- police_attended            → PDF uses: did_police_attend (checkbox)
- witness_present            → PDF uses: any_witness (checkbox)
- safe_ready                 → PDF uses: are_you_safe (checkbox)
```

---

## Recommendations

### 1. Update Field Mapping in Code

Update `lib/pdfGenerator.js` to use correct PDF field names:

```javascript
// Current (wrong):
setFieldText('accident_date', incident.when_did_the_accident_happen);

// Should be:
setFieldText('when_did_the_accident_happen', incident.when_did_the_accident_happen);
```

### 2. Create Complete Test Scenarios

Based on TYPEFORM_QUESTIONS_REFERENCE.md, create test data with:
- All medical symptom checkboxes
- All weather condition checkboxes
- Complete road/junction information
- Police attendance details
- Witness information
- Image URLs
- Audio transcription data
- AI summary data

### 3. Handle Checkboxes Properly

Many Supabase boolean fields map to PDF checkboxes:

```javascript
// Example for weather conditions:
checkField('weather_clear_and_dry', data.currentIncident.weather_clear_and_dry);
checkField('weather_heavy_rain', data.currentIncident.weather_heavy_rain);
```

### 4. Additional Vehicles/Witnesses PDF

Implement logic to:
- Detect when there are 2+ other vehicles
- Detect when there are witnesses
- Generate the additional PDF automatically
- Attach it to the main report

---

## Next Steps

1. ✅ **Extract PDF field names** - COMPLETED
2. ⏳ **Update lib/pdfGenerator.js** - Use correct field names
3. ⏳ **Create comprehensive test scenarios** - All 131+ incident fields
4. ⏳ **Test checkbox mapping** - Verify boolean → checkbox conversion
5. ⏳ **Implement additional PDF generation** - For extra vehicles/witnesses
6. ⏳ **Update ADOBE_FORM_FILLING_GUIDE.md** - Document correct mappings

---

**Last Updated:** 2025-10-23
**Files Analyzed:**
- `/Users/ianring/Ian.ring Dropbox/.../Car-Crash-Lawyer-AI-incident-report.pdf`
- `/Users/ianring/Ian.ring Dropbox/.../Car Crash Lawyer AI Incident Report other vehicles and witness.pdf`
- Test Data: `test-scenario-1-1761217633109`
