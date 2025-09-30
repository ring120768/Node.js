
# Car Crash Lawyer AI - File Structure Documentation

## 📁 Project Overview
A comprehensive AI-powered legal assistance platform for car crash incident reporting, transcription, and GDPR-compliant data management.

## 🗂️ Root Directory Structure

```
car-crash-lawyer-ai/
├── 📁 .config/                    # Configuration files
│   ├── 📁 .semgrep/              # Code security scanning
│   │   └── semgrep_rules.json    # Security rules configuration
│   └── 📁 npm/                   # NPM global configuration
│       └── 📁 node_global/
│           └── 📁 lib/
│
├── 📁 PDF/                        # Generated PDF reports
│   └── Car Crash Lawyer AI Incident Report other vehicles and witness.pdf
│
├── 📁 attached_assets/            # User uploaded assets and screenshots
│   ├── 🖼️ Car and scales logo_*.png
│   ├── 🖼️ IMG_*.png/.PNG/.jpeg   # User uploaded images
│   ├── 🖼️ Screenshot_*.png       # System screenshots
│   └── 📄 content-*.md           # Content files
│
├── 📁 backups/                    # Database and system backups
│
├── 📁 lib/                        # Core library modules
│   ├── 🔧 aiSummaryGenerator.js   # AI-powered incident summarization
│   ├── 🔧 audioStorage.js         # Audio file management
│   ├── 🔧 dashcamUploader.js      # Dashcam video upload handling
│   ├── 🔧 dataFetcher.js          # Database interaction utilities
│   ├── 🔧 emailService.js         # Email notification system
│   ├── 🔧 incidentEndpoints.js    # Incident API endpoints
│   ├── 🔧 pdfGenerator.js         # PDF report generation
│   ├── 🔧 simpleGDPRManager.js    # GDPR compliance management
│   └── 🔧 transcriptionService.js # Audio transcription processing
│
├── 📁 logs/                       # Application logs
│
├── 📁 migrations/                 # Database migrations
│   └── 📄 simplify-gdpr-schema.sql
│
├── 📁 public/                     # Frontend web interface
│   ├── 🌐 access-reports.html     # Report access interface
│   ├── 🌐 ai-summary-review.html  # AI summary review page
│   ├── 🍪 cookie-manager.js       # Cookie consent management
│   ├── 🍪 cookie-policy.html      # Cookie policy page
│   ├── 📋 declaration.html        # Legal declarations
│   ├── 🏠 holding.html            # Holding/maintenance page
│   ├── 📝 incident.html           # Incident reporting form
│   ├── 🏠 index.html              # Main landing page
│   ├── 🖼️ logo.png               # Application logo
│   ├── 🔒 privacy-dashboard.html  # User privacy dashboard
│   ├── 🔒 privacy-manager.js      # Privacy settings management
│   ├── 🔒 privacy-policy.html     # Privacy policy page
│   ├── ✅ report-complete.html    # Report completion page
│   ├── 📝 report.html             # Main report interface
│   ├── 🛡️ safety-check.html      # Safety verification page
│   ├── 📧 subscribe.html          # Newsletter subscription
│   ├── 📊 summary-preview.html    # AI summary preview
│   ├── 🔧 temp.html               # Temporary testing page
│   ├── 📜 terms-of-service.html   # Terms of service
│   ├── 🎤 transcribe.html         # Audio transcription interface
│   └── 🎤 transcription-status.html # Transcription status tracker
│
├── 📁 services/                   # Business logic services
│   ├── 🔒 gdprService.js          # GDPR compliance service
│   └── 📄 pdf-service.js          # PDF generation service
│
├── 📁 temp/                       # Temporary files
│
├── 📁 test/                       # Testing suite
│   ├── 📁 data/                   # Test data
│   │   └── fixtures.json          # Test fixtures
│   ├── 📁 integration/            # Integration tests
│   │   ├── api.test.js            # API endpoint tests
│   │   ├── pdf-generation.test.js # PDF generation tests
│   │   ├── test-endpoints.sh      # Shell script tests
│   │   └── transcription.test.js  # Transcription tests
│   ├── 📁 unit/                   # Unit tests
│   │   └── modules.test.js        # Module unit tests
│   ├── 🏥 health.test.js          # Health check tests
│   ├── 🚀 production.test.js      # Production readiness tests
│   ├── ⚙️ setup.js               # Test setup configuration
│   ├── 🔒 test-gdpr.js           # GDPR compliance tests
│   ├── 🔧 utils.test.js          # Utility function tests
│   └── ✅ validation.test.js      # Data validation tests
│
├── 📁 uploads/                    # User uploaded files
│   └── 📁 audio/                  # Audio file uploads
│
├── 📁 utils/                      # Utility functions
│   └── 📄 pdfValidation.js        # PDF validation utilities
│
├── 🔐 .env                        # Environment variables (sensitive)
├── ⚙️ .replit                     # Replit configuration
├── 📊 constants.js                # Application constants
├── 🚀 ecosystem.config.js         # PM2 process management
├── 🏠 index.js                    # Main application entry point
├── 🧪 jest.config.js              # Jest testing configuration
├── 🔄 migrate.js                  # Database migration runner
├── 📦 package-lock.json           # NPM dependency lock
├── 📦 package.json                # NPM package configuration
├── 🔒 test-gdpr-endpoints.js      # GDPR endpoint testing
├── 🔒 test-gdpr.js                # GDPR functionality testing
└── 🔍 webhookDebugger.js          # Webhook debugging utility
```

## 🔧 Core Components

### **Backend Services**
- **`index.js`** - Main Express.js server with routing and middleware
- **`lib/simpleGDPRManager.js`** - Comprehensive GDPR compliance system
- **`services/gdprService.js`** - GDPR business logic layer
- **`lib/transcriptionService.js`** - Audio-to-text conversion using OpenAI Whisper

### **Frontend Interface**
- **`public/index.html`** - Main landing page
- **`public/transcription-status.html`** - Primary recording interface
- **`public/incident.html`** - Incident reporting form
- **`public/privacy-dashboard.html`** - User privacy controls

### **Data Management**
- **`lib/dataFetcher.js`** - Supabase database interactions
- **`lib/audioStorage.js`** - Audio file storage management
- **`lib/dashcamUploader.js`** - Video evidence upload system

### **AI & Processing**
- **`lib/aiSummaryGenerator.js`** - OpenAI-powered incident analysis
- **`lib/pdfGenerator.js`** - Legal document generation
- **`lib/emailService.js`** - Automated notifications

### **Compliance & Security**
- **GDPR Compliance**: Full data protection regulation adherence
- **Privacy Controls**: User consent management and data export/deletion
- **Audit Logging**: Complete activity tracking for legal compliance

### **Testing & Quality**
- **Unit Tests**: Module-specific functionality testing
- **Integration Tests**: End-to-end workflow validation
- **Production Tests**: Deployment readiness verification

## 🔐 Environment Configuration

### **Required Environment Variables**
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
ZAPIER_SHARED_KEY=your_zapier_key
```

## 🚀 Deployment Structure

### **Development Workflow**
1. **Main Server**: `PORT=5000 node index.js`
2. **Debug Server**: `node simple-debug-server.js`
3. **Testing**: `npm test` (Jest configuration)

### **Key Endpoints**
- **`/health`** - System health monitoring
- **`/api/gdpr/*`** - Privacy compliance endpoints
- **`/api/whisper/transcribe`** - Audio processing
- **`/webhook/*`** - External integration handlers

## 📊 Data Flow Architecture

```
User Input → Frontend → Express Server → GDPR Manager → Supabase Database
     ↓
Audio Upload → Transcription Service → AI Summary → PDF Generation
     ↓
Email Notification → User Dashboard → Privacy Controls
```

## 🛡️ Security Features

- **GDPR Compliance**: Article 15 (data export), Article 17 (data deletion)
- **Consent Management**: Granular privacy controls
- **Audit Logging**: Complete activity tracking
- **Rate Limiting**: API protection
- **Input Validation**: XSS and injection prevention

This structure provides a scalable, compliant, and maintainable foundation for legal AI assistance services.
