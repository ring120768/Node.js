# Testing Incident Form Submission

## Overview

This document describes how to test the complete end-to-end incident form submission flow.

## Test Script

**File**: `test-incident-form-submission.js`

**Purpose**: Validates the complete flow from form data collection through database insertion and photo finalization.

## Prerequisites

1. **Authenticated User**: You need a valid user UUID from Supabase Auth
2. **Database Access**: Supabase credentials in `.env`
3. **Test Data**: Session ID for photos (optional)

## How to Run

### Option 1: With Existing User

```bash
# Get user ID from Supabase dashboard (Auth > Users tab)
node test-incident-form-submission.js <user-uuid> [session-id]

# Example:
node test-incident-form-submission.js a1b2c3d4-e5f6-7890-abcd-ef1234567890 test-session-123
```

### Option 2: Create Test User First

```bash
# 1. Create test user via Supabase dashboard or signup endpoint
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# 2. Get user ID from response, then run test
node test-incident-form-submission.js <user-id-from-response>
```

## What the Test Does

### Step 1: Authentication
- Verifies user exists in database
- Displays user email for confirmation

### Step 2: Form Data Generation
Generates mock data for all 12 pages:

- **Page 1**: Date (2025-11-01), time (14:30), location (123 High Street, London)
- **Page 2**: Medical info + 13 symptom checkboxes
- **Page 3**: Weather (6), visibility (3), road conditions (7), road types (6), speed data
- **Page 4**: Special conditions, junction type, traffic controls
- **Page 4a**: Session ID for photo uploads
- **Page 5**: Your vehicle (Toyota Corolla, Blue, AB12 CDE)
- **Page 7**: Other vehicle + driver (Ford Focus, John Smith)
- **Page 9**: Witness details (Jane Doe)
- **Page 10**: Police details (PC David Jones, MET/2025/001234)
- **Page 12**: Ongoing pain description

### Step 3: Temp Photo Uploads
Creates 2 mock temp_uploads records:
- `temp/${session_id}/scene_photo_1.jpg` (1MB)
- `temp/${session_id}/scene_photo_2.jpg` (2MB)

### Step 4: Form Submission
Inserts complete incident report into `incident_reports` table with all 207+ fields mapped.

### Step 5: Data Verification
Queries database to confirm:
- All fields saved correctly
- Booleans converted properly (yes/no → true/false)
- Arrays stored correctly (special_conditions)
- Foreign keys linked (create_user_id)

### Step 6: Photo Check
Verifies temp_uploads records exist and are ready for finalization.

## Expected Output

```
🧪 Testing Incident Form Submission Flow

═══════════════════════════════════════════════════════════

📋 Test Configuration:
   User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   Session ID: test-session-1699000000000
   Endpoint: POST /api/incident-form/submit

Step 1: Authenticating user...
✅ User found: test@example.com

Step 2: Generating mock form data (Pages 1-12)...
✅ Form data generated:
   - Page 1: Date, location, description
   - Page 2: Medical (3 fields + 13 symptoms)
   - Page 3: Weather (6), visibility (3), road (7), types (6), speed (2)
   - Page 4: Special conditions, junction, traffic controls
   - Page 4a: Session ID for photos: test-session-1699000000000
   - Page 5: Your vehicle (5 fields)
   - Page 7: Other vehicle + driver (8 fields)
   - Page 9: Witnesses (4 fields)
   - Page 10: Police (4 fields)
   - Page 12: Final medical (2 fields)

Step 3: Creating temp photo uploads...
✅ Created 2 temp photo uploads

Step 4: Submitting form data to database...
✅ Incident report created: 123e4567-e89b-12d3-a456-426614174000

Step 5: Verifying data in database...
✅ Data verification:
   - Incident ID: 123e4567-e89b-12d3-a456-426614174000
   - User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   - Date: 2025-11-01
   - Location: 123 High Street, SW1A 1AA
   - Medical attention: Yes
   - Weather: Clear=true, Rain=false
   - Your speed: 30 mph (limit: 30)
   - Vehicle: Toyota Corolla
   - Other vehicle: Ford Focus
   - Police attended: Yes

Step 6: Checking temp uploads...
✅ Found 2 temp uploads for session test-session-1699000000000
   Status: Unclaimed

═══════════════════════════════════════════════════════════

🎉 TEST PASSED

Summary:
   ✅ Form data generated (all 12 pages)
   ✅ Incident report created: 123e4567-e89b-12d3-a456-426614174000
   ✅ All fields mapped correctly
   ✅ Database verification successful
   ✅ Temp uploads ready for finalization

Next Steps:
   1. Test LocationPhotoService.finalizePhotos() separately
   2. Test via HTTP: POST /api/incident-form/submit
   3. Integrate into final form page (incident-form-page12.html)
```

## Troubleshooting

### Error: User not found
```
❌ User not found: Could not find row
```
**Solution**: Check user ID is correct, or create test user first.

### Error: Insert failed
```
❌ Failed to insert incident report: column "xxx" does not exist
```
**Solution**: Run migration 002-005 first (`migrations/fix-existing-schema-002-005.sql`).

### Error: No temp uploads
```
✅ Found 0 temp uploads for session xxx
```
**Solution**: This is OK - photos are optional. Test will still pass.

## Integration Testing (Next Step)

After this test passes, test the actual HTTP endpoint:

```bash
# 1. Get auth token from signup/login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# 2. Extract access_token from response

# 3. Test incident form submission
curl -X POST http://localhost:3000/api/incident-form/submit \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=<token-from-step-1>" \
  -d '{
    "page1": { "incident_date": "2025-11-01", ... },
    "page2": { "medical_attention_needed": "yes", ... },
    ...
  }'
```

## Files Modified

- `src/controllers/incidentForm.controller.js` - Controller implementation
- `src/routes/incidentForm.routes.js` - Route definitions
- `src/routes/index.js` - Route registration
- `test-incident-form-submission.js` - **This test script**

## Database Requirements

**Tables**:
- `incident_reports` - Main table (207+ columns)
- `user_signup` - User personal info
- `temp_uploads` - Temporary photo uploads
- `user_documents` - Permanent photo storage (after finalization)

**Columns Added** (Migration 002-005):
- `visibility_street_lights` (renamed from visibility_streets_)
- `your_speed` (text field)
- `road_type_private_road` (renamed from road_type_private)
- `user_documents.incident_report_id` (foreign key)
- `user_documents.download_url` (permanent API URL)

## Success Criteria

✅ Test passes with all steps green
✅ Incident report created in database
✅ All 207+ fields mapped correctly
✅ Boolean conversions work (yes/no → true/false)
✅ Arrays stored correctly (special_conditions)
✅ Temp uploads ready for photo service

## Next Steps After Test Passes

1. **Test LocationPhotoService**: Run photo finalization separately
2. **HTTP Integration**: Test via actual HTTP POST request
3. **Frontend Integration**: Update `incident-form-page12.html` to call API
4. **E2E Test**: Fill entire form manually and submit
5. **Photo Verification**: Confirm photos move from temp → permanent storage

---

**Last Updated**: 2025-11-03
**Status**: Ready for testing with real user account
