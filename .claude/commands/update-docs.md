---
description: Check and update all documentation after making changes
---

# Update Documentation

Systematically check all .md files and ensure they're up to date with recent changes.

## Tasks to Complete

### 1. Find All Documentation Files

**Find .md files in root:**
```bash
find . -maxdepth 1 -name "*.md" -type f | sort
```

**Find .md files in .claude/:**
```bash
find .claude -name "*.md" -type f | sort
```

**Find README files in subdirectories:**
```bash
find . -name "README.md" -type f | sort
```

### 2. Identify Recent Changes

**Check recent commits for clues:**
```bash
git log --oneline -5
```

**Check recently modified files:**
```bash
find . -name "*.md" -type f -mtime -7 | sort
```
(Files modified in last 7 days)

### 3. Search for Outdated References

Check all .md files for common outdated terms and suggest updates:

**Search for "Zapier" or "PDFco"** (replaced by Adobe):
```bash
grep -l "Zapier\|PDFco" *.md 2>/dev/null
```

**Search for "template.pdf"** (should reference new template):
```bash
grep -l "template\.pdf" *.md 2>/dev/null
```

**Search for old workflow descriptions:**
```bash
grep -l "webhook.*PDF\|Typeform.*Zapier" *.md 2>/dev/null
```

**Check for missing "Last Updated" dates:**
```bash
grep -L "Last Updated\|last updated" *.md 2>/dev/null
```

### 4. Documentation Audit Report

Present findings in this format:

#### Files Needing Updates

| File | Issue | Priority | Suggested Fix |
|------|-------|----------|---------------|
| README.md | Mentions Zapier workflow | HIGH | Update to Adobe PDF workflow |
| SETUP.md | Missing Adobe credentials setup | MEDIUM | Add Adobe setup section |
| GUIDE.md | No "Last Updated" date | LOW | Add date to footer |

#### Files Recently Updated (Last 7 Days)

| File | Last Modified | Contains |
|------|---------------|----------|
| IMPLEMENTATION_SUMMARY.md | 2025-10-18 | Adobe PDF implementation |
| ADOBE_FORM_FILLING_GUIDE.md | 2025-10-18 | Field mappings |

#### Files That Are Current

- .claude/claude.md ✅
- QUICK_START_FORM_FILLING.md ✅

### 5. Check for Missing Documentation

Based on recent code changes, identify if documentation is missing:

**Check for new services without docs:**
```bash
# List all services
ls -1 src/services/*.js

# Check if each has corresponding documentation
```

**Check for new API endpoints without docs:**
```bash
# Look for route definitions
grep -r "router\.\(get\|post\|put\|delete\)" src/routes/ src/controllers/
```

### 6. Provide Update Recommendations

For each file needing updates, provide:

1. **What's outdated** - Specific sections or references
2. **Why it needs updating** - What changed in the code
3. **Suggested update** - Exact text to add/remove/change
4. **Priority** - HIGH/MEDIUM/LOW based on impact

## Example Output Format

```markdown
# Documentation Audit Results

## Summary
- Total .md files: 15
- Files needing updates: 3 (HIGH priority)
- Files recently updated: 5
- Missing documentation: 1 new service

## HIGH Priority Updates

### 1. README.md
**Issue:** References old Zapier/PDFco workflow
**Line 45:** "PDF generation is handled by Zapier and PDFco"
**Suggested fix:**
Replace with: "PDF generation is handled by Adobe PDF Services directly from Supabase"

**Line 78:** Workflow diagram shows Zapier
**Suggested fix:**
Update diagram to show: User → Supabase → Adobe PDF → Email

### 2. CONTRIBUTING.md
**Issue:** Missing Adobe credentials setup in development environment section
**Suggested fix:**
Add section: "Adobe PDF Services Setup" with link to ADOBE_SETUP_COMPLETE.md

## MEDIUM Priority Updates

### 3. docs/API.md
**Issue:** Missing new /api/pdf/generate endpoint documentation
**Suggested fix:**
Add endpoint documentation with example request/response

## LOW Priority Updates

### 4. Multiple files missing "Last Updated" dates
Files: GUIDE.md, SETUP.md, TROUBLESHOOTING.md
**Suggested fix:** Add to footer: `---\n**Last Updated**: YYYY-MM-DD`

## Recommended Actions

1. Update README.md with new PDF workflow (5 min)
2. Add Adobe setup to CONTRIBUTING.md (3 min)
3. Document /api/pdf/generate endpoint (10 min)
4. Add "Last Updated" dates to all guides (2 min)

Total estimated time: 20 minutes
```

## Auto-Update Mode (Optional)

If user confirms, automatically update simple fixes like:
- Adding "Last Updated" dates
- Replacing exact phrases (e.g., "Zapier + PDFco" → "Adobe PDF Services")
- Updating version numbers

**Ask before:**
- Changing workflow diagrams
- Rewriting large sections
- Removing significant content

## Post-Update Verification

After updates:
1. List all modified .md files
2. Show git diff summary
3. Recommend reviewing changes before committing
4. Suggest commit message: `docs: Update documentation for [feature]`

---

**Usage Notes:**
- Run this after completing any major feature
- Run this before creating pull requests
- Run this monthly as maintenance
- Add to CI/CD pipeline for automated checks
