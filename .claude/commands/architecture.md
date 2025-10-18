---
description: Explain project architecture and file structure
---

# Project Architecture Overview

Explain the Car Crash Lawyer AI project structure and how components interact.

## Project Structure

Show the directory tree focusing on key files and folders:

```
/Node.js/
├── .claude/                    # Claude Code configuration
│   ├── claude.md              # Global rules
│   └── commands/              # Slash commands
├── src/
│   ├── services/              # Business logic services
│   │   ├── adobePdfFormFillerService.js  # PDF form filling (main)
│   │   ├── adobePdfService.js            # Adobe PDF operations
│   │   └── gdprService.js                # GDPR compliance
│   ├── controllers/           # API endpoints
│   │   ├── pdf.controller.js             # PDF generation API
│   │   └── webhook.controller.js         # Typeform webhooks
│   ├── middleware/            # Express middleware
│   ├── utils/                 # Utility functions
│   └── routes/                # API routes
├── lib/
│   ├── dataFetcher.js        # Fetch data from Supabase
│   ├── pdfGenerator.js       # Legacy PDF generation (fallback)
│   └── generators/           # Email and PDF generators
├── public/                    # Frontend files (served statically)
│   ├── index.html            # Landing page
│   ├── transcription-status.html  # Audio recording UI
│   └── payment-success.html  # Post-signup page
├── pdf-templates/            # PDF form templates
│   └── Car-Crash-Lawyer-AI-Incident-Report.pdf
├── credentials/              # Adobe credentials (not in Git)
│   └── pdfservices-api-credentials.json
├── test-output/              # Generated test files (not in Git)
└── Documentation (.md files in root)
```

## Data Flow - PDF Generation

Explain the complete flow from user submission to PDF delivery:

1. **User Submits Form**
   - Via Typeform or web interface
   - Webhook triggers on submission

2. **Data Storage**
   - Webhook handler stores data in Supabase tables:
     - `user_signup` - Personal info, vehicle, insurance
     - `incident_reports` - Accident details
     - `incident_images` - Photo uploads

3. **Audio Transcription** (optional)
   - User records statement in `transcription-status.html`
   - Audio sent to OpenAI Whisper API
   - Transcription stored in `ai_transcription` table

4. **AI Analysis**
   - AI analyzes all collected data
   - Generates summary stored in `ai_summary` table

5. **PDF Generation** (POST /api/pdf/generate)
   ```
   Controller (pdf.controller.js)
       ↓
   Fetch All Data (lib/dataFetcher.js)
       ↓
   Adobe PDF Form Filler (src/services/adobePdfFormFillerService.js)
       ↓ (fills 150+ fields)
   Compress PDF (adobePdfService.js)
       ↓
   Store in Database (completed_incident_forms table)
       ↓
   Store in Supabase Storage
       ↓
   Email to User and Accounts
   ```

6. **Fallback Flow** (if Adobe unavailable)
   ```
   Same flow, but uses:
   lib/pdfGenerator.js (legacy method using pdf-lib)
   ```

## Key Integration Points

### Adobe PDF Services
- **Service**: `src/services/adobePdfFormFillerService.js`
- **Purpose**: Fill the 17-page legal PDF form from Supabase data
- **Replaces**: Zapier + PDFco workflow (saves £480/year)
- **Credentials**: `/credentials/pdfservices-api-credentials.json`
- **Template**: `/pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf`

### Supabase Integration
- **Purpose**: Database, authentication, storage
- **Client**: Initialized in each controller/service
- **Auth**: Uses service role key for server operations
- **Storage**: `incident-images-secure` bucket for uploaded files

### Typeform Integration
- **Webhook Endpoint**: `/api/webhook/typeform`
- **Handler**: `src/controllers/webhook.controller.js`
- **Validates**: HMAC signature for security
- **Stores**: Data in `user_signup` table

## Critical Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_signup` | Personal info, vehicle, insurance | driver_name, email, license_plate, insurance_company |
| `incident_reports` | Accident details | accident_date, accident_location, weather, injuries |
| `incident_images` | Uploaded photos | image_type, file_name, file_url |
| `dvla_vehicle_info_new` | DVLA vehicle checks | registration_number, make, model, mot_status |
| `ai_transcription` | Transcribed statements | transcription, created_at |
| `ai_summary` | AI-generated summaries | summary, created_at |
| `completed_incident_forms` | Final PDF reports | pdf_url, pdf_base64, sent_to_user |

## API Endpoints

| Method | Endpoint | Purpose | Controller |
|--------|----------|---------|------------|
| POST | `/api/pdf/generate` | Generate PDF report | pdf.controller.js |
| GET | `/api/pdf/status/:userId` | Check PDF generation status | pdf.controller.js |
| GET | `/api/pdf/download/:userId` | Download completed PDF | pdf.controller.js |
| POST | `/api/webhook/typeform` | Receive Typeform submissions | webhook.controller.js |

## Security Layers

1. **Environment Variables** - All secrets in `.env` (never committed)
2. **RLS Policies** - Supabase Row Level Security on all tables
3. **Input Validation** - All user inputs validated before processing
4. **CORS** - Configured for specific origins only
5. **Webhook Signatures** - HMAC validation for Typeform webhooks
6. **GDPR Logging** - All user data access logged via `gdprService.js`

## Deployment Flow

```
Development → Feature Branch → PR → Develop Branch → Testing → Main Branch → Production
```

Current branch strategy:
- `main` - Production code
- `develop` - Integration branch
- `feat/*` - Feature branches
- `fix/*` - Bug fix branches

## Next: Understanding the Code

To dive deeper into any component:
- Read global rules: `.claude/claude.md`
- Check recent work: Run `/recent` command
- Test services: Run `/test-all` command
- See implementation details: Read `IMPLEMENTATION_SUMMARY.md`
