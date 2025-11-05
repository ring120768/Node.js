# Database Migrations for Page 7

## Current Status

Based on schema analysis (`node scripts/analyze-page7-schema.js` and `node scripts/check-duplicate-columns.js`):

### ✅ Migrations Completed

**Step 1 (DONE):** `page7-add-missing-fields.sql` added 16 fields:
- ✅ 4 driver information fields
- ✅ 10 DVLA lookup fields
- ✅ 2 damage description fields

**Step 2 (PENDING):** Clean up duplicate column

### ⚠️ Issue Found: Duplicate Column

Both old and new columns exist:
- `other_insurance_company` (old, needs to be dropped)
- `other_drivers_insurance_company` (new, correct)

The other 3 insurance fields are clean:
- ✅ `other_drivers_policy_number` (only new exists)
- ✅ `other_drivers_policy_holder_name` (only new exists)
- ✅ `other_drivers_policy_cover_type` (only new exists)

### ➕ Already Added (16 fields - DONE)

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

## Migration to Run NOW

**Use this file:** `page7-cleanup-duplicate-column.sql`

This migration:
- ✅ Migrates data from old to new column (safe data preservation)
- ✅ Drops old duplicate column `other_insurance_company`
- ✅ Wrapped in transaction (BEGIN/COMMIT)
- ✅ Includes rollback script (but cannot restore data after drop!)
- ✅ Includes verification query

## How to Run

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar

### Step 2: Execute Migration
1. Copy entire contents of `page7-cleanup-duplicate-column.sql`
2. Paste into SQL Editor
3. Click "Run" button

### Step 3: Verify Success

**Check for duplicates:**
```bash
node scripts/check-duplicate-columns.js
```

**Expected result:**
```
✅ No duplicate columns found.
```

**Verify schema:**
```bash
node scripts/analyze-page7-schema.js
```

**Expected result:**
```
✅ Already correct: 21
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

## Diagnostic Scripts

- `scripts/check-duplicate-columns.js` - Detects old/new column duplicates
- `scripts/analyze-page7-schema.js` - Checks field mapping status
- `scripts/test-page7-fields.js` - Tests HTML/JavaScript field references

## Migration Files

### ✅ Already Applied
- `page7-add-missing-fields.sql` - Added 16 new fields (DONE)

### 📋 To Apply Now
- `page7-cleanup-duplicate-column.sql` - **RUN THIS** (clean up duplicate)

### 📚 Archive
- `page7-field-updates.sql` - OLD (included renames already done in earlier migration)
- `page7-rename-insurance-company.sql` - SKIP (would fail, both columns exist)
