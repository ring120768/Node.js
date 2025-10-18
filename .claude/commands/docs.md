---
description: List all documentation files and their purposes
---

# Documentation Index

List all `.md` documentation files in the project and explain their purposes.

## Tasks to Complete

1. **Find all .md files in root directory**
   - Run `find . -maxdepth 1 -name "*.md" -type f | sort`
   - Don't include `node_modules/` or `.git/`

2. **Categorize documentation**
   - Group by topic: Setup, Guides, Reference, Implementation
   - Note file size and last modified date

3. **Read key documentation summaries**
   - For each major guide, read the first 20 lines
   - Extract the main purpose and what it covers

## Report Format

### Adobe PDF Services Documentation

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| `ADOBE_SETUP_COMPLETE.md` | Adobe credentials setup guide | XXkB | YYYY-MM-DD |
| `ADOBE_QUICK_REFERENCE.md` | Quick reference for Adobe operations | XXkB | YYYY-MM-DD |
| `ADOBE_PDF_USAGE.md` | Detailed usage examples | XXkB | YYYY-MM-DD |
| `ADOBE_FORM_FILLING_GUIDE.md` | Complete field mapping (150+ fields) | XXkB | YYYY-MM-DD |

### Implementation Documentation

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| `IMPLEMENTATION_SUMMARY.md` | Latest features implemented | XXkB | YYYY-MM-DD |
| `ZAPIER_REPLACEMENT_SUMMARY.md` | How Zapier/PDFco was replaced | XXkB | YYYY-MM-DD |

### Quick Reference

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| `QUICK_START_FORM_FILLING.md` | Quick start for PDF form filling | XXkB | YYYY-MM-DD |

### Project Documentation

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| `README.md` | Project overview and setup | XXkB | YYYY-MM-DD |
| `MANUAL_TESTING_GUIDE.md` | Manual testing procedures | XXkB | YYYY-MM-DD |
| `CORS_SOLUTION_2_GUIDE.md` | CORS configuration guide | XXkB | YYYY-MM-DD |

### Claude Code Configuration

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| `.claude/claude.md` | Global coding rules and standards | XXkB | YYYY-MM-DD |

## Quick Access Guide

**New to the project?**
1. Start with `README.md`
2. Read `QUICK_START_FORM_FILLING.md`
3. Review `.claude/claude.md` for coding standards

**Setting up Adobe PDF Services?**
1. `ADOBE_SETUP_COMPLETE.md` - Step-by-step setup
2. `QUICK_START_FORM_FILLING.md` - Quick start guide
3. `ADOBE_QUICK_REFERENCE.md` - Command reference

**Need to understand PDF form filling?**
1. `IMPLEMENTATION_SUMMARY.md` - What was built
2. `ADOBE_FORM_FILLING_GUIDE.md` - All 150+ field mappings
3. `ZAPIER_REPLACEMENT_SUMMARY.md` - Why it was built

**Testing?**
1. `MANUAL_TESTING_GUIDE.md` - Manual test procedures
2. Run `test-adobe-pdf.js` for automated tests
3. Run `test-form-filling.js [uuid]` for full integration test

**Troubleshooting CORS?**
1. `CORS_SOLUTION_2_GUIDE.md` - CORS configuration
2. `CORS_TESTS_SUMMARY.md` - Test results

## Most Important Documents

Based on the project, these are the **must-read** documents:

1. **`.claude/claude.md`** - Coding standards, security, workflow
2. **`QUICK_START_FORM_FILLING.md`** - How PDF form filling works
3. **`ADOBE_FORM_FILLING_GUIDE.md`** - Complete field mapping reference
4. **`IMPLEMENTATION_SUMMARY.md`** - Latest implementation details

## Summary

Total documentation files: [count]
Total size: [size in MB]
Last updated: [most recent modification date]

**Recommendation:** Keep documentation up to date after major changes. Consider consolidating if there are duplicate guides.
