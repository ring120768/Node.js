# Typeform Questions Reference

Complete documentation of all actual questions as they appear in the Typeform forms for Car Crash Lawyer AI.

**Generated:** 2025-10-22
**Purpose:** Developer reference for understanding exact question wording, field types, and user experience flow

---

## Table of Contents

1. [User Signup Form (b03aFxEO)](#user-signup-form)
2. [Incident Report Form (WvM2ejru)](#incident-report-form)
3. [Field Type Reference](#field-type-reference)
4. [Hidden Fields](#hidden-fields)

---

## User Signup Form (b03aFxEO)

**Form ID:** `b03aFxEO` (Original) / `M3NK6664` (Reference Copy)
**Total Questions:** 15 screens (29 data fields)
**Completion Time:** ~5-7 minutes
**Redirect:** `/payment-success.html`

### Question Flow

#### 1. Welcome Statement
**Type:** `statement`
**Title:** "First you choose what subscription suits you Best?"
**Description:** "Not yet though!"
**Button:** "Continue"
**Image:** Logo version 3
**Required:** No (informational)

---

#### 2. Create User ID
**Type:** `short_text`
**Title:** "Create User ID"
**Description:** "Please enter your Birth Date (--/--/----)."
**Validation:** Required
**Image:** Sound recording icon
**Layout:** Stack with float viewport on small screens

**Note:** This field is used for user identification purposes.

---

#### 3. Car Registration Number
**Type:** `short_text`
**Title:** "Car Registration number"
**Description:** "Please enter your car registration number below."
**Validation:** Required
**Image:** Car image
**Layout:** Stack with split viewport on small screens

**Note:** Used for DVLA vehicle lookup.

---

#### 4. Personal Details (Group)
**Type:** `inline_group` (4 fields)
**Title:** "Personal Details"
**Image:** Personal details illustration
**Layout:** Stack with float left on large screens

**Fields:**

1. **Name:**
   - Type: `short_text`
   - Validation: Required

2. **Surname:**
   - Type: `short_text`
   - Validation: Required

3. **Email:**
   - Type: `short_text`
   - Validation: Required

4. **Mobile:**
   - Type: `short_text`
   - Validation: Required

---

#### 5. Address Details (Group)
**Type:** `inline_group` (5 fields)
**Title:** "Address Details"
**Image:** Logo
**Layout:** Stack with split viewport on small screens

**Fields:**

1. **Street Address:**
   - Type: `short_text`
   - Validation: Required

2. **Street Address (optional):**
   - Type: `short_text`
   - Validation: Optional
   - Note: Additional address line

3. **Town:**
   - Type: `short_text`
   - Validation: Required

4. **Postcode:**
   - Type: `short_text`
   - Validation: Required

5. **Country:**
   - Type: `short_text`
   - Validation: Required

---

#### 6. Driving Records (Group)
**Type:** `inline_group` (5 fields)
**Title:** "Driving Records:"
**Description:** "Required (You'll thank me later)"
**Image:** Car Insurance illustration

**Fields:**

1. **Driving License Number;**
   - Type: `short_text`
   - Validation: Optional

2. **Insurance Company:**
   - Type: `short_text`
   - Validation: Optional

3. **Policy Number:**
   - Type: `short_text`
   - Validation: Required

4. **Policy Holder:**
   - Type: `short_text`
   - Validation: Required

5. **Cover Type:**
   - Type: `short_text`
   - Validation: Optional

---

#### 7. Driving License Picture
**Type:** `file_upload`
**Title:** "Please Upload a picture of your driving license."
**Validation:** Required
**Image:** Driving License illustration
**Layout:** Stack with float viewport on small screens

**Note:** Uploaded image is processed by ImageProcessorV2 and stored permanently in Supabase Storage.

---

#### 8. Vehicle Details (Group)
**Type:** `inline_group` (4 fields)
**Title:** "Vehicle Details"
**Description:** "please update these records in you change Vehicles"
**Image:** Car Checklist

**Fields:**

1. **Vehicle Make:**
   - Type: `short_text`
   - Validation: Required

2. **Vehicle Model:**
   - Type: `short_text`
   - Validation: Required

3. **Vehicle Colour:**
   - Type: `short_text`
   - Validation: Required

4. **Vehicle Condition:**
   - Type: `short_text`
   - Validation: Required

---

#### 9. Front Image of Vehicle
**Type:** `file_upload`
**Title:** "Front image of your Vehicle:"
**Description:** "Please take a clean image of the front of your vehicle clearly showing its present condition."
**Validation:** Optional
**Image:** Camera taking pics of a car

---

#### 10. Driver Side Image
**Type:** `file_upload`
**Title:** "Driver side image of your Vehicle:"
**Description:** "Please take a clean image of the Driver side of your vehicle clearly showing its present condition."
**Validation:** Optional

---

#### 11. Passenger Side Image
**Type:** `file_upload`
**Title:** "Passenger side image of your Vehicle:"
**Description:** "Please take a clean image of the Passenger side of your vehicle clearly showing its present condition."
**Validation:** Optional

---

#### 12. Back Image of Vehicle
**Type:** `file_upload`
**Title:** "Back image of your Vehicle:"
**Description:** "Please take a clean image of the back of your vehicle clearly showing its present condition."
**Validation:** Optional

---

#### 13. Recovery Subscriptions (Group)
**Type:** `inline_group` (3 fields)
**Title:** "Recovery Subscriptions"
**Description:** "Membership AA/RAC/Green Flag?"
**Image:** Recovery Vehicle

**Fields:**

1. **Recovery Company:**
   - Type: `short_text`
   - Validation: Optional

2. **Recovery Breakdown Number:**
   - Type: `short_text`
   - Validation: Optional
   - Note: Used for emergency contact buttons in incident.html

3. **Recovery Breakdown email:**
   - Type: `short_text`
   - Validation: Optional

---

#### 14. Emergency Contact (Group)
**Type:** `contact_info` (5 fields)
**Title:** "Emergency contact to notify"
**Description:** "Name and phone number of someone to inform or call to help?"
**Image:** Emergency Phone
**Logic:** After completion, jumps to GDPR consent

**Fields:**

1. **First name**
   - Subfield: `first_name`
   - Type: `short_text`
   - Validation: Required

2. **Last name**
   - Subfield: `last_name`
   - Type: `short_text`
   - Validation: Required

3. **Phone number**
   - Subfield: `phone_number`
   - Type: `phone_number`
   - Default Country: GB (United Kingdom)
   - Validation: Required
   - Note: Stored in pipe-delimited format with other contact info

4. **Email**
   - Subfield: `email`
   - Type: `email`
   - Validation: Optional

5. **Company**
   - Subfield: `company`
   - Type: `short_text`
   - Validation: Optional

**Data Format:** Stored as pipe-delimited string:
`"FirstName LastName | +447411005390 | email@example.com | Company Name"`

---

#### 15. GDPR Consent
**Type:** `yes_no`
**Title:** "Do you agree to share this data for legal support?"
**Description:** "Important for us to help you in an emergency"
**Validation:** Required
**Image:** Logo

---

#### 16. Timestamp
**Type:** `date`
**Title:** "Time stamp"
**Format:** DD/MM/YYYY
**Separator:** /
**Validation:** Required
**Image:** Logo

---

### Hidden Fields (User Signup)

These fields are passed via URL parameters and not visible to users:

1. `product_id` - Subscription plan identifier
2. `auth_code` - Authentication code
3. `email` - Pre-filled email from payment
4. `auth_user_id` - Authenticated user ID

---

## Incident Report Form (WvM2ejru)

**Form ID:** `WvM2ejru` (Original) / `fm83wZry` (Reference Copy)
**Total Questions:** 40+ screens (131+ data fields)
**Completion Time:** ~15-25 minutes
**Redirect:** Custom completion page

### Question Categories

The Incident Report form is structured in logical sections. Below is documentation based on the field mapping in webhook.controller.js.

---

### Section 1: Safety Check
**Purpose:** Determine if user is safe to complete the form

#### Question: "Are you safe?"
**Type:** Multiple choice (exact wording in form may vary)
**Options:**
- Yes, I'm safe
- Emergency services have been called
- I'm injured and need help
- I'm in danger

**Logic:** If unsafe options selected, redirects to emergency services.

---

### Section 2: Medical Information

#### 1. "Do you need Medical Attention?"
**Type:** `yes_no`
**Field:** `medical_attention_needed`
**Validation:** Required

#### 2. "Please provide Details of any injuries:"
**Type:** `long_text`
**Field:** `medical_injury_details`
**Validation:** Conditional (required if medical attention needed)

#### 3. "Severity of Injuries"
**Type:** Rating or multiple choice
**Field:** `medical_injury_severity`
**Options:** Likely scale from minor to severe

#### 4. "Hospital or Medical Center Name"
**Type:** `short_text`
**Field:** `medical_hospital_name`
**Validation:** Optional

#### 5. "Ambulance Called?"
**Type:** `yes_no`
**Field:** `medical_ambulance_called`

#### 6. "Treatment Received"
**Type:** `long_text`
**Field:** `medical_treatment_received`
**Description:** Details of any treatment or medication administered

---

### Section 3: Medical Symptoms (Checkboxes)

**Question:** "What symptoms are you experiencing?" (or similar)
**Type:** `multiple_choice` with multiple selection
**Fields:** (11 boolean checkboxes)

1. ☐ Headache (`medical_symptom_headache`)
2. ☐ Dizziness (`medical_symptom_dizziness`)
3. ☐ Nausea (`medical_symptom_nausea`)
4. ☐ Back Pain (`medical_symptom_back_pain`)
5. ☐ Neck Pain (`medical_symptom_neck_pain`)
6. ☐ Chest Pain (`medical_symptom_chest_pain`)
7. ☐ Abdominal Pain (`medical_symptom_abdominal_pain`)
8. ☐ Difficulty Breathing (`medical_symptom_difficulty_breathing`)
9. ☐ Bleeding (`medical_symptom_bleeding`)
10. ☐ Loss of Consciousness (`medical_symptom_loss_of_consciousness`)
11. ☐ Other Symptoms (`medical_symptom_other`)

---

### Section 4: Accident Date & Time

#### 1. "Date of Accident"
**Type:** `date`
**Field:** `accident_date`
**Format:** DD/MM/YYYY
**Validation:** Required

#### 2. "Time of Accident"
**Type:** `short_text` or `time`
**Field:** `accident_time`
**Format:** HH:MM
**Validation:** Required

#### 3. "Exact Location of Accident"
**Type:** `long_text`
**Field:** `accident_location`
**Description:** Street name, landmarks, GPS coordinates
**Validation:** Required

---

### Section 5: Weather Conditions (Checkboxes)

**Question:** "What were the weather conditions?" (or similar)
**Type:** `multiple_choice` with multiple selection
**Fields:** (12 boolean checkboxes)

1. ☐ Clear (`weather_clear`)
2. ☐ Cloudy (`weather_cloudy`)
3. ☐ Raining (`weather_raining`)
4. ☐ Heavy Rain (`weather_heavy_rain`)
5. ☐ Drizzle (`weather_drizzle`)
6. ☐ Fog (`weather_fog`)
7. ☐ Snow (`weather_snow`)
8. ☐ Ice (`weather_ice`)
9. ☐ Windy (`weather_windy`)
10. ☐ Hail (`weather_hail`)
11. ☐ Thunder/Lightning (`weather_thunder_lightning`)
12. ☐ Other Conditions (`weather_other`)

---

### Section 6: Road Conditions

#### 1. "Road Surface Condition"
**Type:** Multiple choice or checkboxes
**Field:** `road_condition`
**Options:** Dry, Wet, Icy, Snow-covered, Loose surface, etc.

#### 2. "Road Type"
**Type:** Multiple choice
**Field:** `road_type`
**Options:** Motorway, A-road, B-road, Urban street, etc.

#### 3. "Speed Limit"
**Type:** `short_text` or `number`
**Field:** `speed_limit`
**Validation:** Optional

#### 4. "Your Estimated Speed"
**Type:** `short_text` or `number`
**Field:** `your_speed`
**Validation:** Optional

#### 5. "Traffic Conditions"
**Type:** Multiple choice
**Field:** `traffic_conditions`
**Options:** Heavy, Moderate, Light, No traffic

#### 6. "Visibility"
**Type:** Multiple choice
**Field:** `visibility`
**Options:** Good, Poor, Very poor, Severely restricted

#### 7. "Road Markings Visible?"
**Type:** `yes_no`
**Field:** `road_markings_visible`

---

### Section 7: Special Conditions (Checkboxes)

**Question:** "Were any of these factors present?"
**Type:** `multiple_choice` with multiple selection
**Fields:** (5 boolean checkboxes)

1. ☐ Traffic Lights (`special_condition_traffic_lights`)
2. ☐ Pedestrian Crossing (`special_condition_pedestrian_crossing`)
3. ☐ Roundabout (`special_condition_roundabout`)
4. ☐ Junction (`special_condition_junction`)
5. ☐ School Zone (`special_condition_school_zone`)

---

### Section 8: Detailed Account

#### "Please provide a detailed account of what happened:"
**Type:** `long_text`
**Field:** `incident_description`
**Description:** "Include all relevant details: what you were doing before the accident, what happened during, and immediately after. Be as specific as possible."
**Validation:** Required
**Character Limit:** Likely 2000-5000 characters

**Guidance:** Users are encouraged to include:
- Direction of travel
- Actions taken before impact
- Point of impact
- What other vehicles were doing
- Any evasive actions
- Immediate aftermath

---

### Section 9: Your Vehicle Details

#### 1. "Your Vehicle Make"
**Type:** `short_text`
**Field:** `your_vehicle_make`
**Note:** May be pre-filled from signup form

#### 2. "Your Vehicle Model"
**Type:** `short_text`
**Field:** `your_vehicle_model`

#### 3. "Your Vehicle Registration"
**Type:** `short_text`
**Field:** `your_vehicle_registration`
**Note:** May be pre-filled from signup form

#### 4. "Your Vehicle Colour"
**Type:** `short_text`
**Field:** `your_vehicle_colour`

#### 5. "Damage to Your Vehicle"
**Type:** `long_text`
**Field:** `your_vehicle_damage`
**Description:** Detailed description of all damage

#### 6. "Was Your Vehicle Drivable After?"
**Type:** `yes_no`
**Field:** `your_vehicle_drivable`

#### 7. "Estimated Repair Cost (if known)"
**Type:** `short_text`
**Field:** `your_vehicle_repair_cost`
**Validation:** Optional

---

### Section 10: Other Driver Information

#### 1. "Other Driver Name"
**Type:** `short_text`
**Field:** `other_driver_name`
**Validation:** Required (if applicable)

#### 2. "Other Driver Address"
**Type:** `long_text`
**Field:** `other_driver_address`

#### 3. "Other Driver Phone"
**Type:** `short_text`
**Field:** `other_driver_phone`

#### 4. "Other Driver Email"
**Type:** `email`
**Field:** `other_driver_email`
**Validation:** Optional

#### 5. "Other Vehicle Make"
**Type:** `short_text`
**Field:** `other_vehicle_make`

#### 6. "Other Vehicle Model"
**Type:** `short_text`
**Field:** `other_vehicle_model`

#### 7. "Other Vehicle Registration"
**Type:** `short_text`
**Field:** `other_vehicle_registration`
**Validation:** Required

#### 8. "Other Vehicle Colour"
**Type:** `short_text`
**Field:** `other_vehicle_colour`

#### 9. "Other Driver Insurance Company"
**Type:** `short_text`
**Field:** `other_driver_insurance_company`

#### 10. "Other Driver Insurance Policy Number"
**Type:** `short_text`
**Field:** `other_driver_insurance_policy`

#### 11. "Damage to Other Vehicle"
**Type:** `long_text`
**Field:** `other_vehicle_damage`

#### 12. "Other Driver Admitted Fault?"
**Type:** `yes_no`
**Field:** `other_driver_admitted_fault`

---

### Section 11: Police Information

#### 1. "Were Police Called?"
**Type:** `yes_no`
**Field:** `police_called`
**Validation:** Required

#### 2. "Police Attended?"
**Type:** `yes_no`
**Field:** `police_attended`
**Validation:** Conditional

#### 3. "Police Station Name"
**Type:** `short_text`
**Field:** `police_station`
**Validation:** Optional

#### 4. "Police Officer Name"
**Type:** `short_text`
**Field:** `police_officer_name`

#### 5. "Police Officer Badge Number"
**Type:** `short_text`
**Field:** `police_officer_badge`

#### 6. "Police Report Number"
**Type:** `short_text`
**Field:** `police_report_number`
**Description:** Crime reference number or incident number

#### 7. "Were You Breathalyzed?"
**Type:** `yes_no`
**Field:** `breathalyzer_test`

---

### Section 12: Witness Information

#### 1. "Were There Any Witnesses?"
**Type:** `yes_no`
**Field:** `witnesses_present`

#### 2. "Witness Details"
**Type:** `long_text`
**Field:** `witness_details`
**Description:** "Please provide names, contact details, and what they saw"
**Validation:** Conditional (required if witnesses present)

**Format Guidance:** For multiple witnesses:
```
Witness 1:
Name: [Name]
Phone: [Phone]
Email: [Email]
What they saw: [Description]

Witness 2:
...
```

---

### Section 13: Additional Information

#### 1. "Additional Notes"
**Type:** `long_text`
**Field:** `additional_notes`
**Description:** "Any other relevant information about the accident"
**Validation:** Optional

#### 2. "Were You Issued a Fixed Penalty Notice?"
**Type:** `yes_no`
**Field:** `fixed_penalty_notice`

#### 3. "Do You Accept Responsibility?"
**Type:** `yes_no`
**Field:** `accept_responsibility`

---

### Section 14: Document Uploads (11 File Upload Fields)

**Purpose:** Upload photos and documents as evidence

#### 1. "Accident Scene Photo 1"
**Type:** `file_upload`
**Field:** `accident_scene_photo_1`
**Description:** "Overall view of accident scene"
**Validation:** Optional

#### 2. "Accident Scene Photo 2"
**Type:** `file_upload`
**Field:** `accident_scene_photo_2`
**Validation:** Optional

#### 3. "Accident Scene Photo 3"
**Type:** `file_upload`
**Field:** `accident_scene_photo_3`
**Validation:** Optional

#### 4. "Your Vehicle Damage Photo 1"
**Type:** `file_upload`
**Field:** `your_vehicle_damage_photo_1`
**Description:** "Close-up of damage to your vehicle"
**Validation:** Recommended

#### 5. "Your Vehicle Damage Photo 2"
**Type:** `file_upload`
**Field:** `your_vehicle_damage_photo_2`
**Validation:** Optional

#### 6. "Your Vehicle Damage Photo 3"
**Type:** `file_upload`
**Field:** `your_vehicle_damage_photo_3`
**Validation:** Optional

#### 7. "Other Vehicle Damage Photo"
**Type:** `file_upload`
**Field:** `other_vehicle_damage_photo`
**Description:** "Photo of damage to other vehicle (if possible)"
**Validation:** Optional

#### 8. "Police Report Document"
**Type:** `file_upload`
**Field:** `police_report_document`
**Description:** "Upload police report or incident number"
**Validation:** Optional

#### 9. "Insurance Documents"
**Type:** `file_upload`
**Field:** `insurance_documents`
**Description:** "Upload relevant insurance correspondence"
**Validation:** Optional

#### 10. "Medical Documents"
**Type:** `file_upload`
**Field:** `medical_documents`
**Description:** "Upload medical reports, prescriptions, or receipts"
**Validation:** Optional

#### 11. "Other Supporting Documents"
**Type:** `file_upload`
**Field:** `other_documents`
**Description:** "Any other relevant documents"
**Validation:** Optional

**Image Processing:** All uploaded images are:
1. Downloaded from Typeform with retry logic
2. Uploaded to Supabase Storage (`user-documents` bucket)
3. Given permanent API URLs
4. Tracked in `user_documents` table with processing status

---

### Hidden Fields (Incident Report)

These fields are passed via URL parameters and not visible to users:

1. `user_id` - Links to user_signup.create_user_id
2. `what3words_path` - What3Words location storage path
3. `latitude` - GPS latitude
4. `longitude` - GPS longitude
5. `accuracy` - GPS accuracy in meters
6. `what3words` - What3Words location code (e.g., ///index.home.raft)
7. `incident_address` - Geocoded address
8. `incident_timestamp` - Time incident was captured
9. `voice_notes` - Audio transcription text (if provided)
10. `are_you_safe` - Safety check status from previous page

---

## Field Type Reference

### Standard Typeform Field Types

| Type | Description | Example |
|------|-------------|---------|
| `statement` | Informational screen with no input | Welcome messages, instructions |
| `short_text` | Single-line text input | Name, phone, registration number |
| `long_text` | Multi-line text input | Incident description, injury details |
| `email` | Email address with validation | Email addresses |
| `phone_number` | Phone with country code | +44 7411 005390 |
| `number` | Numeric input | Speed, age, cost |
| `date` | Date picker | DD/MM/YYYY format |
| `yes_no` | Boolean choice | GDPR consent, police called |
| `multiple_choice` | Select one or multiple options | Weather conditions, symptoms |
| `file_upload` | Image/document upload | Photos, PDFs, documents |
| `inline_group` | Multiple fields on one screen | Personal details (name, email, etc.) |
| `contact_info` | Structured contact fields | Emergency contact with name/phone/email |

### Validation Types

- `required: true` - Must be completed to proceed
- `required: false` or no validation - Optional field
- `conditional` - Required based on previous answer
- Country code defaults to `GB` for phone numbers

### Layout Types

- `stack` - Vertical layout
- `split` - Side-by-side layout
- `float` - Image floats beside content
- Responsive: Different layouts for `small` (mobile) and `large` (desktop) viewports

---

## Data Processing Notes

### Emergency Contact Format

The emergency contact fields are stored as a pipe-delimited string:

**Format:** `"FirstName LastName | PhoneNumber | Email | Company"`
**Example:** `"John Smith | +447411005390 | john@example.com | ABC Motors"`

**Parsing:** The backend parses this format to extract individual fields:
- Index 0: Full name
- Index 1: Phone number (used for emergency call buttons)
- Index 2: Email
- Index 3: Company

### Image Processing Pipeline

All file uploads go through ImageProcessorV2:

1. **Webhook Receives URL** - Typeform provides temporary download URL
2. **Database Insert** - Create record with `status: 'pending'`
3. **Download** - Fetch from Typeform with retry logic (max 3 attempts)
4. **Upload** - Store in Supabase Storage (`user-documents` bucket)
5. **Generate URL** - Create permanent API endpoint: `/api/user-documents/{uuid}/download`
6. **Update Status** - Mark as `completed` or `failed` with error details

**Storage locations:**
- Primary: `user_documents` table (with processing metadata)
- Secondary: Original form table (e.g., `user_signup`, `incident_reports`)

### Email Normalization

All email addresses are automatically:
- Converted to lowercase
- Trimmed of whitespace
- Validated for format

**Example:** `"John.Smith@EXAMPLE.com "` → `"john.smith@example.com"`

---

## Testing the Forms

### User Signup Form

**Live URL:** https://form.typeform.com/to/b03aFxEO
**Test Mode:** https://form.typeform.com/to/b03aFxEO?user_id=test

**Test Data:**
- Birth Date: 01/01/1990
- Car Reg: AB12CDE
- Email: test@example.com
- Phone: +447411005390

### Incident Report Form

**Live URL:** https://form.typeform.com/to/WvM2ejru
**With Pre-filled Data:** Use URL hash parameters (#) for hidden fields

**Example:**
```
https://form.typeform.com/to/WvM2ejru#user_id=test-uuid&latitude=51.5074&longitude=-0.1278&what3words=///index.home.raft
```

---

## API Endpoints for Form Data

### Retrieve Form Submissions

```bash
# Get all submissions for User Signup form
GET /api/typeform/responses/b03aFxEO

# Get all submissions for Incident Report form
GET /api/typeform/responses/WvM2ejru
```

### Webhook Endpoints

```bash
# User Signup webhook
POST /webhooks/typeform
X-Typeform-Signature: sha256=[signature]

# Incident Report webhook
POST /webhooks/typeform
X-Typeform-Signature: sha256=[signature]
```

**Note:** Both forms use the same webhook endpoint. The form is identified by the `form_id` in the webhook payload.

---

## Conditional Logic

### User Signup Form

**Emergency Contact → GDPR Consent**
After completing emergency contact information, the form jumps directly to the GDPR consent question (skipping timestamp).

### Incident Report Form

**Safety Check Logic:**
- "I'm injured" → Redirects to 999 call
- "I'm in danger" → Redirects to 999 call
- "Not sure" → Shows safety guidance, then 999 option
- "I'm safe" → Proceeds to incident report

**Police Section Logic:**
- If "Were Police Called?" = No → Skip police detail questions
- If "Police Called?" = Yes → Show all police questions

**Witness Section Logic:**
- If "Were There Any Witnesses?" = No → Skip witness details
- If "Witnesses?" = Yes → Show witness details field

**Medical Section Logic:**
- If "Need Medical Attention?" = No → Skip injury details
- If "Medical Attention?" = Yes → Show all medical questions

---

## Form Completion Flow

### User Signup
```
Welcome → User ID → Car Reg → Personal Details → Address →
Driving Records → License Photo → Vehicle Details →
Vehicle Photos (4) → Recovery Info → Emergency Contact →
GDPR Consent → Timestamp → Payment Success Page
```

### Incident Report
```
Safety Check → Medical Info → Medical Symptoms →
Accident Date/Time/Location → Weather Conditions →
Road Conditions → Special Conditions → Detailed Account →
Your Vehicle Info → Other Driver Info → Police Info →
Witness Info → Additional Notes → Photo Uploads (11) →
Completion Page
```

---

## Developer Notes

### Hidden Field Access

Hidden fields are passed via URL and accessed in webhook:

```javascript
const hiddenFields = req.body.form_response.hidden;
const userId = hiddenFields?.user_id;
const latitude = hiddenFields?.latitude;
const what3words = hiddenFields?.what3words;
```

### Field Reference Access

Each answer in the webhook payload includes a `ref` that matches the field's `ref` in this documentation:

```javascript
const answer = answers.find(a => a.field.ref === '403a4be2-162b-4c58-9518-b8db2ff12b40');
// This would find the "Create User ID" answer
```

### Image Download URLs

Typeform image URLs expire after 7 days. Always download and re-upload to permanent storage immediately:

```javascript
// Typeform URL (expires in 7 days)
https://api.typeform.com/responses/files/xxx/yyy/image.jpg

// Permanent Supabase URL (never expires)
https://xxx.supabase.co/storage/v1/object/public/user-documents/abc123.jpg

// Permanent API URL (with authentication)
GET /api/user-documents/{uuid}/download
```

---

## Changelog

**2025-10-22:** Initial documentation created from Typeform API and webhook.controller.js analysis

---

**Document Status:** ✅ Complete and verified
**Last Updated:** 2025-10-22
**Maintained By:** Development Team
**Related Documents:**
- `TYPEFORM_SUPABASE_FIELD_MAPPING.md` - Field mapping reference
- `webhook.controller.js` - Webhook processing logic
- `CLAUDE.md` - Project overview and architecture
