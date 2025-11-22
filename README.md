# Car Crash Lawyer AI

> GDPR-compliant legal documentation system for UK traffic accidents

**Version:** 2.1.0
**Status:** ✅ Production Ready
**Location:** United Kingdom

---

## 📋 Overview

Car Crash Lawyer AI is a comprehensive Node.js web application that helps UK car accident victims complete legal incident reports. The system collects incident data through Typeform webhooks, processes images and audio files using OpenAI, generates comprehensive 17-page PDF reports using Adobe PDF Services, and emails them to users and legal teams.

### Key Features

- **Server-Side Security** - Page authentication middleware protects sensitive content
- **Automated Data Collection** - Typeform integration with webhook processing
- **Audio Transcription** - OpenAI Whisper API for personal statements
- **AI Analysis** - Automated accident summary generation
- **Legal PDF Reports** - 17-page document with 150+ fields auto-filled from database
- **DVLA Integration** - Automated vehicle information lookups
- **Real-time Updates** - WebSocket for live status updates
- **GDPR Compliant** - Full data privacy, deletion, and export capabilities

---

## 🚀 Quick Start

### Prerequisites

- Node.js v14+ and npm
- Supabase account (database & storage)
- Adobe Acrobat Pro subscription (for PDF Services)
- OpenAI API key (for transcription)

### Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd Node.js

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Configuration

Create `.env` file with required variables:

```bash
# Supabase (REQUIRED)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# OpenAI (REQUIRED)
OPENAI_API_KEY=your-openai-api-key

# Webhooks (REQUIRED)
WEBHOOK_API_KEY=your-webhook-secret

# Adobe PDF Services (OPTIONAL - falls back to pdf-lib)
# Place credentials file at: /credentials/pdfservices-api-credentials.json

# Server
PORT=5000
NODE_ENV=development
```

### Adobe PDF Services Setup (Optional but Recommended)

For high-quality PDF generation:

1. Get credentials from [Adobe Developer Console](https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html)
2. Download `pdfservices-api-credentials.json`
3. Copy to `/credentials/pdfservices-api-credentials.json`
4. Test: `node test-adobe-pdf.js`

**Without Adobe:** The system will fall back to pdf-lib (still works, but Adobe provides better quality).

See [`QUICK_START_FORM_FILLING.md`](QUICK_START_FORM_FILLING.md) for detailed setup.

### Running the Application

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

Server will be available at: `http://localhost:5000`

---

## 🔒 Security Architecture

### Page Authentication (Security Wall)

The application implements server-side authentication for protected pages:

**Protected Pages:**
- `/dashboard.html` - User dashboard with personal data
- `/transcription-status.html` - Audio transcription status
- `/incident.html` - Incident report details

**How it works:**
1. Middleware (`src/middleware/pageAuth.js`) intercepts requests
2. Extracts session token from cookies (sb-access-token)
3. Verifies token with Supabase Auth API
4. Returns 401 if invalid/missing, serves file if valid

**Testing:**
```bash
node test-security-wall.js
```

See [CLAUDE.md](CLAUDE.md#page-protection-pattern) for implementation details.

---

## 📁 Project Structure

```
/Node.js/
├── src/
│   ├── controllers/         # API endpoint handlers
│   │   ├── pdf.controller.js
│   │   └── webhook.controller.js
│   ├── services/            # Business logic
│   │   ├── adobePdfFormFillerService.js
│   │   ├── adobePdfService.js
│   │   └── gdprService.js
│   ├── middleware/          # Auth, GDPR, security
│   ├── routes/              # API routes
│   └── utils/               # Helpers, validators
├── lib/
│   ├── dataFetcher.js       # Fetch data from Supabase
│   ├── pdfGenerator.js      # Legacy PDF generation (fallback)
│   └── generators/          # PDF & email generation
├── public/                  # Frontend HTML files
│   ├── index.html           # Landing page
│   ├── transcription-status.html
│   └── payment-success.html
├── pdf-templates/           # PDF form templates
├── credentials/             # Adobe credentials (not in Git)
├── test-output/             # Generated test files (not in Git)
├── .claude/                 # Claude Code configuration
│   ├── claude.md            # Global coding rules
│   └── commands/            # Slash commands
└── [documentation files]
```

---

## 🗄️ Database

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `user_signup` | Personal info, vehicle details, insurance |
| `incident_reports` | Accident details (131+ columns) |
| `incident_images` | Uploaded photos and documents |
| `dvla_vehicle_info_new` | DVLA vehicle check results |
| `ai_transcription` | Audio transcription results |
| `ai_summary` | AI-generated accident summaries |
| `completed_incident_forms` | Final PDF reports |

**Primary Key:** `create_user_id` (UUID from Typeform)

See [`/db`](.claude/commands/db.md) command for complete schema.

---

## 🔌 API Endpoints

### PDF Generation

```http
POST /api/pdf/generate
Body: {"create_user_id": "uuid"}
```

Generates complete 17-page PDF report from all user data.

### Webhooks

```http
POST /webhooks/typeform
```

Receives Typeform submissions and processes user signup data.

### Audio Transcription

```http
POST /api/whisper/transcribe
```

Transcribes audio recordings to text using OpenAI Whisper API.

### Health Checks

- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check with service status
- `GET /livez` - Liveness probe

---

## 📄 PDF Generation

### How It Works

1. **Data Collection** - Fetches all user data from Supabase
2. **Form Filling** - Adobe PDF Services fills 17-page template (150+ fields)
3. **Compression** - Reduces file size by 40-70%
4. **Storage** - Saves to Supabase Storage
5. **Email** - Sends to user and accounts team

### Field Mapping

All 150+ fields are automatically mapped from database tables to PDF form fields:

- **Pages 1-2:** Personal info, vehicle, insurance
- **Page 3:** Document images (license, vehicle photos)
- **Pages 4-5:** Safety assessment, medical conditions, weather
- **Pages 6-7:** Accident details, vehicle information
- **Pages 8-10:** Other vehicles, police, witnesses
- **Pages 11-12:** Evidence URLs
- **Pages 13-14:** AI summary and transcription
- **Pages 15-16:** DVLA reports
- **Page 17:** Legal declaration

See [`ADOBE_FORM_FILLING_GUIDE.md`](ADOBE_FORM_FILLING_GUIDE.md) for complete field mapping reference.

### Cost Savings

**Before (Zapier + PDFco):** £40/month
**After (Adobe Direct):** £0 (included in Acrobat Pro)
**Annual Savings:** £480

---

## 🧪 Testing

### Test Adobe PDF Services

```bash
node test-adobe-pdf.js
```

Tests Adobe PDF integration (creation, compression).

### Test PDF Form Filling

```bash
node test-form-filling.js [user-uuid]
```

Tests complete PDF generation with real user data.

### Manual Testing

See [`MANUAL_TESTING_GUIDE.md`](MANUAL_TESTING_GUIDE.md) for UI testing procedures.

---

## 📚 Documentation

### Quick Reference

| Document | Purpose |
|----------|---------|
| [`QUICK_START_FORM_FILLING.md`](QUICK_START_FORM_FILLING.md) | Quick start guide for PDF form filling |
| [`ADOBE_FORM_FILLING_GUIDE.md`](ADOBE_FORM_FILLING_GUIDE.md) | Complete guide with all 150+ field mappings |
| [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) | Latest implementation details |
| [`ZAPIER_REPLACEMENT_SUMMARY.md`](ZAPIER_REPLACEMENT_SUMMARY.md) | How Zapier/PDFco was replaced |
| [`replit.md`](replit.md) | Full system documentation |

### Slash Commands (Claude Code)

Use these commands in Claude Code for quick access:

- `/start` - Load full project context (use at start of every session)
- `/status` - Check all services and integrations
- `/architecture` - Explain project structure
- `/docs` - List all documentation
- `/db` - Show database schema
- `/test-all` - Run all test scripts
- `/help` - List all available commands

See [`.claude/COMMANDS_REFERENCE.md`](.claude/COMMANDS_REFERENCE.md) for details.

---

## 🔒 Security

- **HTTPS** - All connections encrypted
- **CORS** - Restricted to specific origins
- **Rate Limiting** - API: 100 req/15min, Strict: 10 req/15min
- **Webhook Signatures** - HMAC validation for Typeform
- **RLS Policies** - Supabase Row Level Security on all tables
- **Input Validation** - All user inputs validated
- **GDPR Compliance** - Data privacy, deletion, export capabilities

### Security Checklist

- [ ] All secrets in `.env` (never committed)
- [ ] Adobe credentials in `/credentials/` (in `.gitignore`)
- [ ] Supabase RLS policies enabled
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info

---

## 📊 Monitoring

### Logs

All logs managed through custom logger (`src/utils/logger.js`):

- **INFO** (blue) - General information
- **SUCCESS** (green) - Successful operations
- **WARN** (yellow) - Warnings
- **ERROR** (red) - Errors

### Adobe PDF Services

**Free Tier:** 500 document transactions/month
**Monitor at:** https://www.adobe.io/console

### Service Status Checks

```bash
# Check Adobe PDF Services status
node -e "console.log('Adobe Ready:', require('./src/services/adobePdfFormFillerService').isReady())"

# Check Supabase connection
node scripts/test-supabase-client.js
```

---

## 🤝 Contributing

### Code Style

- **Indentation:** 2 spaces (no tabs)
- **Quotes:** Single quotes
- **Semicolons:** Always use
- **Line length:** <100 characters
- **Naming:** camelCase for files and variables

### Git Workflow

```bash
# Create feature branch
git checkout -b feat/your-feature

# Commit with conventional format
git commit -m "feat: Add your feature description"

# Types: feat, fix, docs, refactor, test, chore
```

### Global Rules

All coding standards, security requirements, and workflows are documented in [`.claude/claude.md`](.claude/claude.md).

**Key principles:**
- Clarity > Cleverness
- Working > "Perfect"
- Security first
- Complete code (no placeholders)
- Documentation updates mandatory

---

## 🐛 Troubleshooting

### Common Issues

#### Adobe PDF Not Working

```bash
# Check credentials exist
ls -la credentials/pdfservices-api-credentials.json

# Check template exists
ls -la pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf

# Test service
node test-adobe-pdf.js
```

**Solution:** System falls back to pdf-lib if Adobe not configured.

#### Supabase Connection Failed

```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
node scripts/test-supabase-client.js
```

**Solution:** Check `.env` file has correct credentials.

#### Webhook Signature Verification Failed

**Cause:** Webhook secret mismatch
**Solution:** Verify `TYPEFORM_WEBHOOK_SECRET` matches Typeform settings.

### Get Help

1. Check server logs for detailed error messages
2. Run `/status` command (Claude Code) to check all services
3. Review relevant documentation in `/docs` folder
4. Check [troubleshooting section](replit.md#troubleshooting) in `replit.md`

---

## 📜 License

[Your License Here]

---

## 👥 Authors

[Your Team Information Here]

---

## 🎯 Project Status

**Current Version:** 2.1.0
**Latest Update:** October 18, 2025
**Status:** ✅ Production Ready

### Recent Changes (v2.1.0)

- ✅ Adobe PDF Services integration
- ✅ Replaced Zapier + PDFco workflow
- ✅ Automatic PDF form filling (150+ fields)
- ✅ PDF compression (40-70% size reduction)
- ✅ Complete documentation suite
- ✅ Claude Code slash commands
- ✅ Test scripts for verification

### Upcoming

- [ ] Enhanced error reporting dashboard
- [ ] Automated backup system
- [ ] Performance optimization
- [ ] Additional AI analysis features

---

## 📞 Support

For technical support or questions:

- **Documentation:** Check `/docs` folder or use `/docs` command
- **Issues:** [GitHub Issues](your-repo-url/issues)
- **Testing:** Run `node test-form-filling.js [uuid]` for diagnostics

---

**Last Updated:** 2025-10-28
**Version:** 2.1.0

Made with ❤️ for UK accident victims
