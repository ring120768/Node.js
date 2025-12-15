# PDF Form Logic & Business Rules

**Purpose**: Conditional logic and validation rules for the incident report PDF form
**Date**: 2025-10-31
**Version**: 1.0

---

## Conditional Display Logic

### Junction Fields (Page 7)

**Rule**: If user indicates "Not at a junction (straight road)", then skip/hide remaining junction fields.

**Affected Fields**:
- Junction Type → User selects "Not at a junction (straight road)"
- Junction Control → Set to N/A or hide
- Traffic Light Status → Set to N/A or hide
- Additional Hazards → Optional (keep visible)

**Implementation Options**:

**Option A - PDF Form (Acrobat Pro)**:
```javascript
// Add JavaScript to Junction Type field (on change event)
if (this.value === "none") {
  // Hide or disable junction control field
  this.getField("junctionControl").value = "none";
  this.getField("junctionControl").readonly = true;

  // Hide or disable traffic light field
  this.getField("trafficLightStatus").value = "n/a";
  this.getField("trafficLightStatus").readonly = true;
}
```

**Option B - Web Form (HTML/JavaScript)**:
```javascript
document.getElementById('junctionType').addEventListener('change', function(e) {
  const isStraightRoad = (e.target.value === 'none');

  // Disable junction control
  document.getElementById('junctionControl').disabled = isStraightRoad;
  if (isStraightRoad) {
    document.getElementById('junctionControl').value = 'none';
  }

  // Disable traffic lights
  document.getElementById('trafficLightStatus').disabled = isStraightRoad;
  if (isStraightRoad) {
    document.getElementById('trafficLightStatus').value = 'n/a';
  }
});
```

**Option C - Backend Validation (Node.js)**:
```javascript
// In PDF generation or data processing
if (formData.junctionType === 'none') {
  // Auto-populate N/A values
  formData.junctionControl = 'none';
  formData.trafficLightStatus = 'n/a';
}
```

---

## Field Dependencies

### Weather & Road Surface Correlation

**Rule**: Certain weather conditions should suggest road surface conditions.

**Examples**:
- If `weather_snow` selected → Suggest `road_surface_snow_covered` or `road_surface_slush`
- If `weather_raining` selected → Suggest `road_surface_wet`
- If `weather_ice` selected → Suggest `road_surface_icy`

**Implementation**: Advisory only (no hard enforcement)

### Medical Attention Chain

**Rule**: If `medical_attention_needed = Yes`, then subsequent medical fields become relevant.

**Flow**:
1. Medical attention needed? → **Yes**
2. Ambulance called? → Required
3. Hospital name → Required if attended
4. Symptoms → Required
5. Injury details → Required

**If No**: Skip to vehicle damage section

---

## Required Field Rules

### Always Required (Page 1)
- ✅ `accident_date` - Date of accident
- ✅ `accident_time` - Time of accident
- ✅ `location` - Location description
- ✅ `license_plate` - User's vehicle registration

### Conditionally Required

**Medical Section (Page 2)**:
- `medical_hospital_name` - Required if `medical_attention_needed = Yes`
- `medical_symptoms[]` - Required if `medical_attention_needed = Yes`

**Other Vehicle (Page 9)**:
- `other_driver_name` - Required if multi-vehicle accident
- `other_vehicle_registration` - Required if available

**Police (Page 10)**:
- `police_incident_number` - Required if `police_attended = Yes`
- `police_officers_name` - Required if `police_attended = Yes`

**Declaration (Page 17)**:
- ✅ `declaration_full_name` - Always required
- ✅ `declaration_date` - Always required
- ✅ `declaration_signature` - Always required

---

## Validation Rules

### Date Validations
- `accident_date` must be in the past (not future)
- `accident_date` must be within last 3 years (legal limitation)
- `declaration_date` must be today or within 7 days

### Time Validations
- `accident_time` must be valid 24-hour format (HH:MM)
- `accident_time` combined with `accident_date` must be in the past

### Text Length Limits
- `accident_narrative` - Minimum 50 characters, Maximum 2000 characters
- `medical_injury_details` - Minimum 20 characters if provided
- `location` - Minimum 10 characters

### Numeric Validations
- `your_speed` - Range: 0-120 mph (UK context)
- `speed_limit` - Valid UK speed limits: 20, 30, 40, 50, 60, 70 mph
- `your_speed` should not exceed `speed_limit` significantly (warn if >30mph over)

### Email/Phone Validations
- `other_driver_phone` - UK phone format (+44 or 0) if provided
- Email fields - Valid email format if provided

---

## Auto-Population Rules

### System Fields (Page 17)
- `report_generated_date` - Auto: Today's date (DD/MM/YYYY)
- `report_generated_time` - Auto: Current time (HH:MM)
- `report_uuid` - Auto: Generate UUID v4

### Location Enhancement
- If `what3words` provided → Auto-fetch coordinates
- If coordinates provided → Auto-fetch what3words
- `nearestLandmark` - Optional but helps validation

### DVLA Integration (Future)
- If `license_plate` provided → Auto-fetch vehicle make, model, color
- Validate MOT status, tax status
- Pre-populate `make_of_car`, `model_of_car`

---

## Checkbox Logic

### Medical Symptoms
**Rule**: If `medical_symptom_none` selected → Deselect all other symptoms
**Implementation**: Exclusive checkbox (none vs others)

### Weather Conditions
**Rule**: Multiple selections allowed, but warn if contradictory
**Examples of contradictions**:
- `weather_clear` + `weather_fog` (unlikely but possible)
- `weather_bright_sunlight` + `weather_fog` (impossible)

**Implementation**: Advisory warning, don't block submission

### Road Surface
**Rule**: Multiple selections allowed (e.g., wet + icy)
**Common combinations**:
- `road_surface_wet` + `road_surface_icy` (freezing rain)
- `road_surface_snow_covered` + `road_surface_slush` (melting snow)

---

## Skip Logic Flow

### Medical Assessment (Page 2)
```
medical_attention_needed?
├─ Yes → Show all medical fields
└─ No → Skip to Page 3 (Vehicle Damage)
```

### Junction Information (Page 7)
```
junction_type?
├─ "Not at a junction (straight road)" → Auto-fill N/A for junction fields
├─ "T-junction", "Crossroads", etc. → Show junction control fields
└─ Other → Show all fields
```

### Police Attendance (Page 10)
```
police_attended?
├─ Yes → Show police detail fields
└─ No → Skip police fields, continue to witnesses
```

### Witnesses (Page 11)
```
witnesses_present?
├─ No witnesses → Skip witness details
└─ Yes → Show textarea for witness information
```

---

## Data Quality Rules

### Completeness Score
Award points for optional but valuable fields:
- Photos uploaded: +10 points each (max 40)
- Witness details: +20 points
- what3words location: +10 points
- Detailed narrative (>200 chars): +10 points
- Medical records attached: +20 points

**Threshold**: 80+ points = "Excellent", 60-79 = "Good", 40-59 = "Fair", <40 = "Poor"

### Consistency Checks
- If `damage_still_driveable = No` → Expect `recovery_company_name` filled
- If `breath_test_you = Positive` → Expect police attendance
- If `medical_injury_severity = Severe` → Expect hospital attendance

---

## Error Messages (User-Friendly)

### Required Field Missing
❌ "Please provide the date of the accident. This is required for your claim."

### Invalid Date
❌ "The accident date cannot be in the future. Please check the date you entered."

### Speed Validation
⚠️ "Your reported speed (95 mph) exceeds the speed limit (70 mph) by 25 mph. Please confirm this is accurate."

### Incomplete Medical Info
⚠️ "You indicated medical attention was needed, but didn't describe your symptoms. Please add details to strengthen your claim."

---

## Form Behavior on Save/Submit

### Auto-Save (Every 30 seconds)
- Save all field values to session storage
- No validation required for auto-save
- Show "Last saved: HH:MM" indicator

### Manual Save ("Save & Continue" button)
- Validate current page only
- Show validation errors inline
- Don't proceed to next page if errors

### Final Submit ("Submit Report" button)
- Validate entire form
- Show summary of missing optional fields
- Require declaration signature
- Generate PDF on successful submission

---

## PDF Generation Mapping

### Checkbox Arrays → Individual PDF Checkboxes
```javascript
// Database: weather_conditions[] = ['clear', 'windy', 'dusk']
// PDF Form: Check boxes for weather_clear, weather_windy, weather_dusk

const weatherConditions = formData.weather_conditions || [];
weatherConditions.forEach(condition => {
  pdfForm.getCheckbox(`weather_${condition}`).check();
});
```

### Date Format Conversion
```javascript
// Input: 2025-10-31 (ISO format from HTML date input)
// Output: 31/10/2025 (UK DD/MM/YYYY for PDF display)

const [year, month, day] = formData.accident_date.split('-');
const ukDate = `${day}/${month}/${year}`;
pdfFields['accident_date'].setText(ukDate);
```

---

## Accessibility Considerations

### Screen Reader Support
- All form fields must have associated labels
- Error messages must be announced
- Required fields marked with aria-required="true"

### Keyboard Navigation
- Tab order follows logical page flow
- Skip links for long checkbox lists
- Enter key submits current section

### Mobile Considerations
- Large touch targets (44x44px minimum)
- File upload works on iOS/Android
- Auto-save prevents data loss on app backgrounding

---

## Future Enhancements

### Smart Suggestions
- "Users who reported similar symptoms also mentioned..."
- "Based on weather conditions, we recommend uploading photos of..."

### Pre-Fill from Previous Claims
- If user has previous claim, offer to copy non-incident-specific data
- Vehicle details, personal info, usual routes

### AI-Assisted Validation
- OpenAI API checks narrative for completeness
- Suggests questions user should answer
- Flags potential inconsistencies

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: Draft - Awaiting business approval
**Next Review**: After user testing phase
