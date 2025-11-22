# Witness Migrations Required - Manual Execution Needed

## 🔴 STATUS: MIGRATIONS NOT EXECUTED

**Discovery Date**: 2025-11-07
**Issue**: The `incident_witnesses` table doesn't exist in the database, despite having correct migration files.

---

## Summary

✅ **Migration files exist** and are correctly written
✅ **Code is correct** (dataFetcher.js, controllers, PDF generator)
❌ **Migrations NOT executed** - table doesn't exist in database

**Impact**: Witness functionality cannot work until migrations are run.

---

## Migration Files (In Correct Order)

Located in `/Users/ianring/Node.js/supabase/migrations/`:

### 1. `20251104000000_create_incident_witnesses_table.sql`
**Purpose**: Create incident_witnesses table with RLS policies

**Creates**:
- Table: `incident_witnesses`
- Columns:
  - `id UUID PRIMARY KEY`
  - `incident_report_id UUID` (foreign key to incident_reports)
  - `create_user_id UUID` (foreign key to auth.users)
  - `witness_number INTEGER` (1, 2, 3, etc.)
  - `witness_name TEXT` (required)
  - `witness_mobile_number TEXT` (optional)
  - `witness_email_address TEXT` (optional)
  - `witness_address TEXT` (optional)
  - `witness_statement TEXT` (required)
  - `created_at`, `updated_at` timestamps
- Indexes for performance
- RLS policies (users see only their witnesses)
- Auto-update trigger for timestamps

### 2. `20251104000001_add_witness_2_address.sql`
**Purpose**: Add witness_address column (if needed)

### 3. `20251104000002_fix_incident_witnesses_schema.sql`
**Purpose**: Schema corrections/fixes

### 4. `20251104000003_rename_witness_columns_to_match_pdf.sql`
**Purpose**: Rename columns to match PDF field names
- `witness_phone` → `witness_mobile_number`
- `witness_email` → `witness_email_address`

---

## How to Execute (Supabase Dashboard)

### Step 1: Access SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **+ New query**

### Step 2: Run Migrations in Order

**Run each migration file in order, waiting for success before proceeding:**

#### Migration 1: Create Table
```sql
-- Copy contents of: supabase/migrations/20251104000000_create_incident_witnesses_table.sql
-- Paste into SQL Editor and click "Run"
```

#### Migration 2: Add Address (if needed)
```sql
-- Copy contents of: supabase/migrations/20251104000001_add_witness_2_address.sql
-- Paste into SQL Editor and click "Run"
```

#### Migration 3: Schema Fixes
```sql
-- Copy contents of: supabase/migrations/20251104000002_fix_incident_witnesses_schema.sql
-- Paste into SQL Editor and click "Run"
```

#### Migration 4: Rename Columns
```sql
-- Copy contents of: supabase/migrations/20251104000003_rename_witness_columns_to_match_pdf.sql
-- Paste into SQL Editor and click "Run"
```

### Step 3: Verify Table Exists

Run this verification query in SQL Editor:

```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'incident_witnesses'
);

-- Check column names
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'incident_witnesses'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'incident_witnesses';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'incident_witnesses';
```

**Expected results**:
- Table exists: `true`
- 11 columns visible
- 3 indexes created
- 4 RLS policies active

---

## Testing After Migration

### Test 1: Verify Schema
```bash
node scripts/verify-witness-schema.js
```

**Expected output**:
```
🔍 Verifying incident_witnesses table schema...

📋 incident_witnesses Table Columns:
   id                             (string)
   incident_report_id             (string)
   create_user_id                 (string)
   witness_number                 (number)
   witness_name                   (string)
   witness_mobile_number          (string)
   witness_email_address          (string)
   witness_address                (string)
   witness_statement              (string)
   created_at                     (string)
   updated_at                     (string)

✅ dataFetcher.js is CORRECT - no changes needed
```

### Test 2: Run Page 9 Field Tests
```bash
node scripts/test-page9-witnesses.js
```

**Expected output**:
```
📊 TEST RESULTS SUMMARY
Total Tests: 44
✅ Passed: 44
❌ Failed: 0
📈 Success Rate: 100%

🎉 ALL TESTS PASSED!
```

### Test 3: End-to-End PDF Generation
```bash
node test-form-filling.js [user-uuid]
```

**Check PDF witness sections populate correctly**

---

## Code Alignment Verification

### ✅ dataFetcher.js (lib/dataFetcher.js:77-81)
```javascript
// CORRECT - Uses incident_report_id and witness_number
const { data: witnessesData } = await supabase
  .from('incident_witnesses')
  .select('*')
  .eq('incident_report_id', latestIncidentId)
  .order('witness_number', { ascending: true });
```

### ✅ PDF Generator (lib/pdfGenerator.js:351-383)
```javascript
// CORRECT - Uses witness_name, witness_mobile_number, witness_email_address, witness_statement
setFieldText('witness_name', witness1.witness_name || '');
setFieldText('witness_mobile_number', witness1.witness_phone || ''); // Fixed in PDF updates
setFieldText('witness_email_address', witness1.witness_email || ''); // Fixed in PDF updates
setFieldText('witness_statement', witness1.witness_statement || '');
```

### ✅ Controller (src/controllers/incidentForm.controller.js)
```javascript
// CORRECT - Creates witness objects with proper field names
const witnesses = [{
  incident_report_id: incidentId,
  create_user_id: userId,
  witness_number: 1,
  witness_name: page9.witness_name,
  witness_mobile_number: page9.witness_phone,
  witness_email_address: page9.witness_email,
  witness_statement: page9.witness_statement
}];

await supabase
  .from('incident_witnesses')
  .insert(witnesses);
```

---

## Why Migrations Not Auto-Executed

**Supabase requires manual migration execution** when:
1. Using SQL Editor (no CLI setup)
2. Migrations in non-standard folder structure
3. Custom migration naming (timestamp format)

**Standard Supabase workflow**:
- Migrations in `supabase/migrations/` folder ✅ (we have this)
- Use `supabase db push` to apply migrations ❌ (requires CLI setup)
- OR manually run in SQL Editor ← **This is our path**

---

## Dependencies

**After witness migrations run**:
- Page 9 witness functionality will work
- PDF witness sections will populate
- Test scripts will pass
- End-to-end user journey complete

**Current blockers removed**:
- ❌ Migration 026 (Page 12) - still pending
- ❌ Witness migrations - this document addresses

---

## Estimated Time

- **Migration execution**: 5 minutes
- **Verification**: 5 minutes
- **Testing**: 10 minutes
- **Total**: ~20 minutes

---

## Priority

🔴 **HIGH PRIORITY** - Required for:
- Page 9 functionality
- PDF witness sections
- End-to-end testing
- Production readiness

---

**Created**: 2025-11-07
**Status**: Awaiting manual execution
**Blocked by**: Lack of Supabase CLI access / Manual execution required
