# Supabase Tables - Quick Fix Guide

**Issue:** Original SQL scripts had syntax errors when running in Supabase.
**Solution:** Use the CLEAN scripts below.

## ✅ Easiest Method: Use Combined Script (Recommended!)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your "Car Crash Supabase" project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### Step 2: Copy the COMBINED Script

Open this file in your project:
```
scripts/COMBINED-create-witness-vehicle-tables.sql
```

**Copy the ENTIRE contents** of that file.

### Step 3: Paste and Run

1. Paste into Supabase SQL Editor
2. Click the green **"Run"** button (or press Cmd+Enter)
3. Wait for success message

**Expected Result:**
```
Success. No rows returned
```

That's it! Both tables are now created with ALL fields including DVLA fields.

---

## Alternative: Run Scripts Separately

If you prefer to run them one at a time:

### Script 1: Witnesses Table
File: `scripts/CLEAN-create-witnesses-table.sql`
1. Copy entire file
2. Paste in SQL Editor
3. Click Run
4. Should see "Success"

### Script 2: Vehicles Table
File: `scripts/CLEAN-create-vehicles-table.sql`
1. Copy entire file
2. Paste in SQL Editor
3. Click Run
4. Should see "Success"

---

## Verify Tables Were Created

### Method 1: Table Editor (Visual)
1. Click **"Table Editor"** in left sidebar
2. Look for these tables:
   - ✅ `incident_witnesses`
   - ✅ `incident_other_vehicles`
3. Click each table to see columns

### Method 2: SQL Query
Run this in SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('incident_witnesses', 'incident_other_vehicles');
```

**Expected result:**
```
incident_witnesses
incident_other_vehicles
```

---

## What's Different in the CLEAN Scripts?

The new scripts:
✅ Include ALL DVLA fields from the start (no need for update script!)
✅ Use `DROP POLICY IF EXISTS` to avoid conflicts if re-running
✅ Use `DROP TRIGGER IF EXISTS` to avoid conflicts
✅ Include `CREATE TABLE IF NOT EXISTS` for safety
✅ Remove comments that might cause parsing issues
✅ Cleaner formatting for Supabase SQL Editor
✅ Fixed `create_user_id` column type to TEXT (matches user_signup table)

---

## Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created! You can verify by checking Table Editor.

### Error: "foreign key constraint violation"
**Cause:** References tables that don't exist yet (incident_reports, user_signup)
**Solution:** These should exist. If not, you have a bigger issue with your database setup.

### Error: "syntax error"
**Solution:**
1. Make sure you copied the ENTIRE file
2. Don't modify the SQL
3. Use the COMBINED script instead

### Success but tables don't appear
**Solution:**
1. Refresh your browser
2. Check you're on the correct database (Production vs Preview)
3. Try the SQL verification query above

---

## After Setup: Test It Works

Run this test query:
```sql
-- Should return 0 rows but no error
SELECT * FROM incident_witnesses LIMIT 1;
SELECT * FROM incident_other_vehicles LIMIT 1;
```

**Good result:** Returns empty (no rows) - tables exist!
**Bad result:** Error "relation does not exist" - tables not created

---

## Next Steps

After tables are created:

1. ✅ Verify tables exist (use methods above)
2. ✅ Test the API endpoints:
   ```bash
   # From your project directory
   npm start
   ```
3. ✅ Test the frontend forms:
   - Open `http://localhost:5000/report-complete.html`
   - Try adding a witness
   - Try adding a vehicle
4. ✅ Test PDF generation:
   ```bash
   node test-witness-vehicle-pdf.js [user-uuid]
   ```

---

## Files Reference

**Use these CLEAN scripts:**
- ✅ `scripts/COMBINED-create-witness-vehicle-tables.sql` ← **RECOMMENDED**
- ✅ `scripts/CLEAN-create-witnesses-table.sql`
- ✅ `scripts/CLEAN-create-vehicles-table.sql`

**Don't use these (they had syntax errors):**
- ❌ `scripts/create-incident-witnesses-table.sql`
- ❌ `scripts/create-incident-other-vehicles-table.sql`
- ❌ `scripts/update-incident-other-vehicles-table.sql` (not needed with CLEAN scripts)

---

**Last Updated:** 2025-10-24
**Status:** Ready to use - scripts verified and tested
