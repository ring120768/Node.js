# Journey Purpose Field Implementation

**Status:** ✅ Implementation Complete (Database migration pending)
**Date:** 2026-01-13
**Migration:** 036

---

## Overview

Added critical insurance field `journey_purpose` to capture the purpose of the journey at the time of the accident. This field is required by all UK insurance companies for liability classification.

**Options:**
- Business (work-related travel)
- Commuting (to/from work)
- Personal (leisure/personal errands)

---

## Implementation Summary

### ✅ 1. Frontend (Page 3)

**File:** `public/incident-form-page3.html`
**Location:** Lines 489-500

Added radio button group in the "Accident Details" section:

```html
<div class="form-group">
  <label class="required">Journey Purpose</label>
  <div class="radio-group">
    <label>
      <input type="radio" name="journey_purpose" value="Business" required>
      <span>Business (work-related)</span>
    </label>
    <label>
      <input type="radio" name="journey_purpose" value="Commuting" required>
      <span>Commuting (to/from work)</span>
    </label>
    <label>
      <input type="radio" name="journey_purpose" value="Personal" required>
      <span>Personal / Pleasure</span>
    </label>
  </div>
</div>
```

**JavaScript:** Field automatically captured by `collectPage3Data()` in page navigation logic.

---

### ✅ 2. Backend Controller

**File:** `src/controllers/incidentForm.controller.js`
**Function:** `buildIncidentData()`
**Location:** Line 549

Added data extraction from Page 3:

```javascript
// Journey purpose (radio button - critical for insurance)
journey_purpose: page3.journey_purpose || null,
```

**Comment update:** Updated Page 3 field count from 41 to 42 fields.

---

### ✅ 3. PDF Service

**File:** `src/services/adobePdfFormFillerService.js`
**Section:** PAGE 3: Accident Date/Time/Location
**Location:** Line 750

Added PDF field mapping:

```javascript
// Journey purpose (radio button - Business/Commuting/Personal)
// Critical for insurance liability classification (Migration 036)
setFieldText('journey_purpose', incident.journey_purpose);
```

**PDF Field Name:** `journey_purpose` (must match template field name)

---

### ✅ 4. Database Migration

**Files Created:**
- `migrations/036_add_journey_purpose_column.sql` (forward)
- `migrations/036_add_journey_purpose_column_rollback.sql` (rollback)

**Migration Details:**

```sql
-- Add column
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS journey_purpose TEXT;

-- Add constraint (enforce valid values)
ALTER TABLE incident_reports
ADD CONSTRAINT check_journey_purpose_values
CHECK (journey_purpose IS NULL OR journey_purpose IN ('Business', 'Commuting', 'Personal'));

-- Add index (for insurance analytics)
CREATE INDEX IF NOT EXISTS idx_incident_reports_journey_purpose
ON incident_reports(journey_purpose)
WHERE journey_purpose IS NOT NULL AND deleted_at IS NULL;
```

**Status:** ⚠️  Migration files created but **NOT yet applied** to database

---

## Database Migration - Next Steps

The migration script encountered an authentication error when attempting to apply automatically. The migration must be applied manually via Supabase Dashboard.

### Manual Migration Steps:

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Navigate to: SQL Editor

2. **Copy Migration SQL:**
   - Open: `migrations/036_add_journey_purpose_column.sql`
   - Copy entire contents

3. **Execute in SQL Editor:**
   - Paste SQL into editor
   - Click "Run" button
   - Verify success message: "✅ Migration 036 successful: journey_purpose column added"

4. **Verify Column Exists:**
   ```bash
   node verify-tables.js
   ```

### Alternative: Command Line Application

If you have the database password, you can apply via CLI:

```bash
# Set database password first
export SUPABASE_DB_PASSWORD=your_password_here

# Run migration script
node scripts/apply-journey-purpose-migration.js
```

**Note:** The Supabase service role key is **not** the database password. You need the actual PostgreSQL password for direct connection.

---

## Testing Checklist

Once migration is applied:

### 1. Form Submission Test

```bash
# Open browser to:
http://localhost:5000/incident-form-page3.html

# Steps:
1. Fill out Page 3 form
2. Select journey_purpose (any option)
3. Submit form
4. Check console logs for data capture
```

### 2. Database Verification

```bash
# Check data was saved
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('journey_purpose, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent journey_purpose values:');
  console.table(data);
})();
"
```

### 3. PDF Generation Test

```bash
# Generate PDF for test user
node test-form-filling.js [user-uuid]

# Check PDF output:
# - Open generated PDF
# - Navigate to Page 3
# - Verify journey_purpose field shows selected value
```

### 4. End-to-End Test

Full user flow:
1. Complete incident form (Pages 1-12)
2. Select journey_purpose on Page 3
3. Submit form
4. Wait for PDF generation (2-3 minutes)
5. Check email for PDF attachment
6. Open PDF and verify journey_purpose appears on Page 3

---

## File Changes Summary

| File | Changes | Lines |
|------|---------|-------|
| `public/incident-form-page3.html` | Added radio button group | 489-500 |
| `src/controllers/incidentForm.controller.js` | Added data extraction | 549 |
| `src/services/adobePdfFormFillerService.js` | Added PDF field mapping | 750 |
| `migrations/036_add_journey_purpose_column.sql` | **NEW** Forward migration | - |
| `migrations/036_add_journey_purpose_column_rollback.sql` | **NEW** Rollback script | - |
| `scripts/apply-journey-purpose-migration.js` | **NEW** Migration script (PostgreSQL) | - |
| `scripts/apply-journey-purpose-migration-supabase.js` | **NEW** Migration script (Supabase) | - |
| `scripts/verify-journey-purpose-implementation.js` | **NEW** Verification script | - |

---

## Rollback Instructions

If you need to revert this change:

### 1. Database Rollback

```bash
# Via Supabase Dashboard:
# - Open SQL Editor
# - Copy contents of: migrations/036_add_journey_purpose_column_rollback.sql
# - Run the SQL
```

### 2. Code Rollback

```bash
git revert <commit-hash>
# Or manually remove:
# - Radio buttons from incident-form-page3.html (lines 489-500)
# - Data extraction from incidentForm.controller.js (line 549)
# - PDF mapping from adobePdfFormFillerService.js (line 750)
```

**⚠️ Warning:** Rollback will **DELETE DATA** in the journey_purpose column. Only rollback in development or after backing up data.

---

## Design Decisions

### Why Radio Buttons (not Dropdown)?

Radio buttons provide:
- Immediate visibility of all options
- Better mobile UX (easier to tap)
- Clear required field indication
- Matches insurance industry standards

### Why These 3 Options?

Based on UK insurance requirements:
- **Business:** Work-related travel (excludes commuting)
- **Commuting:** Specifically to/from work
- **Personal:** All other travel

These align with insurance policy definitions and affect liability/coverage.

### Why Required Field?

Insurance companies **require** this information for all claims. Without it:
- Claim may be rejected
- Processing will be delayed
- Liability determination affected

### Why TEXT Column (not ENUM)?

- PostgreSQL ENUMs are harder to modify
- CHECK constraint provides same validation
- More flexible for future changes
- Follows project pattern (other fields use TEXT + constraint)

---

## Known Limitations

### PDF Template Field

**Assumption:** The PDF template (`pdf-templates/Car-Crash-Lawyer-AI.pdf`) has a form field named `journey_purpose`.

**If field doesn't exist in template:**
- PDF generation will log warning but continue
- journey_purpose value won't appear in PDF
- Need to update PDF template manually in Adobe Acrobat

**To verify PDF field exists:**
```bash
# Open PDF in Adobe Acrobat
# Tools > Prepare Form > Check field names
# Search for: journey_purpose
```

### Mobile App (Capacitor)

Frontend changes automatically sync to mobile app:
```bash
npx cap sync
```

No additional mobile-specific changes needed.

---

## Architecture Notes

### Data Flow

```
User Input (Page 3)
  ↓ (sessionStorage)
incident-form-page3.html
  ↓ (POST /api/incident-form/page3)
incidentForm.controller.js
  ↓ (buildIncidentData)
incident_reports table
  ↓ (PDF generation)
adobePdfFormFillerService.js
  ↓ (setFieldText)
Final 18-page PDF
```

### Migration Pattern

Following project standards:
- Numbered migrations (001-036)
- Forward + rollback scripts
- IF EXISTS checks for idempotency
- Verification logic in migration
- Index for analytics queries

### Field Naming Consistency

- HTML form field: `journey_purpose`
- Database column: `journey_purpose`
- PDF field: `journey_purpose`
- JavaScript variable: `journey_purpose`

No mapping/translation needed (reduces bugs).

---

## Support & Troubleshooting

### Issue: Migration Won't Apply

**Error:** "password authentication failed for user 'postgres'"

**Solution:** Apply manually via Supabase Dashboard (see "Manual Migration Steps" above)

---

### Issue: PDF Field Not Showing

**Check 1:** Verify database has value
```bash
node check-incident-reports.js
```

**Check 2:** Verify PDF service logs
```bash
# In PDF generation logs, look for:
# "Setting journey_purpose: [value]"
```

**Check 3:** Verify PDF template has field
```bash
# Extract PDF form field names:
node scripts/extract-pdf-field-names.js
# Search output for: journey_purpose
```

---

### Issue: Form Validation Failing

**Check:** Browser console for JavaScript errors

**Common cause:** Radio buttons require `name` attribute (not just `value`)

**Fix:** Verify HTML has:
```html
<input type="radio" name="journey_purpose" value="Business" required>
```

---

## Related Documentation

- **Main README:** `README.md`
- **Migration Guide:** `migrations/README.md` (if exists)
- **PDF Service:** `src/services/adobePdfFormFillerService.js` (inline comments)
- **Form Pages:** `public/incident-form-page1-12.html`
- **Database Schema:** Run `node verify-tables.js`

---

## Changelog

### 2026-01-13 - Initial Implementation

- Added journey_purpose field to Page 3 form
- Updated backend controller to extract journey_purpose
- Added PDF field mapping
- Created database migration (forward + rollback)
- Created verification script
- Tested all components (pre-migration)

---

**Implementation Team:** Claude Code
**Review Date:** 2026-01-13
**Next Review:** After migration applied + end-to-end testing

---

## Quick Command Reference

```bash
# Verify implementation
node scripts/verify-journey-purpose-implementation.js

# Apply migration (if password available)
node scripts/apply-journey-purpose-migration.js

# Verify database schema
node verify-tables.js

# Test PDF generation
node test-form-filling.js [user-uuid]

# Check recent incident reports
node scripts/check-incident-reports.js
```

---

**Status:** ✅ Code complete, awaiting database migration
