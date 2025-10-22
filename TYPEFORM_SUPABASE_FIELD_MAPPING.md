# Typeform → Supabase Field Mapping Reference

**Last Updated:** 2025-10-21
**Generated from:** `src/controllers/webhook.controller.js`

This document maps all Typeform form fields to their corresponding Supabase database columns for both the User Signup and Incident Report forms.

---

## Table of Contents

- [User Signup Form (b03aFxEO)](#user-signup-form-b03afxeo)
  - [Personal Information](#personal-information)
  - [Address Information](#address-information)
  - [Vehicle Information](#vehicle-information)
  - [Emergency Contact](#emergency-contact)
  - [Recovery Services](#recovery-services)
  - [Insurance Information](#insurance-information)
  - [Document Uploads](#document-uploads-signup)
  - [Compliance](#compliance)
- [Incident Report Form (WvM2ejru)](#incident-report-form-wvm2ejru)
  - [Medical Information](#medical-information)
  - [Medical Symptoms](#medical-symptoms)
  - [Accident Details](#accident-details)
  - [Weather Conditions](#weather-conditions)
  - [Vehicle Information (Incident)](#vehicle-information-incident)
  - [Road Information](#road-information)
  - [Special Conditions](#special-conditions)
  - [Detailed Account](#detailed-account)
  - [Your Vehicle Details](#your-vehicle-details)
  - [Other Driver Information](#other-driver-information)
  - [Police Information](#police-information)
  - [Witness Information](#witness-information)
  - [Additional Information](#additional-information)
  - [Document Uploads (Incident)](#document-uploads-incident)

---

## User Signup Form (b03aFxEO)

**Form Title:** "Car Crash Lawyer AI sign up"
**Supabase Table:** `user_signup`
**Primary Key:** `create_user_id` (from hidden field `auth_user_id` or `token`)

### Personal Information

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Name | `name` | `name` | TEXT | First name |
| Surname | `surname` | `surname` | TEXT | Last name |
| Email | `email` | `email` | TEXT | Normalized to lowercase |
| Mobile | `mobile` | `mobile` | TEXT | Phone number |

### Address Information

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Street Address | `street_address` | `street_address` | TEXT | Primary address line |
| Town | `town` | `town` | TEXT | City/Town |
| Street Address (Optional) | `street_address_optional` | `street_address_optional` | TEXT | Address line 2 |
| Postcode | `postcode` | `postcode` | TEXT | UK postcode |
| Country | `country` | `country` | TEXT | Country name |

### Vehicle Information

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Driving License Number | `driving_license_number` | `driving_license_number` | TEXT | UK driving license |
| Car Registration Number | `car_registration_number` | `car_registration_number` | TEXT | License plate/reg |
| Vehicle Make | `vehicle_make` | `vehicle_make` | TEXT | Manufacturer |
| Vehicle Model | `vehicle_model` | `vehicle_model` | TEXT | Model name |
| Vehicle Colour | `vehicle_colour` | `vehicle_colour` | TEXT | Color |
| Vehicle Condition | `vehicle_condition` | `vehicle_condition` | TEXT | Condition description |

### Emergency Contact

**⚠️ SPECIAL FORMAT:** Emergency contact fields are combined into a **pipe-delimited string**

| Typeform Field Title (Normalized) | Field Ref | Processing | Notes |
|-----------------------------------|-----------|------------|-------|
| First Name | `first_name` | Combined | Part 1: Name |
| Last Name | `last_name` | Combined | Part 1: Name |
| Phone Number | `phone_number` | Combined | Part 2: Phone |
| Email | `email` | Combined | Part 3: Email |
| Company | `company` | Combined | Part 4: Company |

**Combined Format:**
```
"FirstName LastName | PhoneNumber | Email | Company"
```

**Example:**
```
"John Smith | +447411005390 | john.smith@example.com | ABC Recovery Ltd"
```

**Stored in:** `user_signup.emergency_contact` (TEXT)

**Backend Parsing:** The emergency contact API (`/api/emergency/contacts/:userId`) in `emergency.controller.js` parses this pipe-delimited format to extract individual components.

### Recovery Services

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Recovery Company | `recovery_company` | `recovery_company` | TEXT | Company name |
| Recovery Breakdown Number | `recovery_breakdown_number` | `recovery_breakdown_number` | TEXT | Phone number |
| Recovery Breakdown Email | `recovery_breakdown_email` | `recovery_breakdown_email` | TEXT | Normalized to lowercase |

### Insurance Information

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Insurance Company | `insurance_company` | `insurance_company` | TEXT | Insurer name |
| Policy Number | `policy_number` | `policy_number` | TEXT | Policy ID |
| Policy Holder | `policy_holder` | `policy_holder` | TEXT | Name on policy |
| Cover Type | `cover_type` | `cover_type` | TEXT | Type of coverage |

### Document Uploads (Signup)

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Please Upload a Picture of Your Driving License | `please_upload_a_picture_of_your_driving_license` | `driving_license_picture` | TEXT (URL) | Processed by ImageProcessorV2 |
| Front Image of Your Vehicle | `front_image_of_your_vehicle` | `vehicle_picture_front` | TEXT (URL) | Processed by ImageProcessorV2 |
| Driver Side Image of Your Vehicle | `driver_side_image_of_your_vehicle` | `vehicle_picture_driver_side` | TEXT (URL) | Processed by ImageProcessorV2 |
| Passenger Side Image of Your Vehicle | `passenger_side_image_of_your_vehicle` | `vehicle_picture_passenger_side` | TEXT (URL) | Processed by ImageProcessorV2 |
| Back Image of Your Vehicle | `back_image_of_your_vehicle` | `vehicle_picture_back` | TEXT (URL) | Processed by ImageProcessorV2 |

**Image Processing Flow:**
1. Typeform webhook sends temporary image URLs
2. ImageProcessorV2 downloads images from Typeform
3. Uploads to Supabase Storage bucket: `user-documents/`
4. Creates record in `user_documents` table
5. Generates permanent API URL: `/api/user-documents/{uuid}/download`
6. Final URL stored in `user_signup` table

### Compliance

| Typeform Field Title (Normalized) | Field Ref | Supabase Column | Type | Notes |
|-----------------------------------|-----------|-----------------|------|-------|
| Do You Agree to Share This Data for Legal Support | `do_you_agree_to_share_this_data_for_legal_support` | `gdpr_consent` | BOOLEAN | GDPR compliance |

### Hidden Fields (User Signup)

| Hidden Field | Source | Supabase Column | Notes |
|--------------|--------|-----------------|-------|
| `auth_user_id` | Typeform Hidden | `create_user_id` | Primary identifier |
| `email` | Typeform Hidden | `email` | Used for pre-fill |
| `product_id` | Typeform Hidden | N/A | Product tracking |
| `auth_code` | Typeform Hidden | N/A | Auth verification |

### System Fields (User Signup)

| Field | Supabase Column | Source | Type |
|-------|-----------------|--------|------|
| Submission Time | `time_stamp` | `submitted_at` or `new Date()` | TIMESTAMP |
| Record ID | `id` | Auto-generated | UUID |
| Created At | `created_at` | Auto-generated | TIMESTAMP |
| Updated At | `updated_at` | Auto-generated | TIMESTAMP |

---

## Incident Report Form (WvM2ejru)

**Form Title:** "Incident Report"
**Supabase Table:** `incident_reports`
**Primary Key:** `create_user_id` (from hidden field `user_id` or `auth_user_id`)

### Medical Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `medical_how_are_you_feeling` | `medical_how_are_you_feeling` | TEXT | Self-assessment |
| `medical_attention` | `medical_attention` | TEXT | Received medical care? |
| `medical_attention_from_who` | `medical_attention_from_who` | TEXT | Medical provider |
| `further_medical_attention` | `further_medical_attention` | TEXT | Need more care? |
| `are_you_safe` | `are_you_safe` | TEXT | Safety status |
| `six_point_safety_check` | `six_point_safety_check` | TEXT | Safety checklist |

### Medical Symptoms

**Multiple Selection Checkboxes:**

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `medical_chest_pain` | `medical_chest_pain` | BOOLEAN | Chest pain symptom |
| `medical_breathlessness` | `medical_breathlessness` | BOOLEAN | Breathing difficulty |
| `medical_abdominal_bruising` | `medical_abdominal_bruising` | BOOLEAN | Abdominal injury |
| `medical_uncontrolled_bleeding` | `medical_uncontrolled_bleeding` | BOOLEAN | Bleeding symptom |
| `medical_severe_headache` | `medical_severe_headache` | BOOLEAN | Head pain |
| `medical_change_in_vision` | `medical_change_in_vision` | BOOLEAN | Vision problems |
| `medical_abdominal_pain` | `medical_abdominal_pain` | BOOLEAN | Stomach pain |
| `medical_limb_pain` | `medical_limb_pain` | BOOLEAN | Arm/leg pain |
| `medical_limb_weakness` | `medical_limb_weakness` | BOOLEAN | Weakness symptom |
| `medical_loss_of_consciousness` | `medical_loss_of_consciousness` | BOOLEAN | Unconsciousness |
| `medical_none_of_these` | `medical_none_of_these` | BOOLEAN | No symptoms |

### Accident Details

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `when_did_the_accident_happen` | `when_did_the_accident_happen` | DATE | Accident date |
| `what_time_did_the_accident_happen` | `what_time_did_the_accident_happen` | TIME | Accident time |
| `where_exactly_did_this_happen` | `where_exactly_did_this_happen` | TEXT | Location description |

### Weather Conditions

**Multiple Selection Checkboxes:**

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `weather_conditions` | `weather_conditions` | TEXT | General conditions |
| `weather_overcast` | `weather_overcast` | BOOLEAN | Overcast checkbox |
| `weather_street_lights` | `weather_street_lights` | BOOLEAN | Street lights on |
| `weather_heavy_rain` | `weather_heavy_rain` | BOOLEAN | Heavy rain checkbox |
| `weather_wet_road` | `weather_wet_road` | BOOLEAN | Wet road surface |
| `weather_fog` | `weather_fog` | BOOLEAN | Fog present |
| `weather_snow_on_road` | `weather_snow_on_road` | BOOLEAN | Snow on ground |
| `weather_bright_daylight` | `weather_bright_daylight` | BOOLEAN | Bright conditions |
| `weather_light_rain` | `weather_light_rain` | BOOLEAN | Light rain checkbox |
| `weather_clear_and_dry` | `weather_clear_and_dry` | BOOLEAN | Clear weather |
| `weather_dusk` | `weather_dusk` | BOOLEAN | Dusk/twilight |
| `weather_snow` | `weather_snow` | BOOLEAN | Snowing |

### Vehicle Information (Incident)

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `wearing_seatbelts` | `wearing_seatbelts` | TEXT | Seatbelt usage |
| `reason_no_seatbelts` | `reason_no_seatbelts` | TEXT | Why not worn |
| `airbags_deployed` | `airbags_deployed` | TEXT | Airbag deployment |
| `damage_to_your_vehicle` | `damage_to_your_vehicle` | TEXT | Damage description |

### Road Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `road_type` | `road_type` | TEXT | Type of road |
| `speed_limit` | `speed_limit` | TEXT | Posted speed limit |
| `junction_information` | `junction_information` | TEXT | Junction type |
| `junction_information_roundabout` | `junction_information_roundabout` | BOOLEAN | Roundabout checkbox |
| `junction_information_t_junction` | `junction_information_t_junction` | BOOLEAN | T-junction checkbox |
| `junction_information_traffic_lights` | `junction_information_traffic_lights` | BOOLEAN | Traffic lights |
| `junction_information_crossroads` | `junction_information_crossroads` | BOOLEAN | Crossroads checkbox |

### Special Conditions

**Multiple Selection Checkboxes:**

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `special_conditions` | `special_conditions` | TEXT | General conditions |
| `special_conditions_roadworks` | `special_conditions_roadworks` | BOOLEAN | Roadworks present |
| `special_conditions_defective_road` | `special_conditions_defective_road` | BOOLEAN | Road defects |
| `special_conditions_oil_spills` | `special_conditions_oil_spills` | BOOLEAN | Oil on road |
| `special_conditions_workman` | `special_conditions_workman` | BOOLEAN | Workers present |

### Detailed Account

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `detailed_account_of_what_happened` | `detailed_account_of_what_happened` | TEXT | Full narrative |

### Your Vehicle Details

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `make_of_car` | `make_of_car` | TEXT | Vehicle make |
| `model_of_car` | `model_of_car` | TEXT | Vehicle model |
| `license_plate_number` | `license_plate_number` | TEXT | Registration |
| `direction_and_speed` | `direction_and_speed` | TEXT | Travel details |
| `impact` | `impact` | TEXT | Impact description |
| `damage_caused_by_accident` | `damage_caused_by_accident` | TEXT | New damage |
| `any_damage_prior` | `any_damage_prior` | TEXT | Pre-existing damage |

### Other Driver Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `other_drivers_name` | `other_drivers_name` | TEXT | Other party name |
| `other_drivers_number` | `other_drivers_number` | TEXT | Other party phone |
| `other_drivers_address` | `other_drivers_address` | TEXT | Other party address |
| `other_make_of_vehicle` | `other_make_of_vehicle` | TEXT | Other vehicle make |
| `other_model_of_vehicle` | `other_model_of_vehicle` | TEXT | Other vehicle model |
| `vehicle_license_plate` | `vehicle_license_plate` | TEXT | Other reg number |
| `other_policy_number` | `other_policy_number` | TEXT | Other insurance policy |
| `other_insurance_company` | `other_insurance_company` | TEXT | Other insurer |
| `other_policy_cover` | `other_policy_cover` | TEXT | Other coverage type |
| `other_policy_holder` | `other_policy_holder` | TEXT | Other policy owner |
| `other_damage_accident` | `other_damage_accident` | TEXT | Damage to other vehicle |
| `other_damage_prior` | `other_damage_prior` | TEXT | Other pre-existing damage |

### Police Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `did_police_attend` | `did_police_attend` | TEXT | Police attendance |
| `accident_reference_number` | `accident_reference_number` | TEXT | Police reference |
| `police_officer_badge_number` | `police_officer_badge_number` | TEXT | Badge/collar number |
| `police_officers_name` | `police_officers_name` | TEXT | Officer name |
| `police_force_details` | `police_force_details` | TEXT | Force name |
| `breath_test` | `breath_test` | TEXT | Your breath test |
| `other_breath_test` | `other_breath_test` | TEXT | Other driver breath test |

### Witness Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `any_witness` | `any_witness` | TEXT | Witnesses present? |
| `witness_contact_information` | `witness_contact_information` | TEXT | Witness details |

### Additional Information

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `anything_else` | `anything_else` | TEXT | Additional notes |
| `call_recovery` | `call_recovery` | TEXT | Recovery needed? |
| `upgrade_to_premium` | `upgrade_to_premium` | TEXT | Premium upgrade |

### Document Uploads (Incident)

**11 File Upload Fields:**

| Typeform Field Ref | Supabase Column | Type | Notes |
|--------------------|-----------------|------|-------|
| `file_url_documents` | `file_url_documents` | TEXT (URL) | General documents |
| `file_url_documents_1` | `file_url_documents_1` | TEXT (URL) | Additional docs |
| `file_url_record_detailed_account_of_what_happened` | `file_url_record_detailed_account_of_what_happened` | TEXT (URL) | Audio/video recording |
| `file_url_what3words` | `file_url_what3words` | TEXT (URL) | Location image |
| `file_url_scene_overview` | `file_url_scene_overview` | TEXT (URL) | Scene photo 1 |
| `file_url_scene_overview_1` | `file_url_scene_overview_1` | TEXT (URL) | Scene photo 2 |
| `file_url_other_vehicle` | `file_url_other_vehicle` | TEXT (URL) | Other vehicle 1 |
| `file_url_other_vehicle_1` | `file_url_other_vehicle_1` | TEXT (URL) | Other vehicle 2 |
| `file_url_vehicle_damage` | `file_url_vehicle_damage` | TEXT (URL) | Your damage 1 |
| `file_url_vehicle_damage_1` | `file_url_vehicle_damage_1` | TEXT (URL) | Your damage 2 |
| `file_url_vehicle_damage_2` | `file_url_vehicle_damage_2` | TEXT (URL) | Your damage 3 |

**Image Processing Flow (same as signup):**
1. Typeform webhook sends temporary URLs
2. ImageProcessorV2 downloads and uploads to Supabase Storage
3. Creates records in `user_documents` table with `document_category: 'incident_report'`
4. Generates permanent API URLs
5. Stores API URLs in `incident_reports` table

### Hidden Fields (Incident Report)

| Hidden Field | Source | Supabase Column | Notes |
|--------------|--------|-----------------|-------|
| `user_id` or `auth_user_id` | Typeform Hidden | `create_user_id` | Links to user_signup |

### System Fields (Incident Report)

| Field | Supabase Column | Source | Type |
|-------|-----------------|--------|------|
| Submission Time | `date` | `submitted_at` or `new Date()` | TIMESTAMP |
| Form ID | `form_id` | `formResponse.form_id` | TEXT |
| Record ID | `id` | Auto-generated | UUID |
| Created At | `created_at` | Auto-generated | TIMESTAMP |
| Updated At | `updated_at` | Auto-generated | TIMESTAMP |

---

## Data Processing Notes

### Email Normalization

All email fields are normalized to lowercase per RFC 5321:

**User Signup:**
- `user_signup.email`
- `user_signup.recovery_breakdown_email`

**Incident Report:**
- None currently (but emergency contact email is within pipe-delimited string)

### Image Processing (ImageProcessorV2)

**Process:**
1. Webhook receives temporary Typeform URLs (expire after 30 days)
2. `ImageProcessorV2.processMultipleImages()` downloads images
3. Uploads to Supabase Storage in user-specific buckets
4. Creates record in `user_documents` table:
   - `create_user_id`: User identifier
   - `document_type`: 'image' or 'video'
   - `document_category`: 'user_signup' or 'incident_report'
   - `original_filename`: From Typeform
   - `storage_path`: Path in Supabase Storage
   - `file_size`, `mime_type`: Metadata
   - `status`: 'completed' or 'failed'
   - `public_url`: API download URL
5. API URL format: `{BASE_URL}/api/user-documents/{uuid}/download`
6. Permanent URLs stored back in original tables

**Dual Retention:**
- Images stored in both `user_documents` (master) and original table fields
- `user_documents.associated_with` links to 'user_signup' or 'incident_report'
- `user_documents.associated_id` links to the specific record ID
- Supports independent retention policies for different document types

### Null/Undefined Handling

All `null` and `undefined` values are removed before database insertion to avoid Supabase errors and keep data clean.

### Field Title Normalization

Typeform field titles are normalized for matching:
1. Convert to lowercase
2. Handle "(optional)" → "_optional"
3. Remove punctuation: `:;?!`
4. Replace spaces with underscores
5. Collapse multiple underscores
6. Trim leading/trailing underscores

**Example:**
```
"Street Address (optional)" → "street_address_optional"
"What time did the accident happen?" → "what_time_did_the_accident_happen"
```

### GDPR Compliance

- All webhook submissions stored in `audit_logs` table
- Includes full form response payload
- Tracked by `event_id` and `create_user_id`
- Used for compliance and debugging

---

## API Endpoints Related to Forms

### Emergency Contacts API

**Endpoint:** `GET /api/emergency/contacts/:userId`

**Response:**
```json
{
  "emergency_contact": "+447411005390",
  "recovery_breakdown_number": "07411005390",
  "emergency_services_number": "999"
}
```

**Processing:**
- Queries `user_signup.emergency_contact` (pipe-delimited string)
- Parses: `"Name | Phone | Email | Company"` → extracts phone number at index 1
- Also returns `recovery_breakdown_number` from direct field
- Always includes `emergency_services_number: "999"` as fallback

**Used By:**
- `incident.html` - Emergency call buttons
- `safety-check.html` - Safety check page
- `report.html` - Report page
- `temp.html` - Temporary pages

### User Documents API

**Endpoint:** `GET /api/user-documents/:documentId/download`

**Purpose:**
- Permanent download URLs for uploaded images
- Replaces temporary Typeform URLs
- Generates signed Supabase Storage URLs (1-hour validity)
- Auto-refreshes when expired

---

## Total Field Count

| Form | Table | Fields | Image Fields | Total |
|------|-------|--------|--------------|-------|
| User Signup | `user_signup` | 24 | 5 | 29 |
| Incident Report | `incident_reports` | 120+ | 11 | 131+ |
| **TOTAL** | | **144+** | **16** | **160+** |

---

## Related Documentation

- **Source Code:** `src/controllers/webhook.controller.js`
- **Emergency API:** `src/controllers/emergency.controller.js`
- **Image Processor:** `src/services/imageProcessorV2.js`
- **Supabase Schema:** Database tables and RLS policies
- **ADOBE_FORM_FILLING_GUIDE.md:** PDF form field mapping (uses data from these tables)

---

**Generated with Claude Code**
**Source:** Car Crash Lawyer AI System v2.1.0