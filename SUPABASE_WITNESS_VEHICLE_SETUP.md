# Supabase Tables Setup - Witnesses & Vehicles

**Created:** 2025-10-24
**Purpose:** Guide to create/verify witness and vehicle tables in Supabase

## ⚠️ Important: Missing Database Fields

The initial SQL schemas were **incomplete**. The `incident_other_vehicles` table is missing 7 DVLA fields that the PDF generation code expects:

- `driver_email`
- `mot_status`
- `mot_expiry_date`
- `tax_status`
- `tax_due_date`
- `fuel_type`
- `engine_capacity`

**You MUST run the update script** after creating the tables to add these fields.

## Quick Setup (3 Steps)

### Step 1: Check if Tables Exist

Login to Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to "Table Editor" in left sidebar
4. Look for `incident_witnesses` and `incident_other_vehicles`

**If tables exist:** Skip to Step 3 (Update for missing fields)
**If tables don't exist:** Continue to Step 2

### Step 2: Create Tables

Go to "SQL Editor" in Supabase Dashboard and run **BOTH** scripts:

#### 2a. Create Witnesses Table

Copy and paste the contents of:
```
scripts/create-incident-witnesses-table.sql
```

Click "Run" button.

**Expected output:**
```
Success. No rows returned
```

#### 2b. Create Vehicles Table

Copy and paste the contents of:
```
scripts/create-incident-other-vehicles-table.sql
```

Click "Run" button.

**Expected output:**
```
Success. No rows returned
```

### Step 3: Add Missing DVLA Fields (REQUIRED!)

This step is **REQUIRED** even if tables already existed.

Go to "SQL Editor" and run:
```
scripts/update-incident-other-vehicles-table.sql
```

Click "Run" button.

**Expected output:**
```
Success. No rows returned
```

This adds the 7 missing DVLA fields to the `incident_other_vehicles` table.

## Verification

### Method 1: Via Supabase Dashboard

1. Go to "Table Editor"
2. Click on `incident_witnesses`
   - Should have 11 columns: id, incident_id, create_user_id, witness_name, witness_phone, witness_email, witness_address, witness_statement, created_at, updated_at, deleted_at, gdpr_consent
3. Click on `incident_other_vehicles`
   - Should have 25+ columns including the DVLA fields (mot_status, tax_status, fuel_type, etc.)

### Method 2: Via SQL Query

Run this query in SQL Editor:

```sql
-- Check witness table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_witnesses'
ORDER BY ordinal_position;

-- Check vehicle table columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_other_vehicles'
ORDER BY ordinal_position;
```

**Expected witness columns (11):**
- id (uuid)
- incident_id (uuid)
- create_user_id (uuid)
- witness_name (text)
- witness_phone (text)
- witness_email (text)
- witness_address (text)
- witness_statement (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- deleted_at (timestamp with time zone)
- gdpr_consent (boolean)

**Expected vehicle columns (25):**
- id (uuid)
- incident_id (uuid)
- create_user_id (uuid)
- driver_name (text)
- driver_phone (text)
- driver_address (text)
- driver_email (text) ← **ADDED IN UPDATE**
- vehicle_license_plate (text)
- vehicle_make (text)
- vehicle_model (text)
- vehicle_color (text)
- vehicle_year_of_manufacture (text)
- insurance_company (text)
- policy_number (text)
- policy_cover (text)
- policy_holder (text)
- last_v5c_issued (text)
- damage_description (text)
- mot_status (text) ← **ADDED IN UPDATE**
- mot_expiry_date (text) ← **ADDED IN UPDATE**
- tax_status (text) ← **ADDED IN UPDATE**
- tax_due_date (text) ← **ADDED IN UPDATE**
- fuel_type (text) ← **ADDED IN UPDATE**
- engine_capacity (text) ← **ADDED IN UPDATE**
- dvla_lookup_successful (boolean)
- dvla_lookup_timestamp (timestamp with time zone)
- dvla_error_message (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- deleted_at (timestamp with time zone)
- gdpr_consent (boolean)

### Method 3: Test with Node.js

Create a test script to verify tables exist and have correct structure:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  // Check witnesses table
  const { data: w, error: we } = await supabase
    .from('incident_witnesses')
    .select('*')
    .limit(0);

  console.log('Witnesses table:', we ? '❌ MISSING' : '✅ EXISTS');

  // Check vehicles table
  const { data: v, error: ve } = await supabase
    .from('incident_other_vehicles')
    .select('*')
    .limit(0);

  console.log('Vehicles table:', ve ? '❌ MISSING' : '✅ EXISTS');
}

checkTables().catch(console.error);
"
```

## RLS (Row Level Security) Policies

Both tables have RLS enabled with these policies:

### incident_witnesses
- ✅ Users can view own witnesses
- ✅ Users can insert own witnesses
- ✅ Users can update own witnesses
- ✅ Users can delete own witnesses
- ✅ Service role bypasses all RLS

### incident_other_vehicles
- ✅ Users can view own other vehicles
- ✅ Users can insert own other vehicles
- ✅ Users can update own other vehicles
- ✅ Users can delete own other vehicles
- ✅ Service role bypasses all RLS

**Important:** The backend API uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. This is correct for webhook processing and admin operations.

## Indexes Created

### incident_witnesses
- `idx_incident_witnesses_incident_id` - For querying by incident
- `idx_incident_witnesses_user_id` - For querying by user
- `idx_incident_witnesses_deleted_at` - For filtering deleted records

### incident_other_vehicles
- `idx_incident_other_vehicles_incident_id` - For querying by incident
- `idx_incident_other_vehicles_user_id` - For querying by user
- `idx_incident_other_vehicles_deleted_at` - For filtering deleted records
- `idx_incident_other_vehicles_license_plate` - For DVLA lookups

## Triggers

Both tables have `updated_at` triggers that automatically update the `updated_at` timestamp on every UPDATE operation.

## Common Issues

### Issue 1: "relation does not exist"

**Symptom:**
```
error: relation "incident_witnesses" does not exist
```

**Solution:** Run Step 2 to create the tables.

### Issue 2: "column does not exist"

**Symptom:**
```
error: column "mot_status" of relation "incident_other_vehicles" does not exist
```

**Solution:** Run Step 3 to add missing DVLA fields.

### Issue 3: RLS blocking queries

**Symptom:**
```
Returns empty array even though data exists
```

**Solution:** Ensure you're using `SUPABASE_SERVICE_ROLE_KEY` not `SUPABASE_ANON_KEY` in backend API.

### Issue 4: Foreign key constraint violation

**Symptom:**
```
error: insert or update on table "incident_witnesses" violates foreign key constraint
```

**Solution:** Ensure the `incident_id` exists in `incident_reports` table before inserting witnesses/vehicles.

## Migration Path for Existing Data

If you already have witness/vehicle data in other tables, you'll need to migrate it:

```sql
-- Example: Migrate from old witness_reports table
INSERT INTO incident_witnesses (
  incident_id,
  create_user_id,
  witness_name,
  witness_phone,
  witness_email,
  witness_address,
  witness_statement,
  created_at,
  gdpr_consent
)
SELECT
  incident_id,
  create_user_id,
  name,
  phone,
  email,
  address,
  statement,
  created_at,
  true -- assume consent
FROM witness_reports
WHERE deleted_at IS NULL;
```

## Testing After Setup

Once tables are created and updated, test the complete flow:

1. **Test API endpoints:**
```bash
# Test witness creation
curl -X POST http://localhost:5000/api/witnesses \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "your-incident-uuid",
    "create_user_id": "your-user-uuid",
    "witness_name": "Test Witness",
    "witness_phone": "+447700900123"
  }'

# Test vehicle creation with DVLA fields
curl -X POST http://localhost:5000/api/other-vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "your-incident-uuid",
    "create_user_id": "your-user-uuid",
    "driver_name": "Test Driver",
    "driver_email": "driver@test.com",
    "vehicle_license_plate": "AB12CDE",
    "mot_status": "Valid",
    "tax_status": "Taxed",
    "fuel_type": "Petrol",
    "engine_capacity": "1600"
  }'
```

2. **Test PDF generation:**
```bash
node test-witness-vehicle-pdf.js your-user-uuid
```

## Files Reference

**Creation scripts:**
- `scripts/create-incident-witnesses-table.sql` - Creates witnesses table
- `scripts/create-incident-other-vehicles-table.sql` - Creates vehicles table

**Update script:**
- `scripts/update-incident-other-vehicles-table.sql` - Adds missing DVLA fields (**REQUIRED!**)

**Testing:**
- `test-witness-vehicle-pdf.js` - Automated test for PDF generation
- `WITNESS_VEHICLE_TESTING_GUIDE.md` - Complete testing procedures

## Next Steps

After setting up tables:

1. ✅ Verify tables exist (Method 1, 2, or 3 above)
2. ✅ Run update script to add DVLA fields
3. ✅ Test API endpoints
4. ✅ Test frontend forms (report-complete.html)
5. ✅ Test PDF generation
6. ✅ Check generated PDF has witness/vehicle pages

---

**Last Updated:** 2025-10-24
**Status:** Ready for setup
**Required:** Run all 3 SQL scripts (2 creates + 1 update)
