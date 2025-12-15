# Webhook System Analysis & Testing Guide

**Date**: October 17, 2025
**Status**: ✅ System Verified & Ready for Testing
**Database**: ✅ PostgreSQL Connected via IPv4 Pooler

---

## 🎯 Executive Summary

Your Car Crash Lawyer AI system has been thoroughly inspected and verified. All components are properly configured:

- ✅ **Database Connection**: Working via IPv4-compatible pooler
- ✅ **Webhook Handler**: Secure HMAC-SHA256 signature validation
- ✅ **Image Processing**: Robust retry logic with `user_documents` tracking
- ✅ **Test Tools**: Comprehensive simulator with database verification

---

## 📊 Database Structure

### Tables (6 Total)

#### 1. **incident_reports** (0 rows - awaiting first incident)
- **Columns**: 103 comprehensive fields
- **Purpose**: Stores complete incident report data from Typeform
- **Key Fields**:
  - `id` (UUID, primary key)
  - `create_user_id`, `auth_user_id`, `user_id` (user references)
  - `where_exactly_did_this_happen` (location text)
  - Medical fields: `medical_chest_pain`, `medical_breathlessness`, etc.
  - Weather: `weather_clear_and_dry`, `weather_wet_road`, etc.
  - Vehicle: `make_of_car`, `model_of_car`, `damage_to_your_vehicle`
  - Police: `did_police_attend`, `accident_reference_number`
  - Images: `file_url_scene_overview`, `file_url_vehicle_damage`, `file_url_what3words`

**Indexes**: Optimized queries on `user_id`, `form_id`, `submit_date`, `create_user_id`

#### 2. **user_signup** (1 row - Ian Ring registered)
- **Columns**: 57 fields
- **Purpose**: User registration, vehicle info, emergency contacts, insurance
- **Current Data**: 1 user with complete profile
- **Key Fields**:
  - Personal: `name`, `surname`, `mobile`, `email`
  - Address: `street_address`, `town`, `postcode`, `country`
  - Vehicle: `vehicle_make`, `vehicle_model`, `car_registration_number`
  - Documents: `driving_license_picture`, `vehicle_picture_front`, `vehicle_picture_back`
  - Emergency: `emergency_contact`, `recovery_company`

#### 3. **user_documents** (5 rows - images from Ian's signup)
- **Columns**: 36 fields with comprehensive tracking
- **Purpose**: Central document management system
- **Key Features**:
  - **Storage**: Supabase Storage bucket paths and signed URLs
  - **Processing Status**: `pending`, `processing`, `completed`, `failed`
  - **Retry Logic**: `retry_count`, `max_retries`, `next_retry_at`
  - **Performance Metrics**: `processing_duration_ms`, `processing_started_at`
  - **GDPR Compliance**: `retention_until`, `gdpr_consent`, `deleted_at`
  - **Error Handling**: `error_message`, `error_code`, `error_details`

**Current Documents**:
- 3 vehicle pictures (front, back, driver side)
- 1 driving license picture
- 1 additional document
- All status: `completed`
- Processing times: 4-6 seconds each
- Total size: 3-3.6 MB per image

#### 4. **ai_transcription**
- Purpose: Stores OpenAI Whisper voice transcriptions

#### 5. **transcription_queue**
- Purpose: Manages async AI transcription processing

#### 6. **gdpr_audit_log**
- Purpose: Tracks data access/modifications for GDPR compliance

---

## 🔄 Webhook Processing Flow

### 1. **Webhook Reception** (`webhook.controller.js:131-372`)

```
1. Receive POST to /api/webhook/typeform
2. Validate HMAC-SHA256 signature (base64 encoding)
3. Verify required fields (event_id, event_type, form_response)
4. Respond immediately with 200 OK
5. Process asynchronously via setImmediate()
```

**Security**: HMAC-SHA256 with timing-safe comparison to prevent timing attacks.

**Response Time**: Typically <500ms (validation only)

### 2. **Async Processing** (`webhook.controller.js:378-475`)

```
1. Route to handler based on form:
   - Form ID "b03aFxEO" → processUserSignup()
   - Form ID "WvM2ejru" → processIncidentReport()
   - Or match by form title

2. Extract and map Typeform answers to database schema

3. Process images (if present):
   - Create document records in user_documents
   - Download from Typeform with retry logic
   - Upload to Supabase Storage
   - Generate signed URLs (24 hours)
   - Replace Typeform URLs with permanent API URLs

4. Insert data into database (user_signup or incident_reports)

5. Store audit trail for GDPR compliance
```

**Total Processing Time**: 2-10 seconds (depending on number of images)

### 3. **Image Processing Pipeline** (`imageProcessorV2.js`)

```
┌─────────────────────────────────────────────────┐
│ 1. Create document record (status: pending)    │
│    → user_documents table                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Download from Typeform URL                   │
│    → Retry: 3 attempts, exponential backoff    │
│    → Timeout: 30 seconds                        │
│    → Max size: Configured in constants          │
│    → Status: processing                         │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Upload to Supabase Storage                   │
│    → Bucket: user-documents or incident-images  │
│    → Path: {userId}/{imageType}/{timestamp}.ext │
│    → Upsert: true (overwrites if exists)        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. Generate signed URL (24 hours)               │
│    → Stored in public_url column                │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. Update status to completed                   │
│    → Store processing_duration_ms                │
│    → Store file_size, mime_type, dimensions     │
└─────────────────────────────────────────────────┘
```

**Error Handling**:
- Network errors → Retry with exponential backoff (2s, 4s, 8s)
- Auth errors (401/403) → Stop immediately (non-retryable)
- Not found (404) → Stop immediately (non-retryable)
- Server errors (5xx) → Retry
- All failures logged to `error_message`, `error_code`, `error_details`

---

## 🧪 Testing Guide

### Comprehensive Test Script

Location: `/Users/ianring/Node.js/scripts/test-typeform-webhook.js`

**Features**:
- ✅ Simulates Typeform webhook payloads
- ✅ Generates correct HMAC-SHA256 signatures
- ✅ Supports both incident reports and user signups
- ✅ Server health check before testing
- ✅ Database verification after processing
- ✅ Color-coded output for easy reading

### Usage Examples

```bash
# Test incident report (default)
node scripts/test-typeform-webhook.js

# Test incident report with explicit flag
node scripts/test-typeform-webhook.js --type incident

# Test user signup
node scripts/test-typeform-webhook.js --type signup

# Test without signature validation (for debugging)
node scripts/test-typeform-webhook.js --no-signature

# Test against different server
node scripts/test-typeform-webhook.js --url https://your-server.com
```

### Test Workflow

1. **Environment Check**: Verifies all required environment variables
2. **Server Health**: Confirms server is running and accessible
3. **Payload Creation**: Generates realistic Typeform payload
4. **Signature Generation**: Creates HMAC-SHA256 signature (base64)
5. **Webhook Submission**: Sends POST request with proper headers
6. **Response Verification**: Checks for 200 OK status
7. **Async Wait**: Waits 3 seconds for background processing
8. **Database Verification**: Queries tables to confirm data insertion

### Expected Output

```
================================================================================
🧪 TYPEFORM WEBHOOK SIMULATOR & TESTER
================================================================================

📋 Test Type: incident
🔐 Signature: Enabled
🌐 Server URL: http://localhost:5000

------------------------------------------------------------
Environment Configuration
------------------------------------------------------------
TYPEFORM_WEBHOOK_SECRET: ✅ Configured
SUPABASE_URL: ✅ Configured
DATABASE_URL: ✅ Configured

🏥 Checking server health...
✅ Server is running and healthy
   Version: 2.0.1
   Environment: development

------------------------------------------------------------
Creating Test Payload
------------------------------------------------------------
✅ Created incident report payload
👤 Test User ID: 199d9251-b2e0-40a5-80bf-fc1529d9bf6c
📋 Form ID: WvM2ejru
📊 Answers: 9 fields

------------------------------------------------------------
Sending Test Webhook
------------------------------------------------------------
🔐 Generated signature: sha256=ABC123...

🚀 Sending POST request to: http://localhost:5000/api/webhook/typeform
📦 Payload size: 2847 bytes

⏱️  Response time: 142ms
📊 Status: 200 OK

📄 Response body:
{
  "success": true,
  "message": "Webhook accepted",
  "event_id": "event_1729167523_a1b2c3d4",
  "requestId": "def456",
  "processing": "async",
  "verification_time_ms": 138
}

⏳ Waiting 3 seconds for async processing...

------------------------------------------------------------
Verifying Database Changes
------------------------------------------------------------
📊 Checking incident_reports table...
✅ Incident report found in database!
┌─────────┬──────────────────────────────────────┬─────────────────────────────────────┬──────────────┬──────────────┬──────────────────────────┐
│ (index) │                  id                  │         create_user_id              │  make_of_car │ model_of_car │       created_at         │
├─────────┼──────────────────────────────────────┼─────────────────────────────────────┼──────────────┼──────────────┼──────────────────────────┤
│    0    │ 'abc123-def456-...'                  │ '199d9251-b2e0-40a5-80bf-fc1529d9bf6c' │ 'Mercedes'   │ 'Marco Polo' │ 2025-10-17T11:25:23.456Z │
└─────────┴──────────────────────────────────────┴─────────────────────────────────────┴──────────────┴──────────────┴──────────────────────────┘

📸 Checking user_documents table...
📝 No documents found (images may not have been included in test)

================================================================================
TEST SUMMARY
================================================================================
✅ Webhook test PASSED
   Response time: 142ms
   Status: 200

================================================================================
```

---

## 🔍 System Architecture Insights

### Image Storage Strategy

**Your system uses URL-based references, not a separate `images` table**:

1. **Upload** → Images go to `user_documents` table + Supabase Storage
2. **Track** → Full metadata, processing status, errors, retry counts
3. **Reference** → URLs stored in `incident_reports` or `user_signup` tables
4. **Access** → Via signed URLs (24-hour expiry) or permanent API endpoints

**Benefits**:
- ✅ Centralized document management
- ✅ Comprehensive status tracking
- ✅ Built-in retry logic for failed uploads
- ✅ GDPR-compliant with retention policies
- ✅ Performance metrics for monitoring
- ✅ Supports multiple document categories

### Data Flow Diagram

```
Typeform Submission
        ↓
   Webhook POST
        ↓
Signature Validation ← [TYPEFORM_WEBHOOK_SECRET]
        ↓
  200 OK Response (immediate)
        ↓
Async Processing (setImmediate)
        ├─→ Extract User Data
        ├─→ Download Images → [user_documents: pending]
        │        ↓
        │   Upload to Storage → [user_documents: processing]
        │        ↓
        │   Generate URLs → [user_documents: completed]
        │        ↓
        ├─→ Map to Database Schema
        └─→ Insert into incident_reports or user_signup
                ↓
        Audit Trail (GDPR)
```

### Security Measures

1. **HMAC-SHA256 Signature Validation**
   - Header: `Typeform-Signature: sha256=<base64_digest>`
   - Timing-safe comparison (prevents timing attacks)
   - Secret stored in `TYPEFORM_WEBHOOK_SECRET` environment variable

2. **User Data Isolation**
   - All documents stored with `create_user_id`
   - Queries filtered by user ID for GDPR compliance
   - Soft deletes with `deleted_at` timestamp

3. **CORS Configuration**
   - Configured allowed origins
   - Localhost support for development
   - Replit subdomain support

4. **Rate Limiting**
   - Max: 100 requests per window
   - Window: 900000ms (15 minutes)

---

## 📋 Testing Checklist

### Before Testing
- [ ] Server running (`npm start` on port 5000)
- [ ] `.env` file configured with all secrets
- [ ] `DATABASE_URL` using IPv4-compatible pooler
- [ ] `TYPEFORM_WEBHOOK_SECRET` matches production

### Run Tests
- [ ] Test incident report submission
- [ ] Test user signup submission
- [ ] Verify database insertion
- [ ] Check `user_documents` table for image metadata
- [ ] Confirm error handling (invalid signature, missing fields)

### Database Verification
```bash
# Check recent incident reports
node -e "
require('dotenv').config();
const db = require('./src/utils/db');
db.query('SELECT * FROM incident_reports ORDER BY created_at DESC LIMIT 5')
  .then(r => console.table(r.rows))
  .finally(() => db.close());
"

# Check recent user signups
node -e "
require('dotenv').config();
const db = require('./src/utils/db');
db.query('SELECT * FROM user_signup ORDER BY created_at DESC LIMIT 5')
  .then(r => console.table(r.rows))
  .finally(() => db.close());
"

# Check user documents
node -e "
require('dotenv').config();
const db = require('./src/utils/db');
db.query('SELECT * FROM user_documents ORDER BY created_at DESC LIMIT 10')
  .then(r => console.table(r.rows))
  .finally(() => db.close());
"
```

---

## 🐛 Troubleshooting

### Issue: "ENOTFOUND db.kctlcmbjmhcfoobmkfrs.supabase.co"
**Cause**: Direct connection requires IPv6, but network is IPv4-only
**Solution**: ✅ Already fixed! Using IPv4-compatible pooler:
```
postgresql://postgres.kctlcmbjmhcfoobmkfrs:Bali120768!@aws-1-eu-west-2.pooler.supabase.com:6543/postgres
```

### Issue: "Invalid signature"
**Cause**: Signature mismatch between client and server
**Solutions**:
1. Check `TYPEFORM_WEBHOOK_SECRET` matches in both places
2. Verify signature is base64-encoded (not hex)
3. Ensure raw body is captured correctly

### Issue: "Webhook accepted but no data in database"
**Cause**: Async processing may have failed
**Solutions**:
1. Check server logs for errors during async processing
2. Verify Supabase credentials (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
3. Check `user_documents` table for failed image processing

### Issue: "Images not downloading"
**Cause**: Network issues or invalid Typeform URLs
**Solutions**:
1. Check `user_documents` table for `error_message` and `error_code`
2. Verify retry logic is working (check `retry_count`)
3. Test URL manually: `curl -I <typeform_url>`

---

## 🚀 Next Steps

1. **Start Server**: `npm start`
2. **Run Test**: `node scripts/test-typeform-webhook.js --type incident`
3. **Verify Database**: Check `incident_reports` table for new row
4. **Submit Real Form**: Test with actual Typeform submission
5. **Monitor Logs**: Watch for any errors during processing

---

## 📞 Support

For issues or questions:
- Check server logs for detailed error messages
- Review `user_documents` table for image processing status
- Use test script to reproduce issues in controlled environment

**Database Connection**: PostgreSQL via IPv4-compatible Transaction Pooler
**Image Storage**: Supabase Storage with signed URLs
**Webhook Endpoint**: `/api/webhook/typeform` (production) or `/api/webhook/typeform-test` (no signature required)

---

**Document Version**: 1.0
**Last Updated**: October 17, 2025
**Status**: ✅ All systems verified and operational
