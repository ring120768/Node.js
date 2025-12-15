# Quarantine Archive

This directory contains legacy files that were removed from the project root during cleanup on 2025-12-14.

## Purpose

These files are **not deleted** - they're archived for historical reference and potential future use. They were removed from the root directory to reduce clutter and improve project maintainability.

## Structure

```
_quarantine/
├── diagnostic-scripts/    # Database and system diagnostic scripts (check-*, diagnose-*, verify-*)
├── migration-scripts/     # One-time migration execution scripts (apply-migration-*, add-*)
├── test-scripts/          # Historical test and audit scripts (test-*, audit-*, analyze-*)
├── fix-scripts/           # One-time bug fix scripts (fix-*, cleanup-*)
├── data-scripts/          # Data generation and population scripts (create-*, generate-*)
├── old-docs/              # Historical documentation (241 MD files)
│   ├── adobe/             # Adobe PDF Services setup guides
│   ├── architecture/      # Architecture evaluation docs
│   ├── bugs/              # Bug reports and resolution docs
│   ├── field-mapping/     # Field mapping analysis docs
│   ├── migrations/        # Migration planning and execution docs
│   ├── pdf/               # PDF implementation documentation
│   └── misc/              # Other historical documentation
├── csv-data/              # CSV field lists and mappings
└── README.md              # This file
```

## What Was Kept in Root

**Core Files:**
- index.js (main entry point)
- package.json, package-lock.json, bun.lock
- .env, .env.example
- Configuration files (.gitignore, .editorconfig, .nvmrc, .prettierrc.js, .eslintrc.js, jest.config.js)

**Active Documentation:**
- CLAUDE.md (primary development guide)
- AGENTS.md (project structure reference)

**Active Integration Tests:**
- test-form-filling.js (PDF generation integration test)
- test-security-wall.js (authentication integration test)

## Recovering Files

If you need a file from quarantine:

```bash
# Find a file
find _quarantine -name "filename.js"

# Copy back to root (if needed)
cp _quarantine/category/filename.js .

# Or run directly from quarantine
node _quarantine/diagnostic-scripts/check-something.js
```

## Why These Were Quarantined

**Diagnostic Scripts** - One-time checks used during development. Useful for reference but not part of daily workflow.

**Migration Scripts** - Executed once during database migrations. The actual migrations are in `/migrations` folder.

**Test Scripts** - Ad-hoc testing scripts that served their purpose. Automated tests are in `src/**/__tests__/`.

**Fix Scripts** - One-time bug fixes that have been incorporated into the codebase.

**Data Scripts** - One-time data population scripts used during development.

**Old Documentation** - Historical context from development phases. Active documentation is in CLAUDE.md.

## Cleanup Date

**Date:** 2025-12-14
**Reason:** Reduce root directory clutter from 500+ files to ~15 essential files
**Performed By:** Claude Code
**Files Quarantined:** ~500 files (268 JS, 241 MD, plus CSV/JSON data)

## Notes

- All quarantined files are intact and functional
- No code was deleted, only reorganized
- Scripts can still be run from their quarantine locations
- This archive can be safely deleted if storage is a concern (but recommended to keep for 6-12 months)
