---
description: Load full project context for a new session
---

# New Session - Load Project Context

You are working on **Car Crash Lawyer AI** - a Node.js web application that helps UK car accident victims complete legal incident reports.

## Quick Project Overview

**Tech Stack:**
- **Frontend:** HTML, JavaScript (vanilla)
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **PDF Services:** Adobe Acrobat Pro (PDF Services SDK)
- **Version Control:** GitHub
- **Location:** UK (British English, DD/MM/YYYY, £ GBP, +44 codes)

**Main Features:**
1. User signup and incident reporting (multi-step form)
2. Audio recording and AI transcription of personal statements
3. AI-powered accident analysis and summary
4. DVLA vehicle lookups
5. Automatic PDF report generation (17-page legal document)
6. Email delivery of completed reports

## Current Status - Check These

**Adobe PDF Integration:**
- Check if credentials exist: `ls -la credentials/`
- Service file: `src/services/adobePdfFormFillerService.js`
- Template: `pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf`
- Status: Run `node -e "console.log(require('./src/services/adobePdfFormFillerService').isReady())"`

**Supabase Connection:**
- Check .env has `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Critical tables: `user_signup`, `incident_reports`, `incident_images`, `dvla_vehicle_info_new`, `ai_transcription`, `ai_summary`, `completed_incident_forms`
- Test connection: `node scripts/test-supabase-client.js` (if exists)

**Recent Work:**
- Read: `git log --oneline -10` to see recent commits
- Check: `IMPLEMENTATION_SUMMARY.md` for latest major changes
- Review: Any uncommitted changes with `git status`

## Key Files to Be Aware Of

**Services:**
- `/src/services/adobePdfFormFillerService.js` - PDF form filling (replaces Zapier/PDFco)
- `/src/services/adobePdfService.js` - Adobe PDF operations (compress, merge, OCR, etc.)
- `/src/services/gdprService.js` - GDPR compliance tracking

**Controllers:**
- `/src/controllers/pdf.controller.js` - PDF generation endpoint (`/api/pdf/generate`)
- `/src/controllers/webhook.controller.js` - Typeform webhooks

**Frontend:**
- `/public/transcription-status.html` - Audio recording and AI analysis UI
- `/public/payment-success.html` - Post-signup confirmation page
- `/public/index.html` - Landing page

**Data & PDF:**
- `/lib/dataFetcher.js` - Fetches all user data from Supabase
- `/lib/pdfGenerator.js` - Legacy PDF generation (fallback)
- `/pdf-templates/` - PDF templates directory

**Documentation:**
- `QUICK_START_FORM_FILLING.md` - Adobe PDF form filling quick start
- `ADOBE_FORM_FILLING_GUIDE.md` - Complete field mapping guide (150+ fields)
- `IMPLEMENTATION_SUMMARY.md` - Latest implementation details
- `.claude/claude.md` - Global rules and coding standards

## What to Ask Me

Before starting work, you might want to know:

1. **"What are you working on?"** - So I know the current focus
2. **"Any errors or issues?"** - So I can help debug
3. **"What's the priority?"** - Feature work, bug fixes, or optimization
4. **"Do we have a user ID for testing?"** - For running test scripts

## Actions I Can Take

Based on global rules, I can automatically:
- ✅ Read files, check git status, review recent commits
- ✅ Check if Adobe/Supabase are configured
- ✅ Run test scripts to verify integrations
- ✅ Create/modify code files
- ✅ Install packages, update documentation
- ⚠️ Ask before: Production database changes, pushing to main, destructive operations

## Next Steps

Tell me:
1. What you're working on today
2. Any immediate issues or blockers
3. If you want me to run `/status` to check all services

I'm ready to help! What would you like to work on?
