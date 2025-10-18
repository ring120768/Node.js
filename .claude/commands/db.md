---
description: Show database schema and table relationships
---

# Database Schema Reference

Display the Supabase database structure, tables, and relationships for Car Crash Lawyer AI.

## Core Tables Overview

Present the database schema with table purposes and key relationships.

### User & Signup Data

**`user_signup`** - Primary user information
- **Purpose:** Stores personal details, vehicle info, insurance from initial signup
- **Key Fields:**
  - `create_user_id` (UUID, Primary Key) - Unique user identifier from Typeform
  - `driver_name`, `driver_surname`, `driver_email`, `driver_mobile`
  - `driver_street`, `driver_town`, `driver_postcode`, `driver_country`
  - `license_number` - UK driving license number
  - `license_plate`, `vehicle_make`, `vehicle_model`, `vehicle_colour`
  - `insurance_company`, `policy_number`, `policy_holder`, `cover_type`
  - `emergency_contact`, `recovery_company`
  - `created_at`, `updated_at`
- **Relationships:**
  - One user → Many incidents (via `incident_reports`)
  - One user → Many images (via `incident_images`)
  - One user → Many DVLA checks (via `dvla_vehicle_info_new`)

---

### Incident Reporting

**`incident_reports`** - Accident details and multi-step form responses
- **Purpose:** Stores detailed accident information collected via multi-step form
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - **Safety:** `are_you_safe_and_ready_to_complete_this_form`, `medical_attention_required`, `six_point_safety_check_completed`
  - **Medical:** `chest_pain`, `breathlessness`, `severe_headache`, `limb_pain_impeding_mobility`, `loss_of_consciousness` (booleans)
  - **Accident Details:** `when_did_the_accident_happen`, `what_time_did_the_accident_happen`, `where_exactly_did_the_accident_happen`
  - **Weather:** `overcast_dull`, `heavy_rain`, `wet_road`, `clear_and_dry`, `bright_daylight`, `fog_poor_visibility` (booleans)
  - **Road:** `road_type`, `speed_limit`, `junction_information`
  - **Description:** `describe_what_happened` (large text)
  - **Vehicle:** `make_of_car`, `model_of_car`, `license_plate_incident`, `direction_of_travel_and_estimated_speed`
  - **Other Party:** `other_vehicles_involved`, `other_driver_name`, `other_driver_number`, `other_insurance_company`
  - **Police:** `did_the_police_attend_the_scene`, `accident_reference_number`, `police_officer_name`, `breath_test`
  - **Witnesses:** `witness_present`, `witness_information`
  - `created_at`, `updated_at`
- **Relationships:**
  - Belongs to one user (via `create_user_id`)

---

### Images & Evidence

**`incident_images`** - Uploaded photos and documents
- **Purpose:** Stores references to files uploaded to Supabase Storage
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - `image_type` - Type of image (driving_license, vehicle_front, vehicle_back, vehicle_driver_side, vehicle_passenger_side, scene_overview, vehicle_damage, document, what3words, etc.)
  - `file_name` - Filename in Supabase Storage
  - `file_url` - Public or signed URL
  - `uploaded_at`, `deletion_scheduled_at`, `deletion_completed`
- **Relationships:**
  - Belongs to one user (via `create_user_id`)
- **Storage Bucket:** `incident-images-secure`

---

### DVLA Integration

**`dvla_vehicle_info_new`** - DVLA vehicle check results
- **Purpose:** Stores DVLA vehicle information retrieved via API
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - `registration_number` - UK vehicle registration
  - `make`, `model`, `colour`
  - `month_of_manufacture`, `year_of_manufacture`
  - `mot_status`, `mot_expiry_date`
  - `road_tax_status`, `tax_due_date`
  - `fuel_type`, `engine_capacity`, `co2_emissions`
  - `wheelplan`, `type_approval`, `revenue_weight`
  - `date_of_last_v5c_issued`, `marked_for_export`
  - `created_at`
- **Relationships:**
  - Belongs to one user (via `create_user_id`)
- **Notes:** Can have multiple records per user (own vehicle + other party's vehicle)

---

### AI Processing

**`ai_transcription`** - Audio transcription results
- **Purpose:** Stores transcribed personal statements from audio recordings
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - `transcription` (large text) - Full transcription from Whisper API
  - `audio_url` - Reference to audio file
  - `duration_seconds`
  - `created_at`, `updated_at`
- **Relationships:**
  - Belongs to one user (via `create_user_id`)

**`ai_summary`** - AI-generated accident summaries
- **Purpose:** Stores AI-analyzed summaries of accident data
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - `summary` (large text) - AI-generated summary
  - `analysis_type` - Type of analysis performed
  - `created_at`, `updated_at`
- **Relationships:**
  - Belongs to one user (via `create_user_id`)

---

### PDF Reports

**`completed_incident_forms`** - Generated PDF reports
- **Purpose:** Stores completed PDF reports and their delivery status
- **Key Fields:**
  - `id` (UUID, Primary Key)
  - `create_user_id` (UUID, Foreign Key → `user_signup`)
  - `form_data` (JSONB) - All data used to generate PDF
  - `pdf_base64` (text) - Base64-encoded PDF (truncated)
  - `pdf_url` - Signed URL to PDF in Supabase Storage
  - `generated_at`
  - `sent_to_user` (boolean), `sent_to_accounts` (boolean)
  - `email_status` (JSONB) - Email delivery status
- **Relationships:**
  - Belongs to one user (via `create_user_id`)
- **Storage Bucket:** `incident-images-secure` (in `completed_forms/` directory)

---

## Database Relationships Diagram

```
user_signup (create_user_id)
    │
    ├──→ incident_reports (1:many)
    │
    ├──→ incident_images (1:many)
    │       └── image_type groups: driving_license, vehicle_*, scene_*, damage_*
    │
    ├──→ dvla_vehicle_info_new (1:many)
    │       └── Usually 2 records: user's vehicle + other party's vehicle
    │
    ├──→ ai_transcription (1:many)
    │
    ├──→ ai_summary (1:many)
    │
    └──→ completed_incident_forms (1:many)
```

---

## RLS Policies Summary

All tables should have Row Level Security (RLS) enabled. Check policies:

```sql
-- View RLS policies for a table
SELECT * FROM pg_policies WHERE tablename = 'user_signup';
```

**Expected policies:**
- Users can only read/write their own data
- Service role can access all data
- Anonymous users cannot access any data

---

## Common Queries

### Fetch all data for a user (for PDF generation)

```javascript
// This is what dataFetcher.js does
const { data: userData } = await supabase
  .from('user_signup')
  .select('*')
  .eq('create_user_id', userId)
  .single();

const { data: incidents } = await supabase
  .from('incident_reports')
  .select('*')
  .eq('create_user_id', userId)
  .order('created_at', { ascending: false });

const { data: images } = await supabase
  .from('incident_images')
  .select('*')
  .eq('create_user_id', userId)
  .is('deletion_completed', null);

const { data: dvla } = await supabase
  .from('dvla_vehicle_info_new')
  .select('*')
  .eq('create_user_id', userId);

const { data: transcription } = await supabase
  .from('ai_transcription')
  .select('*')
  .eq('create_user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1);

const { data: summary } = await supabase
  .from('ai_summary')
  .select('*')
  .eq('create_user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1);
```

### Check if PDF has been generated

```javascript
const { data } = await supabase
  .from('completed_incident_forms')
  .select('id, generated_at, sent_to_user')
  .eq('create_user_id', userId)
  .order('generated_at', { ascending: false })
  .limit(1);
```

### Get all images grouped by type

```javascript
const { data: images } = await supabase
  .from('incident_images')
  .select('*')
  .eq('create_user_id', userId)
  .is('deletion_completed', null);

const imagesByType = {};
images.forEach(img => {
  imagesByType[img.image_type] = img;
});
```

---

## Storage Buckets

**`incident-images-secure`** - Main storage bucket
- **Access:** Private with signed URLs
- **Structure:**
  - `{user_id}/driving_license/*`
  - `{user_id}/vehicle_photos/*`
  - `{user_id}/scene_photos/*`
  - `completed_forms/{user_id}/report_*.pdf`
- **RLS:** Enabled
- **Max file size:** 10MB (Supabase free tier recommendation)

---

## Database Connection

**Environment Variables Required:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci... (service role key)
SUPABASE_ANON_KEY=eyJhbGci... (anon key for client-side)
```

**Test Connection:**
```bash
node scripts/test-supabase-client.js
```

---

## Summary

**Total Tables:** 7 core tables
**Primary Key:** `create_user_id` (UUID from Typeform)
**Main Flow:** user_signup → incident_reports → ai processing → completed_incident_forms
**Storage:** Supabase Storage bucket `incident-images-secure`
**Security:** RLS policies on all tables

Need to see actual data? Run queries with Supabase client or use Supabase Dashboard.
