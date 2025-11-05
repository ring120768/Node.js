# Typeform to Incident Form Page Mapping

**Date**: 2025-10-28
**Purpose**: Map exact Typeform questions to incident report pages for accurate legal PDF generation
**Critical**: Field names MUST match fillable PDF field names exactly

---

## Complete Page Structure

### ✅ Page 1: Legal Advisory (COMPLETE)
**File**: `incident-form-page1-preview.html`

**Fields**:
- Legal acknowledgment checkbox (required)

**Typeform Equivalent**: N/A (new legal safeguard)

---

### ✅ Page 2: Safety Check & Basic Info (COMPLETE)
**File**: `incident-form-page2-preview.html`

**Fields**:
1. Full Name (text, required)
2. Date of Birth (date, required)
3. Phone Number (tel, UK format, required)
4. Email Address (email, required)
5. Home Address (textarea, 500 chars, required)
6. Date of Accident (date, required)
7. Time of Accident (time, required)

**Typeform Mapping**:
- Lines 31-35: Full Name (`doKRvAVnBqra`)
- Lines 249-257: Date of Accident (`5svFeHL1ycse`)
- Safety questions: Lines 38-73 (incorporated into Page 1 legal advisory)

---

### ✅ Page 3: Medical Assessment (COMPLETE)
**File**: `incident-form-page3-preview.html`

**Fields**:
1. Symptom Checklist (13 exact options from paramedic consultation)
   - Chest Pain
   - Uncontrolled Bleeding
   - Breathlessness
   - Limb Weakness or changes in sensation
   - Dizziness
   - Loss of Consciousness
   - Severe Headache
   - Change in Vision
   - Abdominal Pain
   - Abdominal Bruising
   - Limb pain that's impeding mobility
   - Any other concerns that a life or limb threatening injury has occurred
   - None of these I feel fine and am ready to continue

2. Medical Professional Witness (yes/no + details)
   - Did you receive medical attention at the scene?
   - Details: Who attended, what treatment, ambulance registration

**Typeform Mapping**:
- Lines 76-144: Symptoms checklist (`hNQlvXQou9v8`)
- Lines 146-187: Medical professional questions (`jDL9Uo0AvvAw`, `Q49so6sgwuL9`)

---

### ✅ Page 4: Accident Location & Conditions (COMPLETE)
**File**: `incident-form-page4-preview.html`

**Fields**:
1. Accident Location (textarea, 500 chars, required)
2. What3Words Location (map + text input, optional)
3. Weather, Light & Road Conditions (12 checkboxes, at least 1 required)
   - Clear and dry
   - Light rain
   - Heavy rain
   - Fog or poor visibility
   - Snow or ice
   - Wet road
   - Snow/ice on road
   - Dark
   - Street lights
   - Bright Daylight
   - Dusk
   - Overcast/Dull light
4. Road Type (4 radio options, required)
   - Roundabout
   - Dual Carriageway
   - Single Carriageway
   - Slip Road
5. Speed Limit (dropdown, 6 options, required)
6. Junctions (4 checkboxes, optional)
   - T-Junction
   - Crossroads
   - Roundabout Junction
   - Traffic Lights
7. Special Conditions (6 checkboxes, optional + details textarea)
   - Roadworks
   - Defective Road Surface
   - Oil or Diesel Spills
   - Workmen Present
   - Pedestrians Nearby
   - School Children Nearby

**Typeform Mapping**:
- Lines 389-631: Accident location and conditions
- Lines 406-467: Weather/light/road conditions (exact 12 options)

---

## 🚧 Page 5: Your Vehicle (TO CREATE)

**Purpose**: Capture user's vehicle details with DVLA checks

**Typeform Source**: Lines 189-223

**Fields**:

### Section 1: Vehicle Identification
1. **Were you driving your usual vehicle?** (yes/no, required)
   - Typeform line 193: `C3Zk3vDVyroV` (short_text - "Where You Driving your usual vehicle?")

2. **Vehicle Registration Number** (text, UK format, required)
   - Auto-format: XX00 XXX
   - Triggers DVLA lookup (beta)
   - Shows: Make, Model, Color, Year, MOT status, Tax status

3. **DVLA Verification Status** (read-only, auto-populated)
   - MOT: ✅ Valid until [date] / ❌ Expired / ⚠️ Due soon
   - TAX: ✅ Valid / ❌ Expired
   - Insurance: ⚠️ Check with MID (Motor Insurance Database) - beta

### Section 2: Safety Equipment
4. **Were the airbags deployed?** (yes/no, required)
   - Typeform line 200: `ikDHmu1Kt4lC` (yes_no)

5. **Were you and all passengers wearing seat belts?** (yes/no, required)
   - Typeform line 207: `YMdII3kj4n2P` (yes_no)

6. **If NO seatbelts, explain why** (textarea, 500 chars, conditional)
   - Typeform line 214: `qFbLesWhQZcz` (long_text)
   - Only shown if Q5 = No

### Section 3: Vehicle Damage
7. **Was there any damage to your vehicle?** (yes/no, required)
   - Typeform line 221: `KnVj7jVEyJ3a` (yes_no)

**Validation Rules**:
- UK registration format: `[A-Z]{1,2}[0-9]{1,2}\s?[A-Z]{3}`
- DVLA API call on blur (rate limit: 1 request/2 seconds)
- Insurance check requires user consent (GDPR)

**DVLA Alert Examples**:
```
✅ MOT Valid until 15/03/2026
⚠️ MOT expires in 7 days (15/11/2025)
❌ MOT expired on 10/10/2025 - Vehicle may not be insured
⚠️ TAX expired - Vehicle may not be legally driven
```

**Session Storage Key**: `incident_page5`

---

## 🚧 Page 6: Your Vehicle Images (TO CREATE)

**Purpose**: Upload documents and damage photos

**Typeform Source**: Lines 224-279

**Fields**:

### Section 1: Important Documents (2 uploads)
**Prompt**: "Upload photos of important documents (insurance certificate, driving license, MOT, etc.)"
- Typeform lines 228-237: `jJeN5nXXzwK2`, `aVeTV0QMkLow` (file_upload x2)
- Max 2 files per upload
- Accepted formats: JPG, PNG, PDF
- Max size: 10MB per file
- Examples shown: Insurance cert, Driving license, MOT cert, V5C logbook

### Section 2: Vehicle Damage Photos (3 uploads, minimum 1 required if damage = yes)
**Prompt**: "Upload multiple angles showing your vehicle damage"
- Typeform lines 242-265: `KOFOCdq2qzVv`, `u5I0XT8dqsL0`, `XqLWtDAQBLIE` (file_upload x3)
- Upload 1: "Front damage"
- Upload 2: "Side/rear damage"
- Upload 3: "Additional angles"
- Guidance: "Take photos from at least 3 different angles showing all damage clearly"

### Section 3: Scene Overview Photos (2 uploads, optional but recommended)
**Prompt**: "Wide-angle photos of entire accident scene"
- Typeform lines 270-279: `JkwapiczPtNd`, `MyvHKvmVJSo7` (file_upload x2)
- Upload 1: "Scene overview 1"
- Upload 2: "Scene overview 2"
- Guidance: "Step back and capture the full scene showing positions of all vehicles, road markings, signs, and surrounding area"

**Image Upload Pattern** (same as signup):
- Immediate upload to temp storage: `POST /api/images/temp-upload`
- Returns temp path (string)
- Page stores paths in session storage
- On form submit → backend moves temp → permanent

**Session Storage Key**: `incident_page6`

---

## 🚧 Page 7: Other Vehicle Details (TO CREATE)

**Purpose**: Capture other driver and vehicle information

**Typeform Source**: Lines 280-384

**Fields**:

### Section 1: Vehicle Involvement
1. **Were there any other vehicles involved?** (yes/no, required)
   - Typeform line 284: `PinUCBqYgG5n` (yes_no)
   - If NO → skip to Page 9 (Witnesses)
   - If YES → continue

### Section 2: Other Driver Details
2. **Driver's Name** (text, required)
   - Typeform line 291: `xRkExYQi2GHH` (short_text)

3. **Driver's Phone Number** (tel, UK format, required)
   - Typeform line 298: `7PdvKnFwtjkx` (short_text)

4. **Driver's Address** (textarea, 300 chars, required)
   - Typeform line 305: `2IvvUPhtDCfw` (short_text)

### Section 3: Other Driver's Insurance
5. **Insurance Company** (text, required)
   - Typeform line 312: `KJlNM80O6w7P` (short_text)

6. **Policy Number** (text, required)
   - Typeform line 319: `ubR4hTMxw2Kg` (short_text)

7. **Policy Holder Name** (text, required)
   - Typeform line 326: `hZAboXgZgGEV` (short_text)

8. **Policy Cover Type** (dropdown, required)
   - Typeform line 333: `ZRqtiU1xsaFN` (short_text)
   - Options: "Third Party Only", "Third Party, Fire & Theft", "Comprehensive", "Unknown"

### Section 4: Other Vehicle Details
9. **Make of Vehicle** (text, required)
   - Typeform line 354: `8BhMY2WBtSPd` (short_text)

10. **Model of Vehicle** (text, required)
    - Typeform line 361: `LW6Epai7uPv3` (short_text)

11. **Vehicle Registration Number** (text, UK format, required)
    - Typeform line 368: `s7I6BM1r5ntY` (short_text)
    - Auto-format: XX00 XXX
    - Triggers DVLA lookup (beta)
    - **Alert if MOT/TAX expired**: Show prominent warning

### Section 5: Other Vehicle Damage
12. **Damage caused by this accident** (textarea, 500 chars, required)
    - Typeform line 375: `3GDdoRhVwfLb` (short_text)

13. **Any pre-existing damage** (textarea, 500 chars, optional)
    - Typeform line 382: `lAU5uphYKWBR` (short_text)

**DVLA Alert for Other Vehicle**:
```
⚠️ WARNING: Other vehicle's MOT expired on 10/10/2025
   - Vehicle may not have valid insurance
   - Note this in your report
   - Inform your insurance company

❌ CRITICAL: Other vehicle has no valid TAX
   - Vehicle should not be on the road
   - This may affect liability
   - Report to police if not already done
```

**Session Storage Key**: `incident_page7`

---

## 🚧 Page 8: Other Vehicle Images (TO CREATE)

**Purpose**: Photos of other vehicle and their documents (if safe to obtain)

**Typeform Source**: Lines 340-349

**Fields**:

### Section 1: Other Vehicle Photos (2 uploads, optional but recommended)
**Prompt**: "If safe to photograph, take pictures of the other vehicle(s)"
- Typeform lines 340-349: `5AHbymOrAITu`, `UvSAmYHJ8kHz` (file_upload x2)
- Upload 1: "Other vehicle damage"
- Upload 2: "Other vehicle registration plate"
- Safety warning: "⚠️ Only take photos if safe to do so. Do not approach other vehicles if unsafe."

### Section 2: Other Driver's Documents (optional)
**Prompt**: "If the other driver provided photos of their documents"
- Upload 1: "Other driver's insurance certificate"
- Upload 2: "Other driver's driving license"
- Note: "These are optional - many drivers won't share documents at the scene"

**Session Storage Key**: `incident_page8`

---

## 🚧 Page 9: Witnesses (TO CREATE)

**Purpose**: Capture witness information

**Typeform Source**: Lines 665-675

**Fields**:

### Section 1: Witness Presence
1. **Were there any witnesses?** (yes/no, required)
   - Typeform line 666: `ibH230XwXdEl` (yes_no)
   - If NO → skip to Page 10 (Police Details)
   - If YES → continue

### Section 2: Witness Details
2. **Witness contact information and what they saw** (textarea, 1000 chars, required)
   - Typeform line 673: `Yz2Dh032qVRz` (long_text)
   - Prompt: "Provide name, phone number, and a brief description of what they witnessed"
   - Example: "John Smith, 07700 900123, saw the other car run the red light and hit my vehicle on the passenger side"

**Note**: Additional witnesses can be added from `report-complete.html` page after submission

**Session Storage Key**: `incident_page9`

---

## 🚧 Page 10: Police Details (TO CREATE)

**Purpose**: Police attendance and safety equipment questions

**Typeform Source**: Lines 680-727

**Fields**:

### Section 1: Police Attendance
1. **Did police attend the scene?** (yes/no, required)
   - Typeform line 681: `FODJBJ6MrZFA` (yes_no)
   - If NO → skip police details, show safety equipment section
   - If YES → continue

### Section 2: Police Details (conditional - if police attended)
2. **Accident Reference Number** (text, optional)
   - Typeform line 688: `02KGqfis1MmZ` (short_text)
   - Hint: "Unique identifier from police force (also called incident number)"

3. **Police Force** (text, optional)
   - Typeform line 695: `aFZEPEDVVkbx` (short_text)
   - Example: "Thames Valley Police", "Metropolitan Police"

4. **Officer's Name** (text, optional)
   - Typeform line 701: `zFvtWcywtujI` (short_text)

5. **Officer's Badge Number** (text, optional)
   - Typeform line 708: `MSwsGEYtgTkH` (short_text)

### Section 3: Breath Test Results (conditional - if police attended)
6. **Your Breath Test Result** (text, optional)
   - Typeform line 716: `VaQ5fNQPHqDo` (short_text)
   - Hint: "If a breath test was conducted, enter the result (e.g., '0 mg', 'Negative', 'Not tested')"

7. **Other Driver's Breath Test Result** (text, optional)
   - Typeform line 722: `ByaeCya8UQ7j` (short_text)

### Section 4: Safety Equipment (RELOCATED FROM PAGE 5)
**Note**: These questions are critical evidence and must be included

8. **Were the airbags deployed in your vehicle?** (yes/no, required)
   - Typeform line 200: `ikDHmu1Kt4lC` (yes_no)
   - Relocated here for logical flow with police questions

9. **Were you and all passengers wearing seat belts?** (yes/no, required)
   - Typeform line 207: `YMdII3kj4n2P` (yes_no)

10. **If NO seatbelts, explain why** (textarea, 500 chars, conditional)
    - Typeform line 214: `qFbLesWhQZcz` (long_text)
    - Only shown if Q9 = No

**Session Storage Key**: `incident_page10`

---

## 🚧 Statement Page (TO CREATE - NEAR END)

**Purpose**: Comprehensive narrative after all structured questions

**Typeform Source**: Lines 603-632 (original Page 4 removed sections)

**Position**: After all data collection pages, before final medical check

**User's Strategic Reasoning**: "they all come together at that point and the user has all our simple suggestions in their mind before the main statement"

**Fields**:

### Section 1: Direction & Speed
1. **Direction of travel and speed** (textarea, 500 chars, required)
   - Example: "I was traveling north on High Street at approximately 30mph"
   - Prompt: "Describe which direction you were traveling and your approximate speed"

### Section 2: Point of Impact & Damage
2. **Point of impact and resulting damage** (textarea, 1000 chars, required)
   - Example: "Front passenger side of my vehicle impacted the rear driver's side of the other vehicle. My bumper was crushed and headlight smashed. Airbag deployed."
   - Prompt: "Describe exactly where your vehicle was hit, what parts were damaged, and any other effects"

### Section 3: Comprehensive Accident Description
3. **What happened in the accident** (textarea, 2000 chars, required)
   - Comprehensive narrative
   - User has now completed:
     - ✅ Location (Page 4)
     - ✅ Conditions (Page 4)
     - ✅ Their vehicle (Page 5)
     - ✅ Other vehicle/driver (Page 7)
     - ✅ Witnesses (Page 9)
     - ✅ Police (Page 10)
   - Prompt: "Now that you've answered all the specific questions, describe what happened in your own words. Include the sequence of events, what you saw, what the other driver did, and anything else important."

**Session Storage Key**: `incident_statement_page`

---

## 🚧 Final Medical Check (TO CREATE)

**Purpose**: Final medical assessment before completion

**Typeform Source**: Lines 729-747

**Fields**:

1. **How are you feeling? Do you need medical attention?** (radio, required)
   - Typeform line 729: `vrhQWdLZWrk4` (multiple_choice)
   - Options:
     - "I need Medical attention!" → Show emergency call button
     - "I need to get checked out in the next 24 hours" → Show GP booking link
     - "I've received Medical Attention or I'm OK" → Continue to completion

**Session Storage Key**: `incident_final_medical`

**Redirect After Completion**: `transcription-status.html` (Typeform line 754)

---

## Field Mapping for Fillable PDF

**CRITICAL**: These field names MUST match the fillable PDF exactly

### Personal Information
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `full_name` | `USER_FULL_NAME` | `doKRvAVnBqra` | text |
| `date_of_birth` | `USER_DOB` | N/A | date |
| `phone_number` | `USER_PHONE` | N/A | tel |
| `email_address` | `USER_EMAIL` | N/A | email |
| `home_address` | `USER_ADDRESS` | N/A | textarea |

### Accident Details
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `accident_date` | `ACCIDENT_DATE` | `5svFeHL1ycse` | date |
| `accident_time` | `ACCIDENT_TIME` | N/A | time |
| `accident_location` | `ACCIDENT_LOCATION` | Lines 389-405 | textarea |
| `what3words` | `ACCIDENT_WHAT3WORDS` | N/A (new) | text |
| `conditions` | `WEATHER_CONDITIONS` | Lines 406-467 | array |
| `road_type` | `ROAD_TYPE` | Lines 468-499 | radio |
| `speed_limit` | `SPEED_LIMIT` | Lines 500-535 | select |
| `junctions` | `JUNCTION_TYPE` | Lines 536-571 | array |
| `special_conditions` | `SPECIAL_CONDITIONS` | Lines 572-607 | array |
| `special_conditions_details` | `SPECIAL_CONDITIONS_DETAILS` | Lines 608-632 | textarea |

### Medical Information
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `symptoms` | `MEDICAL_SYMPTOMS` | Lines 76-144 | array |
| `received_medical_attention` | `MEDICAL_SCENE_ATTENDED` | `jDL9Uo0AvvAw` | boolean |
| `medical_attention_details` | `MEDICAL_SCENE_DETAILS` | `Q49so6sgwuL9` | textarea |
| `final_medical_status` | `MEDICAL_FINAL_STATUS` | `vrhQWdLZWrk4` | radio |

### User Vehicle
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `usual_vehicle` | `USER_USUAL_VEHICLE` | `C3Zk3vDVyroV` | text |
| `user_vehicle_reg` | `USER_VEHICLE_REG` | N/A | text |
| `user_vehicle_make` | `USER_VEHICLE_MAKE` | DVLA | text |
| `user_vehicle_model` | `USER_VEHICLE_MODEL` | DVLA | text |
| `user_vehicle_mot` | `USER_VEHICLE_MOT` | DVLA | text |
| `user_vehicle_tax` | `USER_VEHICLE_TAX` | DVLA | text |
| `airbags_deployed` | `USER_AIRBAGS_DEPLOYED` | `ikDHmu1Kt4lC` | boolean |
| `seatbelts_worn` | `USER_SEATBELTS_WORN` | `YMdII3kj4n2P` | boolean |
| `seatbelt_reason` | `USER_SEATBELT_REASON` | `qFbLesWhQZcz` | textarea |
| `user_vehicle_damaged` | `USER_VEHICLE_DAMAGED` | `KnVj7jVEyJ3a` | boolean |

### Other Vehicle
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `other_vehicles_involved` | `OTHER_VEHICLES_INVOLVED` | `PinUCBqYgG5n` | boolean |
| `other_driver_name` | `OTHER_DRIVER_NAME` | `xRkExYQi2GHH` | text |
| `other_driver_phone` | `OTHER_DRIVER_PHONE` | `7PdvKnFwtjkx` | tel |
| `other_driver_address` | `OTHER_DRIVER_ADDRESS` | `2IvvUPhtDCfw` | textarea |
| `other_insurance_company` | `OTHER_INSURANCE_COMPANY` | `KJlNM80O6w7P` | text |
| `other_policy_number` | `OTHER_POLICY_NUMBER` | `ubR4hTMxw2Kg` | text |
| `other_policy_holder` | `OTHER_POLICY_HOLDER` | `hZAboXgZgGEV` | text |
| `other_policy_type` | `OTHER_POLICY_TYPE` | `ZRqtiU1xsaFN` | select |
| `other_vehicle_make` | `OTHER_VEHICLE_MAKE` | `8BhMY2WBtSPd` | text |
| `other_vehicle_model` | `OTHER_VEHICLE_MODEL` | `LW6Epai7uPv3` | text |
| `other_vehicle_reg` | `OTHER_VEHICLE_REG` | `s7I6BM1r5ntY` | text |
| `other_vehicle_damage` | `OTHER_VEHICLE_DAMAGE` | `3GDdoRhVwfLb` | textarea |
| `other_vehicle_prior_damage` | `OTHER_VEHICLE_PRIOR_DAMAGE` | `lAU5uphYKWBR` | textarea |

### Witnesses
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `witnesses_present` | `WITNESSES_PRESENT` | `ibH230XwXdEl` | boolean |
| `witness_details` | `WITNESS_DETAILS` | `Yz2Dh032qVRz` | textarea |

### Police Details
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `police_attended` | `POLICE_ATTENDED` | `FODJBJ6MrZFA` | boolean |
| `accident_ref_number` | `POLICE_REF_NUMBER` | `02KGqfis1MmZ` | text |
| `police_force` | `POLICE_FORCE` | `aFZEPEDVVkbx` | text |
| `officer_name` | `POLICE_OFFICER_NAME` | `zFvtWcywtujI` | text |
| `officer_badge` | `POLICE_OFFICER_BADGE` | `MSwsGEYtgTkH` | text |
| `user_breath_test` | `USER_BREATH_TEST` | `VaQ5fNQPHqDo` | text |
| `other_breath_test` | `OTHER_BREATH_TEST` | `ByaeCya8UQ7j` | text |

### Statement (Removed from Page 4, Now Separate Page)
| Incident Form Field | PDF Field Name | Typeform Ref | Data Type |
|---------------------|----------------|--------------|-----------|
| `direction_of_travel` | `DIRECTION_SPEED` | Lines 603-610 | textarea |
| `point_of_impact` | `IMPACT_DAMAGE` | Lines 611-620 | textarea |
| `accident_description` | `ACCIDENT_DESCRIPTION` | Lines 621-632 | textarea |

### Images (All stored in user_documents table)
| Upload Purpose | PDF Reference | Typeform Ref | Count |
|----------------|---------------|--------------|-------|
| User documents | `USER_DOCS_*` | Lines 228-237 | 2 |
| User vehicle damage | `USER_DAMAGE_*` | Lines 242-265 | 3 |
| Scene overview | `SCENE_*` | Lines 270-279 | 2 |
| Other vehicle photos | `OTHER_VEHICLE_*` | Lines 340-349 | 2 |
| Other driver docs | `OTHER_DOCS_*` | N/A (new) | 2 |

---

## Page Order Summary

**Final Page Count**: 11 pages (was 10, now 11 with Statement page added)

1. ✅ **Page 1**: Legal Advisory (legal acknowledgment)
2. ✅ **Page 2**: Safety Check & Basic Info (name, DOB, phone, email, address, date/time of accident)
3. ✅ **Page 3**: Medical Assessment (symptoms, medical professional witness)
4. ✅ **Page 4**: Accident Location & Conditions (location, What3Words, conditions, road type, speed, junctions, special conditions)
5. 🚧 **Page 5**: Your Vehicle (usual vehicle, reg, DVLA checks, airbags, seatbelts, damage)
6. 🚧 **Page 6**: Your Vehicle Images (documents, damage photos, scene photos)
7. 🚧 **Page 7**: Other Vehicle Details (driver, insurance, vehicle, damage)
8. 🚧 **Page 8**: Other Vehicle Images (photos, documents)
9. 🚧 **Page 9**: Witnesses (presence, details)
10. 🚧 **Page 10**: Police Details (attendance, reference, officer, breath tests)
11. 🚧 **Statement Page**: Comprehensive Narrative (direction/speed, impact/damage, full description)
12. 🚧 **Final Medical Check**: Current status and GP booking

**Redirect**: `transcription-status.html`

---

## Implementation Notes

### DVLA Integration (Beta)
- Endpoint: `GET /api/dvla/lookup?reg={registration}`
- Rate limit: 1 request per 2 seconds
- Returns: Make, Model, Color, Year, MOT expiry, Tax status
- Alert users to expired MOT/TAX prominently

### Insurance Check (Beta - Requires User Consent)
- MID (Motor Insurance Database) check
- GDPR consent required
- Shows: Insured Yes/No, Policy start/end (if available)

### Image Upload Flow
1. User selects file → Immediate upload to temp storage
2. Returns temp path (string) → Store in session
3. On final submit → Backend moves temp → permanent → Create user_documents records

### Session Storage Structure
```javascript
{
  incident_page1: { legal_acknowledgment: true },
  incident_page2: { full_name, dob, phone, email, address, accident_date, accident_time },
  incident_page3: { symptoms, medical_attention, medical_details },
  incident_page4: { location, what3words, conditions, road_type, speed_limit, junctions, special_conditions },
  incident_page5: { usual_vehicle, vehicle_reg, dvla_data, airbags, seatbelts, damage },
  incident_page6: { temp_image_paths: { docs: [], damage: [], scene: [] } },
  incident_page7: { other_vehicles, driver_details, insurance, vehicle_details, damage },
  incident_page8: { temp_image_paths: { other_vehicle: [], other_docs: [] } },
  incident_page9: { witnesses, witness_details },
  incident_page10: { police_attended, police_details, breath_tests },
  incident_statement_page: { direction_speed, impact_damage, description },
  incident_final_medical: { medical_status }
}
```

### PDF Field Mapping Script
Location: `/Users/ianring/Node.js/scripts/map-fields-to-pdf.js`

Purpose: Validate all incident form fields match PDF field names before submission

---

**Last Updated**: 2025-10-28
**Status**: Mapping Complete - Ready for Page Creation
**Next**: Create Pages 5-11 following exact Typeform structure

