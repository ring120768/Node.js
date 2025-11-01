# PDF Field Mapping Guide

**Automated workflow for mapping PDF form fields to Supabase database**

**Date**: 2025-11-01
**Version**: 1.0

---

## Overview

This guide explains how to use the automated field extraction and mapping system to:

1. **Extract** all field names from your completed fillable PDF
2. **Generate** database schema (SQL) matching PDF structure
3. **Generate** mapping code (JavaScript) for form filling
4. **Generate** type definitions (TypeScript) for type safety

**Why this workflow?**
- ✅ Saves hours of manual work (no typing 104+ field names)
- ✅ Eliminates typos and mapping errors
- ✅ Auto-detects field types (text, checkbox, multiline, etc.)
- ✅ Generates production-ready code instantly
- ✅ Updates easily when PDF changes

---

## Prerequisites

**Required:**
- Completed fillable PDF with all fields defined in Adobe Acrobat Pro
- Node.js installed (already have this)
- `pdf-lib` package installed (check package.json)

**Your PDF Location:**
```
/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report.pdf
```

---

## Workflow Steps

### Step 1: Extract Fields from PDF

**Command:**
```bash
node scripts/extract-pdf-fields.js
```

**What it does:**
- Reads your completed fillable PDF using `pdf-lib`
- Extracts ALL form field names automatically
- Detects field types: text, checkbox, multiline, dropdown, radio
- Detects properties: maxLength, alignment, options
- Saves complete inventory to `field-list.json`

**Output:**
```
✓ Found 104 total form fields

📊 Field Statistics:

Total Fields: 104
Text Fields: 85
  - Multiline: 12
  - Single line: 73
Checkboxes: 15
Dropdowns: 3
Radio Groups: 1

💾 Saved field list to: /Users/ianring/Node.js/field-list.json
```

**Custom PDF Path (optional):**
```bash
node scripts/extract-pdf-fields.js "/path/to/custom.pdf"
```

---

### Step 2: Generate Mapping Code

**Command:**
```bash
node scripts/generate-mapping-code.js
```

**What it does:**
- Reads `field-list.json` from Step 1
- Analyzes field names and types
- Generates 3 files automatically:

**Output Files:**

**1. `output/database-schema.sql`** (Supabase table schema)
```sql
CREATE TABLE IF NOT EXISTS incident_report_pdf (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  create_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 104 auto-generated columns
  accident_date DATE,
  accident_time TIME,
  driver_name VARCHAR(255),
  vehicle_registration VARCHAR(50),
  ai_narrative_text TEXT,
  ai_model_used VARCHAR(100),
  ... (98 more fields)
);
```

**2. `output/field-mapping.js`** (JavaScript mapping code)
```javascript
async function fillPdfForm(pdfDoc, data) {
  const form = pdfDoc.getForm();

  // Helper functions
  const setFieldText = (fieldName, value) => { ... };
  const setFieldCheckbox = (fieldName, value) => { ... };

  // 104 auto-generated mappings
  setFieldText('accident_date', data.accident_date);
  setFieldText('accident_time', data.accident_time);
  setFieldText('driver_name', data.driver_name);
  setFieldText('ai_narrative_text', data.ai_narrative_text);
  setFieldText('ai_model_used', data.ai_model_used);
  ... (98 more)
}
```

**3. `output/type-definitions.ts`** (TypeScript types)
```typescript
export interface IncidentReportPdfData {
  id?: string;
  create_user_id?: string;

  // 104 auto-generated properties
  accident_date?: string;
  accident_time?: string;
  driver_name?: string;
  ai_narrative_text?: string;
  ai_model_used?: string;
  ... (98 more)
}
```

**Console Output:**
```
✅ Code generation complete!

Generated files:
  📄 /Users/ianring/Node.js/output/database-schema.sql
  📄 /Users/ianring/Node.js/output/field-mapping.js
  📄 /Users/ianring/Node.js/output/type-definitions.ts
```

---

### Step 3: Review Generated Files

**Important:** Always review before using in production!

**Check database-schema.sql:**
- ✅ Column types correct (TEXT vs VARCHAR vs DATE)
- ✅ Field names match your expectations
- ✅ RLS policies appropriate for your app

**Check field-mapping.js:**
- ✅ All 104 fields mapped correctly
- ✅ No duplicate mappings
- ✅ Helper functions work for your use case

**Check type-definitions.ts:**
- ✅ Types match your data model
- ✅ Optional fields marked correctly

---

### Step 4: Apply Database Schema

**⚠️ WARNING:** This creates a new table. Review carefully before running on production!

**Development (Recommended First):**
```bash
# Using Supabase CLI
supabase db reset
psql -h localhost -U postgres -d postgres < output/database-schema.sql

# OR via Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy/paste output/database-schema.sql
# 3. Run query
```

**Production:**
```bash
# Only after testing in development!
psql -h [your-supabase-host] -U postgres -d postgres < output/database-schema.sql
```

---

### Step 5: Integrate Mapping Code

**Option A: Replace existing adobePdfFormFillerService.js**

1. Backup current file:
```bash
cp src/services/adobePdfFormFillerService.js src/services/adobePdfFormFillerService.js.backup
```

2. Copy generated mappings from `output/field-mapping.js`

3. Integrate into your existing service:
```javascript
// src/services/adobePdfFormFillerService.js

async fillFormFields(form, data) {
  // Copy helper functions from generated file
  const setFieldText = (fieldName, value) => { ... };
  const setFieldCheckbox = (fieldName, value) => { ... };

  // Paste all 104 auto-generated mappings here
  setFieldText('accident_date', data.accident_date);
  setFieldText('accident_time', data.accident_time);
  // ... (102 more)
}
```

**Option B: Use as separate module**

```javascript
// In your PDF service
const { fillPdfForm } = require('../output/field-mapping.js');

async generatePdf(userId) {
  const data = await fetchUserData(userId);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Use generated mapping function
  await fillPdfForm(pdfDoc, data);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
```

---

### Step 6: Test with Real Data

```bash
node test-form-filling.js [user-uuid]
```

**What to verify:**
- ✅ All 104 fields populated correctly
- ✅ No "field not found" errors
- ✅ Checkbox states correct (checked/unchecked)
- ✅ Multiline text renders properly
- ✅ Special characters handled correctly (£, ", ', etc.)

---

## Field Naming Conventions

The scripts automatically use the exact field names from your PDF. No conversion or transformation.

**Example:**
```
PDF Field Name        →  Database Column  →  TypeScript Property
──────────────────────────────────────────────────────────────────
accident_date         →  accident_date    →  accident_date?: string
driver_name           →  driver_name      →  driver_name?: string
ai_narrative_text     →  ai_narrative_text→  ai_narrative_text?: string
```

**Best Practices:**
- Use snake_case in PDF field names (accident_date, not accidentDate)
- Avoid special characters except underscores
- Keep field names under 63 characters (PostgreSQL limit)
- Be consistent (use date/time suffixes consistently)

---

## Smart Type Detection

The generator intelligently detects column types based on field properties:

| PDF Field Type | Field Name Pattern | Database Type | TypeScript Type |
|----------------|-------------------|---------------|-----------------|
| PDFCheckBox    | any               | BOOLEAN       | boolean         |
| PDFTextField (multiline) | any     | TEXT          | string          |
| PDFTextField   | *_date            | DATE          | string          |
| PDFTextField   | *_time            | TIME          | string          |
| PDFTextField   | *_email           | VARCHAR(255)  | string          |
| PDFTextField   | *_phone, *_tel    | VARCHAR(50)   | string          |
| PDFTextField   | other             | VARCHAR(255)  | string          |
| PDFDropdown    | any               | VARCHAR(100)  | string          |
| PDFRadioGroup  | any               | VARCHAR(100)  | string          |

**Override if needed:** Manually edit `database-schema.sql` before running.

---

## Handling PDF Updates

**When you add/remove fields in Adobe Acrobat:**

1. Re-run extraction:
```bash
node scripts/extract-pdf-fields.js
```

2. Check differences:
```bash
diff field-list.json field-list.json.backup
```

3. Re-generate mapping code:
```bash
node scripts/generate-mapping-code.js
```

4. Apply database migrations:
```sql
-- Add new columns
ALTER TABLE incident_report_pdf
  ADD COLUMN new_field VARCHAR(255);

-- Remove old columns (careful!)
ALTER TABLE incident_report_pdf
  DROP COLUMN old_field;
```

5. Update your service code with new mappings

---

## Troubleshooting

### "PDF file not found"
**Problem:** Extract script can't find your PDF
**Solution:**
```bash
# Check file exists
ls -la "/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report.pdf"

# OR provide custom path
node scripts/extract-pdf-fields.js "/full/path/to/your.pdf"
```

### "Found 0 fields"
**Problem:** PDF has no form fields
**Solution:** Open PDF in Adobe Acrobat Pro and verify fields exist (View → Tools → Prepare Form)

### "Field not found" errors during testing
**Problem:** Database column names don't match PDF field names
**Solution:**
1. Check `field-list.json` for exact field names
2. Verify database schema matches
3. Re-run generator if field names changed

### "Type mismatch" errors
**Problem:** Database column type wrong for data
**Solution:**
1. Edit `output/database-schema.sql` before applying
2. Change column types manually:
```sql
-- Change from VARCHAR to TEXT
ALTER TABLE incident_report_pdf
  ALTER COLUMN ai_narrative_text TYPE TEXT;
```

---

## Advanced Usage

### Generate for Multiple PDFs

```bash
# Extract from different PDFs
node scripts/extract-pdf-fields.js "/path/to/pdf1.pdf"
mv field-list.json field-list-pdf1.json

node scripts/extract-pdf-fields.js "/path/to/pdf2.pdf"
mv field-list.json field-list-pdf2.json

# Generate separate schemas
node scripts/generate-mapping-code.js
```

### Custom Database Table Name

Edit `scripts/generate-mapping-code.js` line 95:
```javascript
CREATE TABLE IF NOT EXISTS your_custom_table_name (
```

### Add Custom Columns

Edit generated `output/database-schema.sql`:
```sql
-- Add after auto-generated fields
pdf_generated_at TIMESTAMPTZ,
pdf_file_path TEXT,
status VARCHAR(50) DEFAULT 'draft'
```

---

## Files Created by This System

```
Node.js/
├── scripts/
│   ├── extract-pdf-fields.js       ← Script 1: PDF → JSON
│   └── generate-mapping-code.js    ← Script 2: JSON → SQL/JS/TS
├── field-list.json                 ← Intermediate: field inventory
├── output/
│   ├── database-schema.sql         ← Output 1: Supabase schema
│   ├── field-mapping.js            ← Output 2: JS mapping code
│   └── type-definitions.ts         ← Output 3: TS types
└── FIELD_MAPPING_GUIDE.md          ← This guide
```

---

## Summary Workflow

**Complete workflow in 2 commands:**

```bash
# 1. Extract fields from PDF → field-list.json
node scripts/extract-pdf-fields.js

# 2. Generate code from field-list.json → output/*
node scripts/generate-mapping-code.js

# 3. Review output/ files
cat output/database-schema.sql
cat output/field-mapping.js

# 4. Apply to database
psql < output/database-schema.sql

# 5. Test
node test-form-filling.js [user-uuid]
```

**Time saved:**
- Manual: 4-6 hours (typing 104 field names, creating SQL, writing mappings)
- Automated: 2 minutes ✨

---

## Next Steps

After completing this workflow:

1. ✅ Review all generated files
2. ✅ Apply database schema to development environment
3. ✅ Test with real user data
4. ✅ Update `adobePdfFormFillerService.js` with new mappings
5. ✅ Run full integration test: `node test-form-filling.js`
6. ✅ Deploy to production (after testing!)

---

**Last Updated**: 2025-11-01
**Maintained By**: Claude Code
**Questions?** Check CLAUDE.md or README.md
