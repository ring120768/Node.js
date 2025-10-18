---
description: Check status of all integrations and services
---

# System Status Check

Run comprehensive checks on all services and integrations.

## Tasks to Complete

1. **Check Git Status**
   - Run `git status` to see uncommitted changes
   - Run `git log --oneline -5` to see recent commits
   - Check current branch

2. **Check Adobe PDF Services**
   - Check if credentials exist: `ls -la credentials/pdfservices-api-credentials.json`
   - Check if template exists: `ls -la pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf`
   - Test if service is ready: `node -e "console.log('Adobe Ready:', require('./src/services/adobePdfFormFillerService').isReady())"`

3. **Check Supabase Connection**
   - Verify `.env` has required variables (don't show the actual values!)
   - If test script exists, run: `node scripts/test-supabase-client.js`
   - Otherwise, check if `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set

4. **Check Node Modules**
   - Verify critical packages are installed:
     - `@adobe/pdfservices-node-sdk`
     - `@supabase/supabase-js`
     - `pdf-lib`
     - `express`
   - Run `npm list --depth=0` (just show main packages, not dependencies)

5. **Check Project Structure**
   - Verify key directories exist:
     - `/src/services/`
     - `/src/controllers/`
     - `/public/`
     - `/pdf-templates/`
     - `/credentials/`

6. **Check for Common Issues**
   - Look for `node_modules/` in Git (shouldn't be there)
   - Check if `.env` is in `.gitignore` (should be)
   - Look for any `.pdf` files that might be committed (shouldn't be)

## Report Format

Present results as a table:

| Service | Status | Notes |
|---------|--------|-------|
| Git | ✅/⚠️/❌ | Current branch, uncommitted files |
| Adobe PDF | ✅/⚠️/❌ | Credentials + template status |
| Supabase | ✅/⚠️/❌ | Environment variables configured |
| Node Modules | ✅/⚠️/❌ | Critical packages installed |
| Project Structure | ✅/⚠️/❌ | Key directories exist |

**Status Legend:**
- ✅ = Working correctly
- ⚠️ = Working but with warnings
- ❌ = Not configured or errors

## Summary

After checks, provide:
1. **Overall Status**: Ready to work / Needs setup / Critical issues
2. **Action Items**: List any issues that need fixing
3. **Recommended Next Steps**: What should be done first
