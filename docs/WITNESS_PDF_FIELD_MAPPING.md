# Witness PDF Field Mapping

**Date**: 2025-11-04
**Status**: ✅ Complete

## Overview

Page 9 of the main PDF (`Car-Crash-Lawyer-AI-incident-report-main.pdf`) has built-in fields for **2 witnesses**. These are now properly mapped from the `incident_witnesses` database table.

## Database to PDF Field Mapping

### Witness Present Checkboxes

| Database Source | PDF Field | Type | Logic |
|----------------|-----------|------|-------|
| `data.witnesses.length > 0` | `any_witness` | Checkbox | Checked if witnesses exist |
| `data.witnesses.length === 0` | `any_witness_no` | Checkbox | Checked if no witnesses |

### Witness 1 Fields

| Database Field | PDF Field | Notes |
|---------------|-----------|-------|
| `data.witnesses[0].witness_name` | `witness_name` | Full name |
| `data.witnesses[0].witness_phone` | `witness_mobile_number` | Phone/mobile |
| `data.witnesses[0].witness_email` | `witness_email_address` | Email address |
| `data.witnesses[0].witness_statement` | `witness_statement` | Statement text |
| `data.witnesses[0].witness_address` | ❌ Not in PDF | Collected but not mapped |

### Witness 2 Fields

| Database Field | PDF Field | Notes |
|---------------|-----------|-------|
| `data.witnesses[1].witness_name` | `witness_name_2` | Full name |
| `data.witnesses[1].witness_phone` | `witness_mobile_number_2` | Phone/mobile |
| `data.witnesses[1].witness_email` | `witness_email_address_2` | Email address |
| `data.witnesses[1].witness_statement` | `witness_statement_2` | Statement text |
| `data.witnesses[1].witness_address` | ❌ Not in PDF | Collected but not mapped |

## Important Notes

### ⚠️ witness_address Field

The `witness_address` field is:
- ✅ Collected in the frontend (Page 9 form)
- ✅ Saved to the database (`incident_witnesses.witness_address`)
- ❌ **NOT included in the PDF** (no field available)

**Reason**: The PDF template does not have address fields for witnesses. If addresses are needed on the PDF, the template would need to be updated.

### 📝 Additional Witnesses (3+)

- **Witnesses 1-2**: Mapped to page 9 built-in fields
- **Witnesses 3+**: Appended as separate pages using `Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf`

This is handled automatically by the `appendWitnessPages()` method (lines 491-530 in `adobePdfFormFillerService.js`).

## Code Location

**File**: `src/services/adobePdfFormFillerService.js`
**Lines**: 383-412
**Section**: "PAGE 9: Witnesses"

### Code Snippet

```javascript
// ========================================
// PAGE 9: Witnesses (2 witnesses max on this page)
// ========================================
// Map first 2 witnesses from incident_witnesses table to page 9 fields
const hasWitnesses = data.witnesses && data.witnesses.length > 0;

checkField('any_witness', hasWitnesses);
checkField('any_witness_no', !hasWitnesses);

// Witness 1 (if exists)
if (data.witnesses && data.witnesses[0]) {
  const witness1 = data.witnesses[0];
  setFieldText('witness_name', witness1.witness_name || '');
  setFieldText('witness_mobile_number', witness1.witness_phone || '');
  setFieldText('witness_email_address', witness1.witness_email || '');
  setFieldText('witness_statement', witness1.witness_statement || '');
  // Note: witness_address is NOT in PDF, so it's not mapped
}

// Witness 2 (if exists)
if (data.witnesses && data.witnesses[1]) {
  const witness2 = data.witnesses[1];
  setFieldText('witness_name_2', witness2.witness_name || '');
  setFieldText('witness_mobile_number_2', witness2.witness_phone || '');
  setFieldText('witness_email_address_2', witness2.witness_email || '');
  setFieldText('witness_statement_2', witness2.witness_statement || '');
  // Note: witness_address is NOT in PDF, so it's not mapped
}

// Note: Witnesses 3+ will be added as separate pages via appendWitnessPages()
```

## Data Flow

```
User submits Page 9 form
  ↓
src/controllers/incidentForm.controller.js (lines 266-333)
  → Saves to incident_witnesses table
  → Includes witness_number (1, 2, 3, etc.)
  ↓
lib/dataFetcher.js (lines 72-88)
  → Queries incident_witnesses table
  → Orders by witness_number ASC
  → Returns data.witnesses array
  ↓
src/services/adobePdfFormFillerService.js (lines 383-412)
  → Maps witnesses[0] to witness_name, etc.
  → Maps witnesses[1] to witness_name_2, etc.
  → Appends extra pages for witnesses[2+]
  ↓
Final PDF with witnesses filled
```

## Testing

**Test Script**: `scripts/test-witness-pdf-mapping.js`

```bash
node scripts/test-witness-pdf-mapping.js
```

**Test Results**: 15/15 tests passing (100%)

## Related Documentation

- [WITNESS_SCHEMA_FIX_INSTRUCTIONS.md](./WITNESS_SCHEMA_FIX_INSTRUCTIONS.md) - Database schema migration
- [PAGE_9_WITNESSES_SOLUTION.md](./PAGE_9_WITNESSES_SOLUTION.md) - Page 9 implementation details

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-04 | Initial mapping created | Claude Code |
| 2025-11-04 | Database schema migrated to `incident_report_id` | Claude Code |
| 2025-11-04 | Documentation created | Claude Code |

---

**Last Updated**: 2025-11-04
**Status**: ✅ Implemented and tested
