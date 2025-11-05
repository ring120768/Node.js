# PDF Field Reference - All 98 Fields Organized by Section

**Purpose**: Field list for manual PDF template creation in Adobe Express/Acrobat Pro
**Total Fields**: 98 fields across 17 pages (removed Ice, replaced Other with Dusk)
**Date**: 2025-10-31
**Last Updated**: 2025-10-31 (Weather conditions updated)

---

## PAGE 1: INCIDENT OVERVIEW (9 fields)

### Basic Incident Information
- `accident_date` - Date input (DD/MM/YYYY)
- `accident_time` - Time input (HH:MM, 24-hour)
- `your_speed` - Number input (mph)
- `speed_limit` - Number input (mph)
- `usual_vehicle` - Radio group (Yes/No)
- `license_plate` - Text input (UK format: XX00 XXX)

### Location Details
- `location` - Textarea (2-3 lines, address/description)
- `what3words` - Text input (e.g., ///filled.count.soap)
- `nearestLandmark` - Text input (nearby landmark reference)

---

## PAGE 2: MEDICAL ASSESSMENT (21 fields)

### Medical Attention
- `medical_attention_needed` - Radio group (Yes/No)
- `medical_ambulance_called` - Radio group (Yes/No/N/A)
- `medical_hospital_name` - Text input (hospital name if attended)

### Injury Severity
- `medical_injury_severity` - Radio group (5 options):
  - None
  - Minor (cuts, bruises)
  - Moderate (sprains, fractures)
  - Severe (serious injuries)
  - Life-threatening

### Medical Symptoms (14 checkboxes - stored as array)
- `medical_symptom_none` - Checkbox
- `medical_symptom_severe_headache` - Checkbox
- `medical_symptom_dizziness` - Checkbox
- `medical_symptom_loss_of_consciousness` - Checkbox
- `medical_symptom_nausea` - Checkbox
- `medical_symptom_back_neck_pain` - Checkbox
- `medical_symptom_whiplash` - Checkbox
- `medical_symptom_chest_pain` - Checkbox
- `medical_symptom_breathlessness` - Checkbox
- `medical_symptom_abdominal_pain` - Checkbox
- `medical_symptom_limb_pain_mobility` - Checkbox
- `medical_symptom_vision_problems` - Checkbox
- `medical_symptom_psychological_distress` - Checkbox
- `medical_symptom_other` - Checkbox

### Medical Details
- `medical_injury_details` - Textarea (describe injuries)
- `medical_treatment_received` - Textarea (treatment details)
- `final_feeling` - Textarea (how you feel now)

---

## PAGE 3: VEHICLE DAMAGE (6 fields)

### Damage Assessment
- `damage_description` - Textarea (describe vehicle damage)
- `damage_airbags_deployed` - Radio group (Yes/No/Unknown)
- `damage_seatbelts_used` - Radio group (Yes/No)
- `damage_still_driveable` - Radio group (Yes/No)
- `damage_impact_point_front` - Checkbox
- `damage_impact_point_rear` - Checkbox

---

## PAGE 4: WEATHER & ROAD CONDITIONS (19 checkboxes)

### Weather Conditions (13 checkboxes - stored as array)
- `weather_clear` - Checkbox
- `weather_cloudy` - Checkbox
- `weather_bright_sunlight` - Checkbox
- `weather_raining` - Checkbox
- `weather_drizzle` - Checkbox
- `weather_heavy_rain` - Checkbox
- `weather_fog` - Checkbox
- `weather_snow` - Checkbox
- `weather_hail` - Checkbox
- `weather_windy` - Checkbox
- `weather_thunder_lightning` - Checkbox
- `weather_dusk` - Checkbox

### Road Surface Conditions (6 checkboxes - stored as array)
- `road_surface_dry` - Checkbox
- `road_surface_wet` - Checkbox
- `road_surface_icy` - Checkbox
- `road_surface_snow_covered` - Checkbox
- `road_surface_loose_surface` - Checkbox
- `road_surface_slush` - Checkbox

---

## PAGE 5: ROAD TYPE & TRAFFIC (11 fields)

### Road Classification (7 checkboxes - stored as array)
- `road_type_motorway` - Checkbox
- `road_type_a_road` - Checkbox
- `road_type_b_road` - Checkbox
- `road_type_urban_street` - Checkbox
- `road_type_rural_road` - Checkbox
- `road_type_car_park` - Checkbox
- `road_type_private_road` - Checkbox

### Traffic Density (4 radio options)
- `traffic_density` - Radio group:
  - Light (few vehicles)
  - Moderate (steady flow)
  - Heavy (congested)
  - Stationary (gridlock)

---

## PAGE 6: VISIBILITY CONDITIONS (8 fields)

### Visibility Level
- `visibility_level` - Radio group (6 options):
  - Excellent (over 200m)
  - Good (100-200m)
  - Moderate (50-100m)
  - Poor (20-50m)
  - Very poor (under 20m)
  - Zero visibility

### Road Markings Visibility
- `road_markings_visibility` - Radio group (4 options):
  - Clearly visible
  - Partially visible
  - Not visible
  - No markings present

### Visibility Impaired
- `visibility_factor_rain` - Checkbox
- `visibility_factor_fog` - Checkbox
- `visibility_factor_snow` - Checkbox
- `visibility_factor_headlight_glare` - Checkbox
- `visibility_factor_sun_glare` - Checkbox
- `visibility_factor_other` - Checkbox

---

## PAGE 7: JUNCTION & INFRASTRUCTURE (6 fields)

### Junction Details
- `junction_type` - Dropdown:
  - T-junction
  - Crossroads
  - Roundabout
  - Mini-roundabout
  - Y-junction
  - Slip road
  - Not at junction

### Junction Control
- `junction_control` - Radio group:
  - Traffic lights
  - Stop sign
  - Give way
  - Roundabout
  - Uncontrolled
  - Not at junction

### Traffic Signals
- `traffic_light_status` - Radio group:
  - Green
  - Amber
  - Red
  - Not working
  - No traffic lights

### Road Hazards
- `hazard_pedestrians` - Checkbox
- `hazard_cyclists` - Checkbox
- `hazard_animals` - Checkbox

---

## PAGE 8: ACCIDENT NARRATIVE (2 fields)

### Your Actions
- `your_manoeuvre` - Dropdown (20+ options):
  - Going ahead
  - Overtaking
  - Turning right
  - Turning left
  - Changing lanes
  - Reversing
  - Parking
  - Waiting to turn
  - Slowing/stopping
  - Moving off
  - U-turn
  - Emerging from junction
  - Other

### Detailed Description
- `accident_narrative` - Textarea (extra-large, 10+ lines):
  - What were you doing?
  - What did the other driver do?
  - How did the collision occur?
  - Road layout, visibility, other factors

---

## PAGE 9: OTHER VEHICLE INFORMATION (10 fields)

### Other Driver Details
- `other_driver_name` - Text input (full name)
- `other_driver_phone` - Text input (UK +44 format)
- `other_driver_address` - Textarea (2-3 lines)

### Other Vehicle Details
- `other_vehicle_make` - Text input (e.g., Ford)
- `other_vehicle_model` - Text input (e.g., Focus)
- `other_vehicle_color` - Text input
- `other_vehicle_registration` - Text input (UK format)

### Other Insurance Details
- `other_insurance_company` - Text input
- `other_insurance_policy_number` - Text input
- `other_driver_admitted_fault` - Radio group (Yes/No/Unsure)

---

## PAGE 10: POLICE & RECOVERY (5 fields)

### Police Attendance
- `police_attended` - Radio group (Yes/No)
- `police_incident_number` - Text input (if attended)

### Vehicle Recovery
- `recovery_company_name` - Text input (if vehicle recovered)
- `recovery_company_phone` - Text input (UK +44 format)
- `vehicle_current_location` - Textarea (where vehicle is now)

---

## PAGE 11: WITNESSES (1 field)

### Witness Information
- `witnesses_present` - Radio group with textarea:
  - No witnesses
  - Yes, witnesses present (provide details below)
  - Textarea for witness names, contact details

---

## PAGE 12: BREATH TESTS (2 fields)

### Alcohol Testing
- `breath_test_you` - Radio group:
  - Not tested
  - Tested - Negative
  - Tested - Positive
  - Refused test

- `breath_test_other_driver` - Radio group:
  - Not tested
  - Tested - Negative
  - Tested - Positive
  - Refused test
  - Unknown

---

## PAGE 13: LOCATION PHOTOS (Image Placeholders)

### Scene Photography
- Location Photo 1 (accident scene overview)
- Location Photo 2 (road layout)
- Location Photo 3 (junction/intersection)
- Location Photo 4 (additional context)

**Note**: Photos uploaded via web form, embedded in PDF during generation

---

## PAGE 14: YOUR VEHICLE PHOTOS (Image Placeholders)

### Your Vehicle Damage
- Your Vehicle Photo 1 (front view damage)
- Your Vehicle Photo 2 (rear view damage)
- Your Vehicle Photo 3 (side view damage)
- Your Vehicle Photo 4 (close-up of impact point)

**Note**: Photos uploaded via web form, embedded in PDF during generation

---

## PAGE 15: OTHER VEHICLE PHOTOS (Image Placeholders)

### Other Vehicle Damage
- Other Vehicle Photo 1 (front view)
- Other Vehicle Photo 2 (rear view with registration plate)
- Other Vehicle Photo 3 (side view damage)
- Other Vehicle Photo 4 (close-up of impact point)

**Note**: Photos uploaded via web form, embedded in PDF during generation

---

## PAGE 16: ADDITIONAL EVIDENCE (Document Placeholders)

### Supporting Documents
- Police Report / Incident Number (PDF attachment)
- Insurance Documents (PDF attachment)
- Medical Records / Treatment Notes (PDF attachment)
- Witness Statements (PDF attachment, if provided)

**Note**: Documents uploaded separately, attached as appendices to main report

---

## PAGE 17: DECLARATION & SIGNATURE

### Declaration Fields
- `declaration_full_name` - Text input (as appears on driving license)
- `declaration_date` - Date input (DD/MM/YYYY)
- `declaration_time` - Time input (HH:MM)
- `declaration_signature` - Signature field (digital signature or electronic acceptance)

### Metadata (Auto-Generated)
- `report_generated_date` - Auto-populated (DD/MM/YYYY)
- `report_generated_time` - Auto-populated (HH:MM)
- `report_uuid` - Auto-populated (unique report identifier)

---

## FIELD SUMMARY BY TYPE

### Text Inputs (35 fields)
Single-line text fields for names, addresses, reference numbers, etc.

### Textareas (8 fields)
Multi-line fields for descriptions, narratives, detailed information

### Date Inputs (3 fields)
DD/MM/YYYY format for accident date, declaration date, generated date

### Time Inputs (3 fields)
HH:MM 24-hour format for accident time, declaration time, generated time

### Radio Groups (15 fields)
Single-selection options (Yes/No, severity levels, etc.)

### Checkboxes (38 fields)
Multi-selection options (symptoms, weather, visibility, hazards, road types)

### Dropdowns (2 fields)
Select from predefined lists (junction type, your manoeuvre)

### Image Placeholders (12 images)
Photos embedded during PDF generation (4 location + 4 your vehicle + 4 other vehicle)

### Document Attachments (4 documents)
Separate PDFs attached as appendices

### Auto-Generated (3 fields)
Metadata populated by system (report date, time, UUID)

---

## DATABASE STORAGE STRATEGY

### Checkbox Arrays (PostgreSQL TEXT[] arrays)
Checkboxes stored as arrays to reduce column count:

- `medical_symptoms[]` (14 checkboxes → 1 array column)
- `weather_conditions[]` (13 checkboxes → 1 array column)
- `road_surface_conditions[]` (6 checkboxes → 1 array column)
- `road_types[]` (7 checkboxes → 1 array column)
- `visibility_factors[]` (6 checkboxes → 1 array column)
- `hazards[]` (3 checkboxes → 1 array column)
- `damage_impact_points[]` (2 checkboxes → 1 array column)

**Total Column Reduction**: 51 checkbox columns → 7 array columns (saves 44 database columns)

---

## NOTES FOR ADOBE EXPRESS TEMPLATE CREATION

1. **Page Setup**: Use 8.5" × 11" (Letter size) for UK compatibility
2. **Margins**: 50pt all around for printable area
3. **Colors**: Use exact hex codes from CLAUDE.md design system
4. **Font Sizes**:
   - Page titles: 24pt Bold
   - Section headings: 16pt Bold
   - Body text: 11pt Regular
   - Help text: 9pt Italic
5. **Logo Placement**:
   - Header: 50×50pt, top-left
   - Footer: 100×28pt, centered
6. **Field Spacing**: 12pt gap between fields, 20pt section padding
7. **Checkbox Layout**: 2-column grid for space efficiency
8. **Required Fields**: Mark with red asterisk (*)

---

## CROSS-REFERENCE WITH OLD TYPEFORM

**Action Required**: Compare this list with your existing Typeform to identify new fields.

**Recommended Approach**:
1. Open your old Typeform
2. Export field list
3. Compare with this document
4. Mark new fields in red in your Adobe Express template

**Estimated New Fields**: ~64 new fields (based on previous analysis showing 99 total vs ~35 old fields)

---

**Document Version**: 1.3
**Last Updated**: 2025-10-31
**Total Fields**: 98 across 17 pages
**Changes**:
- Removed "Ice" from weather conditions, replaced "Other weather" with "Dusk"
- Replaced "Other condition" with "Slush" in road surface conditions
- Replaced "Other road type" with "Private Road" in road classification
**Ready for**: Adobe Express template creation + Acrobat Pro form field addition
