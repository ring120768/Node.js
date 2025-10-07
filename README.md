
# Car Crash Lawyer AI Server

A modular Node.js server for handling car accident reports, audio transcription, AI analysis, and GDPR-compliant data management.

## 🏗️ Architecture

**Modular Design (89-line entry point)**
- Migrated from monolithic 3,000+ line server to clean modular architecture
- Each component has single responsibility
- Easy to maintain, test, and extend

## 📁 Project Structure

```
├── src/                        # Main application code
│   ├── app.js                 # Express app configuration
│   ├── config/                # Configuration management
│   │   ├── index.js           # Centralized config
│   │   └── constants.js       # Application constants
│   ├── controllers/           # Route controllers
│   │   ├── auth.controller.js
│   │   ├── transcription.controller.js
│   │   ├── gdpr.controller.js
│   │   ├── emergency.controller.js
│   │   ├── pdf.controller.js
│   │   ├── webhook.controller.js
│   │   ├── location.controller.js
│   │   └── debug.controller.js
│   ├── routes/                # Express routes
│   │   ├── index.js           # Route aggregator
│   │   └── *.routes.js        # Feature-specific routes
│   ├── middleware/            # Custom middleware
│   │   ├── gdpr.js            # GDPR compliance
│   │   ├── rateLimit.js       # Rate limiting
│   │   └── requestLogger.js   # Request logging
│   ├── services/              # Business logic
│   │   ├── aiService.js       # AI/OpenAI integration
│   │   └── gdprService.js     # GDPR compliance logic
│   ├── models/                # Data models
│   │   ├── User.js
│   │   └── Transcription.js
│   ├── utils/                 # Utility functions
│   │   ├── logger.js          # Logging utilities
│   │   ├── response.js        # Response helpers
│   │   └── validators.js      # Input validation
│   └── websocket/             # WebSocket handling
│       └── index.js
├── public/                    # Static files
├── lib/                       # Legacy PDF/email services
├── index.js                   # Main server entry point (89 lines)
├── index.old.js              # Backup (will be removed after 1 week)
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and database
- OpenAI API key
- what3words API key (optional)

### Environment Variables
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# AI Services
OPENAI_API_KEY=your_openai_key
WHAT3WORDS_API_KEY=your_what3words_key

# Security
WEBHOOK_API_KEY=your_webhook_key
```

### Running the Server
```bash
npm install
npm start
# Server runs on http://0.0.0.0:5000
```

## 📡 API Endpoints

### Authentication & Users
- `POST /api/auth/signup` - User registration with GDPR consent
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Session validation

### GDPR & Consent Management
- `GET /api/gdpr/consent/:userId` - Get consent status
- `PUT /api/gdpr/consent/:userId` - Update consent
- `GET /api/gdpr/audit-log/:userId` - Audit trail access
- `GET /api/gdpr/export/:userId` - Data export

### Transcription & AI
- `POST /api/whisper/transcribe` - Audio transcription
- `GET /api/transcription-status/:queueId` - Status checking
- `POST /api/save-ai-listening-transcript` - Save AI listening sessions
- `GET /api/user/:userId/ai-listening-transcripts` - Get AI transcripts

### Emergency Services
- `GET /api/user/:userId/emergency-contact` - Get emergency contact
- `PUT /api/user/:userId/emergency-contact` - Update emergency contact
- `POST /api/log-emergency-call` - Emergency service logging

### Location Services
- `GET /api/what3words/convert` - Coordinate to words conversion
- `GET /api/what3words/autosuggest` - Location suggestions
- `POST /api/upload-what3words-image` - Location screenshot capture

### Document Generation
- `POST /generate-pdf` - Incident report PDF generation
- `GET /pdf-status/:userId` - PDF generation status
- `GET /download-pdf/:userId` - PDF download

### System
- `GET /health` - Health check and service status
- `GET /api/config` - Frontend configuration
- `GET /system-status` - System status page

## ⚡ Key Features

### GDPR Compliance
- ✅ Consent capture on signup
- ✅ Audit trail logging
- ✅ Data export/deletion rights
- ✅ Privacy by design

### Real-time Features
- ✅ WebSocket support for live updates
- ✅ Transcription progress tracking
- ✅ Queue processing status

### AI Integration
- ✅ OpenAI Whisper transcription
- ✅ GPT-4 incident analysis
- ✅ Automated report generation
- ✅ Multi-page listening sessions

### Security
- ✅ Rate limiting
- ✅ Input validation
- ✅ Request tracking
- ✅ Error sanitization

## 🔧 Development

### Adding New Features
1. Create controller in `src/controllers/`
2. Add routes in `src/routes/`
3. Register routes in `src/routes/index.js`
4. Add any middleware in `src/middleware/`
5. Test with comprehensive test suite

### Running Tests
```bash
npm test
# or
node run-tests.js
```

### Performance Monitoring
```bash
node performance-comparison.js
```

## 🛠️ Migration History

This project was successfully migrated from a monolithic architecture to modular design:

- **Before:** Single 3,000+ line `index.js` file
- **After:** Modular 89-line entry point + 27 organized files
- **Benefits:** 97% code reduction in main file, better maintainability, easier testing
- **Migration Date:** January 2025
- **Status:** ✅ Complete and stable

## 📈 Performance

- **Startup Time:** <3 seconds
- **Memory Usage:** Optimized with cleanup routines
- **WebSocket:** Auto-healing connections
- **Queue Processing:** Automated with retry logic
- **Error Rate:** <1% with comprehensive error handling

## 🔒 Security

- Rate limiting on all endpoints
- GDPR compliance built-in
- Input validation and sanitization
- Secure file handling
- Audit logging for all data access

## 📄 License

[Add your license information here]

## 🤝 Contributing

[Add contribution guidelines here]

---

**Last Updated:** January 2025
**Architecture:** Modular (89-line entry point)
**Status:** Production Ready ✅
