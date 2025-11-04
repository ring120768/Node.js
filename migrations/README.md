# Database Migrations for Page 7

## Current Status

Based on schema analysis (`node scripts/analyze-page7-schema.js`):

### ✅ Already Correct (5 fields)
These fields were already renamed in a previous migration:
- `other_drivers_insurance_company` ✅
- `other_drivers_policy_number` ✅
- `other_drivers_policy_holder_name` ✅
- `other_drivers_policy_cover_type` ✅
- `other_vehicle_registration` ✅

### ➕ Need to Add (16 fields)

**Driver Information (4 fields):**
- `other_full_name`
- `other_contact_number`
- `other_email_address`
- `other_driving_license_number`

**DVLA Lookup (10 fields):**
- `other_vehicle_look_up_make`
- `other_vehicle_look_up_model`
- `other_vehicle_look_up_colour`
- `other_vehicle_look_up_year`
- `other_vehicle_look_up_fuel_type`
- `other_vehicle_look_up_mot_status`
- `other_vehicle_look_up_mot_expiry_date`
- `other_vehicle_look_up_tax_status`
- `other_vehicle_look_up_tax_due_date`
- `other_vehicle_look_up_insurance_status`

**Damage Description (2 fields):**
- `no_visible_damage`
- `describe_damage_to_vehicle`

## Migration File to Use

**Use this file:** `page7-add-missing-fields.sql`

This migration:
- ✅ Only adds the 16 missing fields
- ✅ Skips the 4 insurance field renames (already done)
- ✅ Skips vehicle_registration (already exists)
- ✅ Uses `IF NOT EXISTS` for safety
- ✅ Wrapped in transaction (BEGIN/COMMIT)
- ✅ Includes rollback script
- ✅ Includes verification query

## How to Run

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar

### Step 2: Execute Migration
1. Copy entire contents of `page7-add-missing-fields.sql`
2. Paste into SQL Editor
3. Click "Run" button

### Step 3: Verify Success
Run the verification script:

```bash
node scripts/analyze-page7-schema.js
```

**Expected result:**
```
✅ Already correct: 21  (5 old + 16 new)
🔄 Need to rename: 0
➕ Need to add: 0
```

### Step 4: Test Backend
```bash
node scripts/test-page7-fields.js
```

**Expected result:**
```
🎉 ALL TESTS PASSED! Page 7 field mappings are correct.
✅ Passed: 92
❌ Failed: 0
```

## Rollback (if needed)

If you need to undo this migration, the rollback script is included at the bottom of `page7-add-missing-fields.sql`.

## Files

- `page7-add-missing-fields.sql` - **USE THIS** (16 fields to add)
- `page7-field-updates.sql` - OLD (included renames that are already done)
