---
description: Run all test scripts to verify everything works
---

# Run All Tests

Execute all available test scripts to verify integrations are working correctly.

## Tests to Run

1. **Check which test files exist**
   - List all `test-*.js` files in root directory
   - List all `*.test.js` files in src/

2. **Adobe PDF Services Test**
   - If exists: Run `node test-adobe-pdf.js`
   - Expected: ✅ PDF created and compressed successfully
   - Check for errors or warnings

3. **PDF Form Filling Test** (needs user ID)
   - File: `test-form-filling.js`
   - Note: Requires a user UUID from database
   - Don't run automatically (needs parameter)
   - Show usage: `node test-form-filling.js [user-uuid]`

4. **Supabase Connection Test**
   - If exists: Run `node scripts/test-supabase-client.js`
   - Expected: Successful connection to database
   - Check for authentication errors

5. **NPM Tests** (if configured)
   - Check `package.json` for test scripts
   - If exists: Run `npm test`
   - Show results

## Report Format

For each test, show:

```
Test: Adobe PDF Services
File: test-adobe-pdf.js
Status: ✅ PASSED / ⚠️ WARNINGS / ❌ FAILED
Output: [key output messages]
Time: X seconds
```

## Summary

After all tests:

**Test Results:**
- ✅ Passed: 3/4
- ⚠️ Warnings: 1/4
- ❌ Failed: 0/4

**Issues Found:**
- List any errors or warnings
- Provide solutions or next steps

**Services Status:**
- Adobe PDF Services: ✅ Ready
- Supabase Connection: ✅ Ready
- PDF Form Filling: ⚠️ Needs user ID for testing
- Overall: ✅ All critical systems operational

## Recommendations

Based on test results, recommend:
1. Any services that need configuration
2. Tests that should be run manually (with parameters)
3. Any failing tests that need attention
4. Next steps for verification
