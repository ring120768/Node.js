# Car Crash Lawyer AI System

## Overview
Car Crash Lawyer AI is a GDPR-compliant legal documentation system for UK traffic accidents. The system collects incident data through Typeform/Zapier webhooks, processes images and audio files using OpenAI, generates comprehensive PDF reports, and emails them to users and legal teams.

## Current State
**Status:** ✅ RUNNING
**Version:** 2.0.1
**Last Updated:** October 14, 2025
**Server URL:** https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev
**Port:** 5000

## Architecture

### Core Technologies
- **Backend:** Node.js + Express.js (v4.21.2)
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage Buckets
- **PDF Generation:** pdf-lib with template.pdf
- **Email Service:** Nodemailer (SMTP)
- **AI Services:** OpenAI Whisper API (transcription)
- **Deployment:** Replit with auto-scaling

### Key Features
1. **User Signup Flow:** Typeform → Zapier Webhook → Image processing → Supabase storage
2. **Incident Reports:** Typeform → Webhook → Process images/audio → Store data
3. **PDF Generation:** Fetch all data → Fill 150+ fields across 17 pages → Email delivery
4. **AI Transcription:** Audio files → OpenAI Whisper API → Store transcriptions
5. **Real-time Updates:** WebSocket for live status updates
6. **GDPR Compliance:** Data privacy, deletion, and export capabilities

### Database Schema (Primary Key: `create_user_id`)
- `user_signup` - Personal details, vehicle info, emergency contacts
- `incident_reports` - 131+ columns of accident data
- `dvla_vehicle_info_new` - DVLA vehicle data
- `incident_images` - All images/files with storage paths
- `completed_incident_forms` - Generated PDFs and email status
- `ai_transcription` - Audio transcriptions
- `ai_summary` - AI-generated summaries

### File Structure
```
src/
├── app.js                 # Main Express application
├── config/                # Configuration files
├── controllers/           # Route handlers
├── middleware/            # Auth, GDPR, rate limiting, security
├── models/                # Data models
├── routes/                # API routes
├── services/              # Business logic (AI, GDPR, agent)
├── utils/                 # Helpers (logger, validators)
└── websocket/             # WebSocket server

lib/
├── data/                  # Data fetching
├── generators/            # PDF & email generation
└── services/              # Audio storage, transcription, auth

public/                    # Static HTML files (dashboard, login, etc.)
```

## Project Configuration

### Required Environment Variables
The following secrets are required for the application to function:

1. **Supabase** (Database & Storage)
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
   - `SUPABASE_ANON_KEY` - Anonymous key for client operations

2. **OpenAI** (AI Transcription)
   - `OPENAI_API_KEY` - OpenAI API key for Whisper transcription

3. **Webhooks** (Typeform/Zapier Integration)
   - `WEBHOOK_API_KEY` - Shared secret for webhook authentication

### Optional Environment Variables
- `TYPEFORM_WEBHOOK_SECRET` - Typeform webhook signature verification
- `GITHUB_WEBHOOK_SECRET` - GitHub webhook signature verification
- `DVLA_API_KEY` - UK DVLA vehicle lookup API
- `WHAT3WORDS_API_KEY` - Location service API
- `EMAIL_USER` - SMTP email username
- `EMAIL_PASS` - SMTP email password
- `PORT` - Server port (defaults to 5000 on Replit)

## Running the Application

### Start Server
```bash
npm start
```

The server will:
1. Check for required environment variables
2. Initialize Supabase connection
3. Set up WebSocket server
4. Start background agent service
5. Listen on port 5000 (or `process.env.PORT`)

### Available Endpoints

#### Health Checks
- `GET /healthz` - Basic health check
- `GET /livez` - Liveness probe
- `GET /readyz` - Readiness check with service status

#### API Routes
- `POST /webhooks/typeform` - Typeform webhook handler
- `POST /webhooks/github` - GitHub webhook handler
- `POST /api/whisper/transcribe` - Audio transcription
- `POST /api/generate-pdf` - PDF generation
- `POST /api/gdpr/*` - GDPR compliance endpoints
- WebSocket: `ws://[host]/` - Real-time updates

### WebSocket Events
- `transcription:update` - Transcription progress updates
- `summary:update` - AI summary updates
- `incident:update` - Incident report updates

## Development

### Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
npm run health     # Run health check script
npm run clean      # Clean temporary files
```

### Security Features
- Helmet.js for HTTP headers
- CORS protection
- Rate limiting (API: 100/15min, Strict: 10/15min)
- Request timeout (30s default)
- HTTPS/WWW redirects
- Cookie parsing with security
- File upload validation (50MB limit)

### GDPR Compliance
- Data export API
- Right to deletion
- Consent management
- Data retention policies
- Audit logging

## User Preferences
None specified yet.

## Recent Changes
- **Oct 14, 2025:** Server successfully configured and running
  - All API keys configured (Supabase, OpenAI, Webhook)
  - Fixed startup script to run index.js directly
  - Added PORT environment variable fallback to 5000
  - Server running on https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev
  - All services initialized: WebSocket, OpenAI, what3words, GDPR ✅
  - Webhook endpoints updated: legacy URLs now redirect to /webhooks/typeform
  - Supabase connection fully operational (both ANON and SERVICE keys verified) ✅
  - Replit PostgreSQL database provisioned (available as fallback option)

## Troubleshooting

### Common Issues
1. **Port already in use:** Stop existing workflow or kill process on port 5000
2. **Missing environment variables:** Check secrets configuration
3. **Supabase connection failed:** Verify credentials and table schemas
4. **Webhook signature verification failed:** Check webhook secret configuration

### Logs
All logs are managed through the custom logger (`src/utils/logger.js`) with levels:
- INFO (blue)
- SUCCESS (green)
- WARN (yellow)
- ERROR (red)

## Next Steps
1. Configure required API keys and secrets
2. Set up Supabase database tables
3. Configure Typeform webhooks
4. Test PDF generation pipeline
5. Deploy to production
