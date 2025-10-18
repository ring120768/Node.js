---
description: Quick context refresh (lighter than /start)
---

# Quick Context Refresh

Provide a brief context summary without running extensive checks. Use when you need a quick reminder mid-session.

## Quick Summary

**Project:** Car Crash Lawyer AI
**Tech Stack:** Node.js, Supabase, Adobe PDF Services
**Main Purpose:** Auto-fill 17-page legal incident reports from Supabase data
**Location:** UK (British English, DD/MM/YYYY, £ GBP)

## Current Focus Areas

Based on recent commits and file changes:

1. **Check git log for last commit**
   ```bash
   git log --oneline -1
   ```
   This tells us what was worked on most recently.

2. **Check current branch**
   ```bash
   git branch --show-current
   ```

3. **Check uncommitted changes**
   ```bash
   git status --short
   ```

## Key Files (Quick Reference)

**Services:**
- `src/services/adobePdfFormFillerService.js` - Main PDF form filling
- `src/services/gdprService.js` - GDPR compliance tracking

**Controllers:**
- `src/controllers/pdf.controller.js` - PDF generation API
- `src/controllers/webhook.controller.js` - Typeform webhooks

**Frontend:**
- `public/transcription-status.html` - Audio recording UI

**Data:**
- `lib/dataFetcher.js` - Fetch from Supabase
- `lib/pdfGenerator.js` - Legacy PDF generation (fallback)

## Current Status (Quick Check)

**Adobe PDF:**
```bash
node -e "console.log('Adobe Ready:', require('./src/services/adobePdfFormFillerService').isReady())"
```

**Git:**
- Branch: [show current branch]
- Last commit: [show last commit message]
- Uncommitted: [show number of modified files]

## What to Remember

**PDF Generation Flow:**
User → Supabase → Adobe PDF Form Filler → Compress → Store → Email

**Critical Tables:**
`user_signup`, `incident_reports`, `incident_images`, `dvla_vehicle_info_new`, `ai_transcription`, `ai_summary`, `completed_incident_forms`

**API Endpoint:**
`POST /api/pdf/generate` with `{create_user_id: "uuid"}`

**Legal Requirement:**
PDF must preserve exact 17-page structure (150+ fields)

## Quick Actions

Tell me what you're working on, and I can:
- Read relevant files
- Check specific service status
- Run targeted tests
- Review recent code changes

---

**For full context:** Run `/start`
**For detailed checks:** Run `/status`
**For architecture:** Run `/architecture`
