# CLAUDE.md - Suggested Improvements

**Date:** 2025-12-15
**Reviewer:** Claude Code

## Overview

The current CLAUDE.md (version 2.0.1, last updated 2025-12-15) is comprehensive and well-structured. Below are minor suggested improvements based on codebase analysis.

---

## Suggested Additions

### 1. Add Agent Coordination Section

The AGENTS.md file contains important repository guidelines that aren't referenced in CLAUDE.md. Consider adding:

```markdown
## Repository Guidelines & Agent Coordination

**Reference:** See `AGENTS.md` for detailed repository guidelines when working with multiple agents or contributors.

**Key Points:**
- **Module Organization:** `src/` for app-specific code, `lib/` for shared utilities
- **Conventional Commits:** Use `feat:`, `fix:`, `docs:`, etc. with single-purpose commits
- **PR Requirements:** Include test/lint outputs, screenshots for UI changes, migration notes
- **Schema Changes:** Always run `verify-tables.js` after altering schema
- **Temp Cleanup:** Use `npm run clean` to scrub temp artifacts between sessions
```

### 2. Clarify Test Command Structure

The package.json shows the test commands don't use the `-- path/to/test.test.js` syntax. Update section:

```markdown
# Current (line 56)
npm test -- path/to/test.test.js  # Run single test file

# Suggested replacement
npm test path/to/test.test.js     # Run single test file (Jest native syntax)
npm test -- --testPathPattern=cors  # Run tests matching pattern
```

### 3. Add Cleanup Scripts Reference

Several cleanup scripts exist but aren't documented in quick commands:

```markdown
# Data Cleanup & Verification (add to line 75 area)
node cleanup-all-test-data.js          # Clean test data from development database
node cleanup-all-test-data-v2.js       # V2 cleanup with enhanced logging
node verify-tables.js                  # Verify table existence and schema
node apply-missing-tables.js           # Apply missing table migrations
node extract-pdf-field-names.js        # Extract field names from PDF template
```

### 4. Update Version Discrepancy

- README.md shows: **Version 2.1.0** (line 6)
- package.json shows: **Version 2.0.1** (line 3)
- CLAUDE.md shows: **Version 2.0.1** (line 1056)

**Action:** Sync all three files to use the same version number.

### 5. Add Coverage Report Location

The testing section mentions coverage but doesn't specify where to view the HTML report:

```markdown
# Add to Testing Guidelines section (around line 884)
**Coverage Report:**
- HTML report: `coverage/lcov-report/index.html` (open in browser after `npm test`)
- Terminal summary: Displayed after test completion
- Gate enforcement: Tests fail if any metric drops below 60%
```

### 6. Reference .clinerules File

The `.clinerules` file contains a concise quick reference that's useful but not mentioned:

```markdown
# Add to Quick Reference section or top of file
**Quick Reference:** See `.clinerules` for condensed command reference (148 lines)
```

### 7. Clarify Typeform Webhook Status

Multiple references to Typeform webhooks exist, but the current implementation status is unclear:

**Check needed:**
- Is Typeform still in use, or has it been fully replaced by in-house forms?
- Line 196 says "Typeform webhooks have been removed" (Webhooks section)
- Line 262 mentions "Typeform integration" (Project Overview)
- README still has webhook endpoints

**Suggested action:** Audit all Typeform references and add a clear status note.

---

## Minor Corrections

### Line 6 - Node.js Version

```markdown
# Current
**Required:** Node.js 18.18+ (specified in `.nvmrc`)

# Consider clarifying
**Required:** Node.js 18.20.0 (pinned in `.nvmrc`, minimum 18.18+)
```

### Line 886 - Coverage Reporting Location

Already addressed in suggestion #5 above.

---

## Structure Recommendations

### Consider Adding Section: "Common Workflows"

Many developers benefit from end-to-end workflow examples:

```markdown
## Common Workflows

### Adding a New Form Field

1. **Update Database Schema:**
   ```bash
   # Create migration files
   migrations/NNN_add_field_name.sql
   migrations/NNN_add_field_name_rollback.sql

   # Test migration
   psql -h <host> -U <user> -d <db> -f migrations/NNN_add_field_name.sql

   # Verify
   node verify-tables.js
   ```

2. **Update PDF Mapping:**
   ```javascript
   // Add to relevant PDF service (src/services/pdfService.js)
   fieldMappings.field_name = data.field_name;
   ```

3. **Update Form HTML:**
   ```html
   <!-- Add to relevant incident-form-pageN.html -->
   <input type="text" name="field_name" id="field_name">
   ```

4. **Validate:**
   ```bash
   npm run validate:pdf-mapping
   node test-form-filling.js [test-user-uuid]
   ```

5. **Test:**
   ```bash
   npm test
   npm run lint
   ```

### Debugging a Failed PDF Generation

1. Check logs for specific error
2. Verify user has complete data: `node scripts/test-supabase-client.js`
3. Test with known-good user: `node test-form-filling.js [working-uuid]`
4. Check Adobe PDF credits: https://www.adobe.io/console
5. Verify field mappings: `npm run validate:pdf-mapping`
6. Check storage bucket permissions in Supabase Dashboard
```

---

## Priority Level

- **High Priority:** Version sync (#4), Typeform status clarification (#7)
- **Medium Priority:** Test command syntax (#2), cleanup scripts (#3), coverage report location (#5)
- **Low Priority:** Agent coordination (#1), .clinerules reference (#6), common workflows (structure recommendation)

---

## Implementation

These are suggestions only. The current CLAUDE.md is already excellent and functional. Implement based on team priorities and maintenance schedule.

**Last Review:** 2025-12-15
**Reviewer:** Claude Code (Sonnet 4.5)
