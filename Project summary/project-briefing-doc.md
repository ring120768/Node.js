# Car Crash Lawyer AI - Project Briefing Document
## For: Incoming Software Engineer
## Date: Current
## Project Status: 95% Complete

---

## 🚨 CRITICAL CONTEXT

**Project Overview:** Car Crash Lawyer AI is a GDPR-compliant legal documentation system for UK traffic accidents. The system collects incident data through Typeform/Zapier webhooks, processes images and audio files, generates comprehensive PDF reports, and emails them to users and legal teams.

**Your Primary Identifier:** `create_user_id` (UUID) - This is the master key linking all data across tables. Never use other ID fields for cross-table references.

**Current Deployment:** Replit environment with Node.js/Express backend, Supabase for data storage, and Zapier/Typeform integrations for data collection.

---

## 📊 DATABASE ARCHITECTURE

### Core Tables & Relationships

```
create_user_id (UUID) connects everything:
│
├── user_signup (1:1)
│   └── Personal details, vehicle info, emergency contacts
│
├── incident_reports (1:many) 
│   └── 131+ columns of accident data
│
├── dvla_vehicle_info_new (1:1)
│   └── Both user's and other party's vehicle DVLA data
│
├── incident_images (1:many)
│   └── All images/files with storage paths
│
├── completed_incident_forms (1:many)
│   └── Generated PDFs and email status
│
└── Storage: /incident-images-secure/{create_user_id}/
    └── All uploaded files organized by type
```

### Additional Tables (Need Creation)
- `ai_summary` - For AI-generated summaries (Page 13)
- `ai_transcription` - For audio transcriptions (Page 14)
- `temporary_transcriptions` - Buffer for transcriptions before incident linking

---

## 🔧 TECHNICAL STACK

### Core Technologies
- **Backend:** Node.js + Express.js
- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage Buckets
- **PDF Generation:** pdf-lib with template.pdf
- **Email Service:** Nodemailer (SMTP)
- **AI Services:** OpenAI Whisper API (transcription)
- **Authentication:** Shared API keys for webhooks
- **Deployment:** Replit with auto-scaling

### Key Dependencies
```json
{
  "express": "^4.21.2",
  "@supabase/supabase-js": "^2.49.2",
  "pdf-lib": "^1.17.1",
  "nodemailer": "^6.10.1",
  "axios": "^1.7.9",
  "multer": "^2.0.2",
  "dotenv": "^16.6.1"
}
```

---

## 🔄 DATA FLOW ARCHITECTURE

### 1. User Signup Flow
```
Typeform Submission → Zapier Webhook → /webhook/signup
↓
Process & Download Images from Typeform URLs
↓
Upload to Supabase Storage: /{create_user_id}/
↓
Update user_signup table with storage paths
↓
Create incident_images records
```

### 2. Incident Report Flow
```
Typeform Incident → Zapier Webhook → /webhook/incident-report
↓
Process Images & Audio Files
↓
Store in Supabase: /{create_user_id}/incident_files/
↓
Update incident_reports with file paths
↓
Trigger PDF generation if complete
```

### 3. PDF Generation Flow
```
Zapier Trigger → /generate-pdf or /webhook/generate-pdf
↓
Fetch all data via create_user_id
↓
Fill template.pdf with 150+ fields across 17 pages
↓
Store PDF in completed_incident_forms
↓
Email to user and accounts@
```

---

## 📝 PDF FIELD MAPPING

### Critical Mapping Rules
1. **Always use `create_user_id` as the primary identifier**
2. **True field names come from the master mapping CSV**
3. **PDF pages map to specific data sources:**
   - Pages 1-2: `user_signup` table
   - Pages 3-12: `incident_reports` table + image URLs
   - Pages 13-14: AI summaries (needs implementation)
   - Pages 15-16: `dvla_vehicle_info_new` table
   - Page 17: Declaration with electronic signature

### Field Naming Convention
- Database fields: `snake_case` (e.g., `driver_name`)
- PDF fields: Match exactly as in template.pdf
- Typeform fields: Various formats, mapped in processTypeformData()

---

## 🚧 REMAINING 5% - CRITICAL TASKS

### 1. AI Integration (Highest Priority)
- [ ] Create `ai_summary` table in Supabase
- [ ] Create `ai_transcription` table in Supabase
- [ ] Implement AI summary generation endpoint
- [ ] Connect to OpenAI GPT API for summary generation
- [ ] Update PDF generator to pull from AI tables (pages 13-14)

### 2. Data Validation & Error Handling
- [ ] Add comprehensive validation for all webhook inputs
- [ ] Implement retry logic for failed image downloads
- [ ] Add transaction support for multi-table updates
- [ ] Create rollback mechanisms for partial failures

### 3. Testing & Quality Assurance
- [ ] Create test suite for webhook endpoints
- [ ] Implement end-to-end testing for complete flow
- [ ] Add logging and monitoring for production
- [ ] Create data integrity checks

### 4. Security Enhancements
- [ ] Implement rate limiting on all endpoints
- [ ] Add request signing for Zapier webhooks
- [ ] Enable CORS restrictions
- [ ] Add input sanitization for all user data

### 5. Performance Optimization
- [ ] Implement connection pooling for Supabase
- [ ] Add caching for frequently accessed data
- [ ] Optimize image processing pipeline
- [ ] Implement batch processing for multiple incidents

---

## 🔐 ENVIRONMENT CONFIGURATION

### Required Environment Variables
```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# Authentication
ZAPIER_SHARED_KEY=your_webhook_auth_key

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3000
NODE_ENV=production
```

---

## 🚀 KEY ENDPOINTS

### Webhook Endpoints (Zapier Integration)
- `POST /webhook/signup` - Process user signup with images
- `POST /webhook/incident-report` - Process incident files
- `POST /generate-pdf` - Generate and email PDF report
- `POST /webhook/generate-pdf` - Alternative PDF generation

### API Endpoints
- `GET /api/config` - Frontend Supabase configuration
- `POST /api/save-transcription` - Save audio transcriptions
- `POST /api/whisper/transcribe` - Transcribe audio via Whisper
- `POST /api/upload-what3words-image` - Upload location screenshot

### Utility Endpoints
- `GET /health` - System health check
- `GET /test/image-status/:userId` - Check image processing
- `GET /test/incident-status/:incidentId` - Check incident status
- `GET /pdf-status/:userId` - Check PDF generation status
- `GET /download-pdf/:userId` - Download generated PDF

---

## ⚠️ CRITICAL WARNINGS

### 1. UUID Usage
**NEVER** use incremental IDs or email addresses as primary keys. Always use `create_user_id` for all cross-table references.

### 2. Image Processing
Files from Typeform come as URLs that expire. Always download and store immediately in Supabase storage.

### 3. PDF Template
The `template.pdf` file contains form fields that must match exactly. Do not modify field names without updating the mapping.

### 4. GDPR Compliance
- All data must be deletable on request
- Implement audit trails for all data access
- Ensure consent is tracked for all processing

### 5. Error Recovery
The system is designed to continue even if individual components fail. Never let a single failure stop the entire process.

---

## 🛠️ DEVELOPMENT SETUP

### Local Development
```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Create .env file with all required variables
cp .env.example .env

# Run development server
npm run dev
```

### Replit Deployment
1. Environment variables are set in Replit Secrets
2. Deployment runs on port 3000/5000 with auto-scaling
3. Public URL: `https://[repl-name].[username].repl.co`

### Testing Webhooks Locally
Use ngrok or similar to expose local endpoints:
```bash
ngrok http 3000
# Update Zapier webhooks to use ngrok URL
```

---

## 📚 KEY FILES TO REVIEW

### Core Application Logic
- `index.js` - Main server and all endpoints
- `lib/pdfGenerator.js` - PDF generation with field mapping
- `lib/dataFetcher.js` - Supabase data aggregation
- `lib/emailService.js` - Email delivery system

### Configuration
- `.replit` - Replit deployment configuration
- `package.json` - Dependencies and scripts
- `template.pdf` - PDF template with form fields

### Frontend Pages
- `public/report-complete.html` - Post-incident confirmation
- `public/incident.html` - Incident reporting interface
- `public/demo.html` - Demo environment

---

## 📋 IMMEDIATE ACTION ITEMS

### Day 1-2: Environment Setup
1. Get access to all platforms (Replit, Supabase, Zapier, Typeform)
2. Review environment variables and test connections
3. Run system health check on all endpoints
4. Review recent error logs and failed transactions

### Day 3-4: AI Integration
1. Design and create AI tables in Supabase
2. Implement OpenAI integration for summaries
3. Update PDF generator for AI content
4. Test end-to-end with AI features

### Day 5-7: Testing & Stabilization
1. Create comprehensive test suite
2. Fix any identified bugs
3. Optimize performance bottlenecks
4. Document any changes made

### Week 2: Production Readiness
1. Implement monitoring and alerting
2. Create runbooks for common issues
3. Perform security audit
4. Prepare for production deployment

---

## 🤝 HANDOVER CONTACTS

### Technical Resources
- Supabase Dashboard: [Check project dashboard]
- Zapier Workflows: [Review automation setup]
- Typeform Forms: [Access form configurations]
- Replit Deployment: [Current deployment URL]

### Support Channels
- Error Monitoring: Check Replit logs
- Database Issues: Supabase support
- Integration Issues: Zapier support
- Form Issues: Typeform support

---

## 📈 SUCCESS METRICS

### System Health
- Webhook success rate: Target >99%
- PDF generation time: <30 seconds
- Email delivery rate: >95%
- Image processing success: >98%

### Data Quality
- Field completion rate: >90%
- Transcription accuracy: >95%
- PDF validation: 100% readable

---

## 🔮 FUTURE ENHANCEMENTS

### Phase 2 Considerations
1. Mobile app development (React Native)
2. Real-time crash detection integration
3. Insurance company API connections
4. Multi-language support
5. Advanced analytics dashboard

### Scalability Planning
- Database sharding strategy
- CDN implementation for media
- Queue system for async processing
- Microservices architecture

---

## ✅ HANDOVER CHECKLIST

- [ ] Access to all platforms confirmed
- [ ] Environment variables configured
- [ ] Test webhook received and processed
- [ ] PDF generation tested
- [ ] Email delivery confirmed
- [ ] AI integration planned
- [ ] Error handling reviewed
- [ ] Security audit scheduled
- [ ] Documentation reviewed
- [ ] Questions documented

---

## 📝 NOTES SECTION

*Use this space to document any questions, findings, or changes during your onboarding.*

---

**Document Version:** 1.0
**Last Updated:** Current
**Prepared By:** Project Manager
**For:** New Software Engineer

---

## END OF BRIEFING DOCUMENT

*Good luck! You're taking over a well-architected system that just needs the final polish to reach production readiness. Focus on the AI integration and testing - these are the critical missing pieces.*