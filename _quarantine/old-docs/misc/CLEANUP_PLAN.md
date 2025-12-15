# File Cleanup Plan

**Generated**: 2025-10-28T16:16:13.673Z
**Total files analyzed**: 160

## Recommended Actions

### 1. Delete Redundant Files (4)

- [ ] `index.new.js` (0KB, modified 14/10/2025)
- [ ] `test-emergency-buttons.html` (7KB, modified 28/10/2025)
- [ ] `test-session-browser.html` (1KB, modified 28/10/2025)
- [ ] `test-single-image.html` (1KB, modified 28/10/2025)

### 2. Move to Organized Structure (47)

Create directories:
```bash
mkdir -p tests scripts docs/archive
```

Move files:
- [ ] `mv test-timestamp.js tests/` or `scripts/`
- [ ] `mv test-transcription-debug.js tests/` or `scripts/`
- [ ] `mv test-replit-transcription-endpoint.js tests/` or `scripts/`
- [ ] `mv test-adobe-pdf.js tests/` or `scripts/`
- [ ] `mv test-audio-transcriptions-bucket.js tests/` or `scripts/`
- [ ] `mv test-cors-pattern.js tests/` or `scripts/`
- [ ] `mv test-dashboard-images.js tests/` or `scripts/`
- [ ] `mv test-dashboard-view-button.js tests/` or `scripts/`
- [ ] `mv test-dvla-api.js tests/` or `scripts/`
- [ ] `mv test-dvla-detailed.js tests/` or `scripts/`

... and 37 more

### 3. Consolidate Documentation (29)

Review and consolidate into main docs:
- [ ] `LOGIN_REDIRECT_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `MOBILE_KEYBOARD_FIX_SUMMARY.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `BUTTON_FIX_SUMMARY.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `CORS_TESTS_SUMMARY.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `CSP_BUTTON_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `FIX_DASHBOARD_IMAGES.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `FIX_DATABASE_SCHEMA_NOW.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `LOGIN_REDIRECT_DEBUG.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `MANUAL_TESTING_GUIDE.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `MOBILE_KEYBOARD_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `PAYMENT_SUCCESS_STORAGE_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `QUICK_DASHBOARD_TEST.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `REPLIT-TESTING-GUIDE.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `REPLIT_IMAGE_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `SIGNUP_ERROR_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `SUPABASE_DATA_NOT_SAVING_DEBUG.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `SUPABASE_QUICK_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `TEMP_UPLOAD_TEST_RESULTS.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `TEST-INCIDENT-SCENARIOS.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `TESTING_CHECKLIST.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `TYPEFORM_AUTH_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `WEBHOOK_FIELD_EXTRACTION_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `WITNESS_VEHICLE_TESTING_GUIDE.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `FIELD_MAPPING_FIX_SUMMARY.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `DVLA_AND_GDPR_AUDIT_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `DASHBOARD_EMPTY_CONTENT_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `IMAGE_URL_AND_VEHICLE_CONDITION_FIX.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `SIGNUP_FIX_GUIDE.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md
- [ ] `MOBILE_SIGNUP_ERROR_DEBUG.md` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md

## Detailed Recommendations


### Test Scripts

**Issue**: 40 test files found
**Action**: Consolidate into test/ directory, keep only active tests
**Examples**:
- `test-timestamp.js`
- `test-transcription-debug.js`
- `test-replit-transcription-endpoint.js`
- `test-adobe-pdf.js`
- `test-audio-transcriptions-bucket.js`


### Debug Scripts

**Issue**: 24 debug/diagnostic scripts
**Action**: Delete scripts for resolved issues, move active ones to scripts/ dir
**Examples**:
- `check-recent-signups.js`
- `fix-transcription.js`
- `investigate-empty-fields.js`
- `check-webhook-logs.js`
- `check-form-completion.js`


### Documentation

**Issue**: 21 fix/debug documentation files
**Action**: Consolidate into TROUBLESHOOTING.md or delete if resolved
**Examples**:
- `LOGIN_REDIRECT_FIX.md`
- `MOBILE_KEYBOARD_FIX_SUMMARY.md`
- `BUTTON_FIX_SUMMARY.md`
- `CSP_BUTTON_FIX.md`
- `FIX_DASHBOARD_IMAGES.md`
- `FIX_DATABASE_SCHEMA_NOW.md`
- `LOGIN_REDIRECT_DEBUG.md`
- `MOBILE_KEYBOARD_FIX.md`
- `PAYMENT_SUCCESS_STORAGE_FIX.md`
- `REPLIT_IMAGE_FIX.md`
- `SIGNUP_ERROR_FIX.md`
- `SUPABASE_DATA_NOT_SAVING_DEBUG.md`
- `SUPABASE_QUICK_FIX.md`
- `TYPEFORM_AUTH_FIX.md`
- `WEBHOOK_FIELD_EXTRACTION_FIX.md`
- `FIELD_MAPPING_FIX_SUMMARY.md`
- `DVLA_AND_GDPR_AUDIT_FIX.md`
- `DASHBOARD_EMPTY_CONTENT_FIX.md`
- `IMAGE_URL_AND_VEHICLE_CONDITION_FIX.md`
- `SIGNUP_FIX_GUIDE.md`
- `MOBILE_SIGNUP_ERROR_DEBUG.md`


### Backup Files

**Issue**: 1 backup/old files
**Action**: DELETE - these should be in git history
**Examples**:
- `index.new.js`


## Execution Commands

```bash
# Create directories
mkdir -p tests scripts docs/archive

# Move test files
mv test-timestamp.js tests/
mv test-transcription-debug.js tests/
mv test-replit-transcription-endpoint.js tests/

# Delete redundant files (REVIEW FIRST!)
rm index.new.js
rm test-emergency-buttons.html
rm test-session-browser.html

# Archive old docs
mv LOGIN_REDIRECT_FIX.md docs/archive/
mv MOBILE_KEYBOARD_FIX_SUMMARY.md docs/archive/
mv BUTTON_FIX_SUMMARY.md docs/archive/
```

## Notes

- All deletions should be reviewed before execution
- Files are backed up in git history
- Keep test-security-wall.js (critical for auth testing)
- Keep any recently modified files (< 7 days)
