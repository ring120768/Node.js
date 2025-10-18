---
description: Show recent changes and what was worked on last
---

# Recent Work Summary

Show what was worked on recently to provide context for continuing work.

## Tasks to Complete

1. **Check Recent Commits**
   - Run `git log --oneline -10` to see last 10 commits
   - Show commit type (feat/fix/docs/etc) and description

2. **Check Uncommitted Changes**
   - Run `git status` to see what files are modified
   - Run `git diff --stat` to see change summary
   - If there are significant uncommitted changes, note them

3. **Read Latest Implementation Docs**
   - Check if `IMPLEMENTATION_SUMMARY.md` exists and read it
   - Check for any `GUIDE.md` or `SUMMARY.md` files with recent dates
   - Look for any `.md` files modified in last 7 days

4. **Check Recent Test Files**
   - List any `test-*.js` files in root directory
   - Note their creation/modification dates
   - Indicate what they're testing based on filename

5. **Check Current Branch**
   - Show current branch name
   - Check how many commits ahead/behind main
   - Note if there are any unmerged branches

## Report Format

**Last 5 Commits:**
```
feat: Add Adobe PDF form filling service
fix: Resolve CORS issue in webhook handler
docs: Update field mapping guide
refactor: Extract compression logic
test: Add PDF validation script
```

**Uncommitted Changes:**
- Modified: 3 files
- Added: 1 file
- Summary of what changed

**Recent Documentation:**
- `IMPLEMENTATION_SUMMARY.md` - Adobe PDF form filling implementation
- `ADOBE_FORM_FILLING_GUIDE.md` - Complete field mapping reference

**Current Branch:**
- Branch: `feat/audit-prep`
- Status: 2 commits ahead of main
- Clean working directory / Uncommitted changes

## Summary

Provide a brief 2-3 sentence summary of:
1. What was the main feature/fix worked on recently
2. Current state (completed / in progress / needs testing)
3. Suggested next action based on recent work
