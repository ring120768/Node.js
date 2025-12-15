# Car Crash Lawyer AI - Application Architecture

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [External Integrations](#external-integrations)
7. [Security & Compliance](#security--compliance)
8. [Deployment Architecture](#deployment-architecture)

---

## Overview

**Car Crash Lawyer AI** is a full-stack Node.js application that provides legal support tools for car accident victims. The platform enables users to:

- Report incidents in real-time
- Record and transcribe witness statements
- Generate legal documentation
- Store evidence securely
- Access legal guidance through AI

The application follows a **microservices-inspired architecture** with clear separation of concerns while maintaining the simplicity of a monolithic deployment.

**Version:** 2.0.1
**Runtime:** Node.js >=18.18
**Primary Database:** Supabase (PostgreSQL)
**Hosting:** Replit (currently)

---

## Technology Stack

### Backend Core
- **Node.js**: Runtime environment (v18.18+)
- **Express.js**: Web framework
- **HTTP Server**: Native Node.js HTTP server

### Database & Storage
- **Supabase**:
  - PostgreSQL database
  - Authentication service
  - Storage buckets (for images/documents)
  - Real-time subscriptions
  - Row Level Security (RLS)

### External APIs
- **OpenAI**: AI transcription and summarization (Whisper, GPT-4)
- **what3words**: Precise location services
- **DVLA**: UK vehicle information lookup
- **Typeform**: Form submissions and webhooks

### Frontend
- **Vanilla JavaScript**: No framework, pure DOM manipulation
- **WebSockets**: Real-time updates
- **Responsive HTML/CSS**: Mobile-first design

### Development Tools
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Nodemon**: Development hot-reload

---

## Project Structure

```
car-crash-lawyer-ai/
├── index.js                    # Main entry point
├── src/
│   ├── app.js                  # Express app configuration
│   ├── config/                 # Configuration modules
│   ├── controllers/            # Route handlers
│   │   ├── auth.controller.js
│   │   ├── incident.controller.js
│   │   ├── transcription.controller.js
│   │   ├── userDocuments.controller.js
│   │   └── webhook.controller.js
│   ├── middleware/             # Custom middleware
│   │   ├── cors.js
│   │   ├── errorHandler.js
│   │   ├── gdpr.js
│   │   ├── pageAuth.js         # ⭐ Server-side page authentication
│   │   ├── rateLimit.js
│   │   └── security.js
│   ├── models/                 # Data models (if any)
│   ├── routes/                 # Route definitions
│   │   ├── auth.routes.js
│   │   ├── emergency.routes.js
│   │   ├── gdpr.routes.js
│   │   ├── location.routes.js
│   │   ├── pdf.routes.js
│   │   ├── transcription.routes.js
│   │   ├── userDocuments.routes.js
│   │   └── webhook.routes.js
│   ├── services/               # Business logic
│   │   ├── agentService.js
│   │   ├── aiService.js
│   │   ├── gdprService.js
│   │   ├── imageProcessor.js
│   │   ├── imageProcessorV2.js
│   │   └── imageRetryService.js
│   ├── utils/                  # Utility functions
│   │   ├── logger.js
│   │   └── response.js
│   └── websocket/              # WebSocket handlers
├── public/                     # Frontend assets
│   ├── css/
│   │   └── mascot.css
│   ├── images/
│   │   └── mascot.png
│   ├── js/
│   │   └── mascot.js
│   └── *.html                  # 18 HTML pages
├── lib/                        # Legacy/additional libraries
│   ├── data/
│   ├── generators/
│   └── services/
├── supabase/
│   └── sql/                    # Database schemas
│       ├── user_documents_schema.sql
│       └── rls_policies.sql
├── scripts/                    # Utility scripts
│   ├── monitor-image-processing.js
│   └── retry-failed-images.js
├── package.json
└── .env                        # Environment variables
```

---

## Core Components

### 1. Application Entry Point (`index.js`)

**Responsibilities:**
- Initialize HTTP server
- Configure WebSockets
- Handle graceful shutdown
- Validate environment variables
- Display startup banner
- Health check endpoints (`/healthz`, `/readyz`)

**Key Features:**
```javascript
// Singleton protection
if (global.__APP_STARTED__) {
  process.exit(0);
}

// Port configuration
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';  // Required for Replit

// Server creation
const server = http.createServer(app);
const wss = websocketModule.initializeWebSocket(server);
```

**Graceful Shutdown:**
- Handles SIGTERM, SIGINT signals
- Closes HTTP server
- Closes WebSocket connections
- Unsubscribes from Supabase realtime channels
- 5-second forced shutdown timeout

---

### 2. Express Application (`src/app.js`)

**Responsibilities:**
- Middleware configuration
- Route mounting
- Service initialization
- Error handling

**Middleware Stack (in order):**
1. **Helmet**: Security headers
2. **CORS**: Cross-origin resource sharing
3. **Compression**: Response compression
4. **Request ID**: Unique ID for each request
5. **Request Timeout**: 30 second default timeout
6. **HTTPS/WWW Redirect**: Production redirects
7. **Morgan**: HTTP request logging
8. **Request Logger**: Custom logging middleware
9. **Cookie Parser**: Cookie handling
10. **Static Files**: Serve from `public/`
11. **Rate Limiters**:
    - `/api/`: Standard rate limit
    - `/api/whisper/`: Strict rate limit
    - `/api/gdpr/`: Strict rate limit
12. **Cache Control**: No-cache for HTML files

**Raw Body Capture:**
```javascript
// CRITICAL for webhook signature verification
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    req.rawBodyBuffer = buf;
    req.rawBody = buf.toString('utf8');
  }
}));
```

**Service Initialization:**
```javascript
// Supabase
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

// Image Processors
const imageProcessor = new ImageProcessor(supabase);
const imageProcessorV2 = new ImageProcessorV2(supabase);

// Auth Service
const authService = new AuthService(supabaseUrl, anonKey, serviceKey);

// GDPR Service
gdprService.initialize(true);

// Agent Service (background processing)
agentService.start();
```

**Page Authentication (Security Wall):**

Protected pages require authentication at the server level before HTML is served:

```javascript
// src/middleware/pageAuth.js
async function pageAuth(req, res, next) {
  // 1. Parse cookies from request header
  const cookies = parseCookies(req.headers.cookie);

  // 2. Extract session token (sb-access-token or sb-auth-token)
  const token = cookies['sb-access-token'] || cookies['sb-auth-token'];

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      redirect: `/login.html?redirect=${encodeURIComponent(req.path)}`
    });
  }

  // 3. Verify token with Supabase Auth API
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      error: 'Invalid or expired session',
      redirect: `/login.html?redirect=${encodeURIComponent(req.path)}`
    });
  }

  // 4. Attach user and token to request
  req.user = user;
  req.sessionToken = token;
  next();
}
```

**Protected Routes (src/app.js):**
```javascript
// Dashboard (requires authentication)
app.get('/dashboard.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Transcription status (requires authentication)
app.get('/transcription-status.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/transcription-status.html'));
});

// Incident report (requires authentication)
app.get('/incident.html', pageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/incident.html'));
});
```

**Why Server-Side Authentication:**
- Cannot be bypassed by modifying JavaScript
- Session verified before HTML is sent
- Protects sensitive user data at the earliest point
- Works even if JavaScript is disabled
- Provides proper 401 responses for unauthorized access

**Testing:**
```bash
node test-security-wall.js
```

---

### 3. Routing Architecture

**Central Router** (`src/routes/index.js`):
- Mounts all sub-routes
- Provides legacy route redirects
- Health check endpoints
- System status page

**Route Modules:**

| Route | Controller | Purpose |
|-------|------------|---------|
| `/api/auth/*` | auth.controller.js | User authentication |
| `/api/transcription/*` | transcription.controller.js | Audio transcription |
| `/api/gdpr/*` | gdpr.controller.js | GDPR compliance |
| `/api/emergency/*` | emergency.controller.js | Emergency contacts |
| `/api/pdf/*` | pdf.controller.js | PDF generation |
| `/api/location/*` | location.controller.js | what3words conversion |
| `/api/debug/*` | debug.controller.js | Debug utilities |
| `/api/user-documents/*` | userDocuments.controller.js | Document management |
| `/webhooks/typeform` | webhook.controller.js | Typeform webhooks |
| `/webhooks/github` | githubWebhook.routes.js | GitHub webhooks |
| `/s` | index.js | Short URL redirect (for Typeform) |

**Special Routes:**

1. **Short Redirect** (`/s`):
   ```javascript
   // Workaround for Typeform's character limit
   GET /s?u={{user_id}}
   → Redirects to /payment-success.html?auth_user_id={{user_id}}
   ```

2. **Health Checks**:
   - `GET /healthz` - Basic health
   - `GET /livez` - Liveness probe
   - `GET /readyz` - Readiness probe with Supabase check

---

### 4. Controllers

**Purpose:** Handle HTTP requests, validate input, call services, format responses

**Key Controllers:**

#### Auth Controller (`auth.controller.js`)
- User registration
- Login/logout
- Session management
- Password reset

#### Webhook Controller (`webhook.controller.js`)
- **Typeform webhook handler**
- Signature verification (HMAC SHA-256)
- Form response processing
- Image processing pipeline integration

**Webhook Flow:**
```
1. Validate signature
2. Extract form data
3. Process images (ImageProcessorV2)
4. Store in database
5. Send 200 OK immediately
6. Continue processing async
```

#### User Documents Controller (`userDocuments.controller.js`)
- List user documents
- Get document details
- Refresh signed URLs
- Download documents (redirect to storage)
- Soft delete (GDPR)
- Document statistics

#### Transcription Controller (`transcription.controller.js`)
- Upload audio
- Queue transcription jobs
- Poll transcription status
- Retrieve transcripts
- Save to database

---

### 5. Services Layer

**Purpose:** Business logic, third-party integrations, complex operations

#### Image Processor V2 (`imageProcessorV2.js`)

**Enhanced Features:**
- Database-driven status tracking
- Automatic retry mechanism
- Error categorization
- Comprehensive logging

**Processing Flow:**
```javascript
1. Create document record (status: 'pending')
2. Update status to 'processing'
3. Download from Typeform URL (with retries)
4. Upload to Supabase Storage
5. Generate signed URL
6. Update status to 'completed' (or 'failed')
```

**Error Categories:**
- `AUTH_ERROR`: 401/403 (URL expired)
- `NOT_FOUND`: 404
- `TIMEOUT`: Network timeout
- `RATE_LIMIT`: Too many requests
- `FILE_TOO_LARGE`: Size limit exceeded
- `STORAGE_UPLOAD_ERROR`: Supabase issue
- `DNS_ERROR`: DNS resolution failed

#### Image Retry Service (`imageRetryService.js`)
- Finds failed documents
- Implements exponential backoff
- Maximum 3 retries by default
- Cron-ready for automation

#### AI Service (`aiService.js`)
- OpenAI Whisper transcription
- GPT-4 summarization
- Prompt engineering
- Token optimization

#### GDPR Service (`gdprService.js`)
- Data retention policies
- Audit logging
- Soft delete support
- 7-year retention for legal documents

#### Agent Service (`agentService.js`)
- Background task processing
- Queue management
- Scheduled operations
- Health monitoring

---

### 6. Database Architecture

**Platform:** Supabase (PostgreSQL)

**Key Tables:**

#### 1. `user_signup`
```sql
- create_user_id (UUID, primary key)
- email
- name, surname
- mobile
- address fields
- driving_license_number
- car_registration_number
- vehicle details
- insurance details
- emergency_contact
- driving_license_picture (URL)
- vehicle_picture_front (URL)
- vehicle_picture_driver_side (URL)
- vehicle_picture_passenger_side (URL)
- vehicle_picture_back (URL)
- gdpr_consent
- created_at, updated_at
```

#### 2. `user_documents`
```sql
- id (UUID, primary key)
- create_user_id (references user)
- document_type (e.g., 'driving_license_picture')
- document_category (e.g., 'user_signup')
- source_type ('typeform')
- source_id (form ID)
- original_filename
- original_url (Typeform URL)
- storage_bucket ('user-documents')
- storage_path (Supabase Storage path)
- public_url (signed URL or API URL)
- file_size, mime_type, file_extension
- image_width, image_height
- has_thumbnail, thumbnail_path
- status ('pending', 'processing', 'completed', 'failed')
- retry_count, max_retries (default 3)
- last_retry_at, next_retry_at
- error_message, error_code, error_details
- processing_started_at
- processing_completed_at
- processing_duration_ms
- metadata (JSONB)
- created_at, updated_at, deleted_at
- retention_until (GDPR)
- gdpr_consent
```

**Indexes:**
- `idx_user_documents_user` on `create_user_id`
- `idx_user_documents_status` on `status`
- `idx_user_documents_type` on `document_type`
- `idx_user_documents_retry` on `status, retry_count, next_retry_at`
- Several others for query optimization

**Helper Functions:**
```sql
-- Get user document statistics
get_user_document_stats(user_id TEXT)

-- Get documents needing retry
get_documents_needing_retry()
```

#### 3. `incident_reports`
```sql
- id (UUID)
- create_user_id
- Medical information (12+ fields)
- Accident details (10+ fields)
- Weather conditions (12+ fields)
- Vehicle information
- Road information
- Other driver details
- Police information
- Witness information
- File URLs (11 fields for images/documents)
- created_at, updated_at
```

#### 4. `transcription_queue`
```sql
- id (UUID)
- user_id
- status ('queued', 'processing', 'completed', 'failed')
- audio_url
- transcript_text
- error_message
- created_at, updated_at
```

#### 5. `ai_transcription`
```sql
- id (UUID)
- user_id
- transcript_text
- audio_duration
- language
- created_at
```

#### 6. `ai_summary`
```sql
- id (UUID)
- transcription_id
- summary_text
- created_at
```

#### 7. `audit_logs`
```sql
- event_type
- event_id
- user_id
- action
- details (JSONB)
- metadata (JSONB)
- created_at
```

**Row Level Security (RLS):**
- Enabled on all tables
- Service role bypasses RLS (for webhooks)
- User-specific policies for data access
- Schema: `supabase/sql/rls_policies.sql`

**Storage Buckets:**
- `user-documents`: Stores all user-uploaded images
- Path structure: `{userId}/{documentType}/{timestamp}_{documentType}.{ext}`
- Example: `b721e579.../driving_license_picture/1760650717877_driving_license_picture.jpeg`

---

## Data Flow

### 1. User Signup Flow

```
Typeform Submission
    ↓
Typeform Webhook (POST /webhooks/typeform)
    ↓
Signature Verification (HMAC SHA-256)
    ↓
Extract Form Data (webhook.controller.js)
    ↓
Process Images (ImageProcessorV2)
    ├─ Create user_documents records (status: 'pending')
    ├─ Download from Typeform
    ├─ Upload to Supabase Storage
    ├─ Generate permanent API URLs
    └─ Update status to 'completed'
    ↓
Store User Data (user_signup table)
    ├─ Personal details
    ├─ Vehicle information
    ├─ Insurance details
    └─ Image URLs (permanent API URLs)
    ↓
Update Account Status
    ↓
Redirect User to payment-success.html
    ↓
Frontend Fetches User Profile
    ↓
Display Personalized Welcome Page
```

### 2. Image Processing Pipeline

```
Image URL (Typeform)
    ↓
ImageProcessorV2.processTypeformImage()
    ↓
1. Create Document Record
   - user_documents.insert({ status: 'pending' })
    ↓
2. Update Status
   - status = 'processing'
    ↓
3. Download Image (with retry)
   - HTTP GET with timeout
   - Retry up to 3 times
   - Error categorization
    ↓
4. Upload to Supabase Storage
   - supabase.storage.from('user-documents').upload()
    ↓
5. Generate API URL
   - Format: https://{host}/api/user-documents/{uuid}/download
    ↓
6. Update Document
   - status = 'completed'
   - storage_path = path
   - public_url = API URL
   - processing_duration_ms
    ↓
Success ✓

If Error:
    ↓
7. Mark as Failed
   - status = 'failed'
   - error_code, error_message
   - next_retry_at (exponential backoff)
    ↓
8. Automatic Retry (cron job)
   - imageRetryService.js
   - Retry up to max_retries (3)
```

### 3. Document Download Flow

```
User clicks download link
    ↓
GET /api/user-documents/{uuid}/download
    ↓
userDocuments.controller.downloadDocument()
    ↓
1. Extract user_id from query (optional)
2. Query user_documents by UUID
3. Verify ownership (if user_id provided)
4. Check status = 'completed'
5. Generate short-lived signed URL (5 minutes)
    ↓
Redirect to Supabase Storage Signed URL
    ↓
Browser downloads file directly from Supabase
```

### 4. Incident Report Flow

```
User clicks "Report Incident"
    ↓
Auth Check (incident.html)
    ├─ Authenticated: Continue
    └─ Not authenticated: Redirect to login
    ↓
User fills form + uploads evidence
    ↓
Submit to Typeform
    ↓
Typeform Webhook (POST /webhooks/typeform)
    ↓
Process Incident Report (webhook.controller.js)
    ├─ Extract incident details
    ├─ Process evidence images (ImageProcessorV2)
    └─ Store in incident_reports table
    ↓
User can view in Dashboard
```

### 5. Transcription Flow

```
User records audio
    ↓
POST /api/transcription/transcribe
    ↓
1. Save audio to Supabase Storage
2. Create transcription_queue record (status: 'queued')
    ↓
Agent Service (background)
    ↓
1. Fetch queued jobs
2. Update status to 'processing'
3. Call OpenAI Whisper API
4. Store transcript in ai_transcription
5. Call GPT-4 for summary
6. Store summary in ai_summary
7. Update queue status to 'completed'
    ↓
WebSocket broadcasts update
    ↓
Frontend receives real-time update
    ↓
Display transcript + summary
```

---

## External Integrations

### 1. Supabase

**Services Used:**
- **PostgreSQL Database**: All data storage
- **Authentication**: User login/signup
- **Storage**: File uploads (images, audio)
- **Realtime**: WebSocket subscriptions for live updates

**Configuration:**
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
);
```

**Realtime Subscriptions:**
```javascript
// Transcription updates
supabase
  .channel('transcription-updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'transcription_queue'
  }, (payload) => {
    websocketModule.handleRealtimeTranscriptionUpdate(payload);
  })
  .subscribe();
```

### 2. OpenAI

**Services Used:**
- **Whisper**: Audio transcription
- **GPT-4**: Text summarization, AI assistance

**Configuration:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

**Usage:**
```javascript
// Transcription
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en'
});

// Summarization
const summary = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'Summarize this incident report...' },
    { role: 'user', content: transcriptText }
  ]
});
```

### 3. what3words

**Purpose:** Convert GPS coordinates to 3-word addresses for precise location sharing

**Endpoints:**
- `GET /api/location/convert?lat={lat}&lng={lng}`
- `GET /api/location/autosuggest?input={words}`

**Example:**
```javascript
// Convert coordinates
const response = await fetch('/api/location/convert?lat=51.5074&lng=-0.1278');
// Returns: { words: 'filled.count.soap', nearestPlace: 'London' }
```

### 4. DVLA (UK Vehicle Database)

**Purpose:** Look up vehicle details by registration number

**Endpoint:**
- `POST /api/vehicle/lookup`

**Configuration:**
```javascript
headers: {
  'x-api-key': process.env.DVLA_API_KEY,
  'Content-Type': 'application/json'
}
```

### 5. Typeform

**Purpose:** Form submissions and webhooks

**Webhooks:**
- User Signup Form (ID: `b03aFxEO`)
- Incident Report Form (ID: `WvM2ejru`)

**Webhook Handler:**
```javascript
POST /webhooks/typeform
Headers:
  Typeform-Signature: sha256=<base64_hmac_digest>

Body: {
  event_id,
  event_type: 'form_response',
  form_response: {
    form_id,
    token,
    submitted_at,
    hidden: { auth_user_id, email, ... },
    definition: { fields: [...] },
    answers: [...]
  }
}
```

**Signature Verification:**
```javascript
const expectedBuffer = crypto
  .createHmac('sha256', TYPEFORM_WEBHOOK_SECRET)
  .update(rawBody, 'utf8')
  .digest();

const receivedBuffer = Buffer.from(signature.replace(/^sha256=/, ''), 'base64');

return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
```

---

## Security & Compliance

### 1. Authentication

**Supabase Auth:**
- Email/password authentication
- Session management via cookies
- JWT tokens
- Service role key for server-side operations

**Auth Middleware:**
```javascript
// Check if user is authenticated
const { user, error } = await supabase.auth.getUser(token);
if (error) return res.status(401).json({ error: 'Unauthorized' });
```

### 2. Authorization

**Row Level Security (RLS):**
- Users can only access their own data
- Service role bypasses RLS for webhooks
- Policies defined in `supabase/sql/rls_policies.sql`

**Example Policy:**
```sql
CREATE POLICY "Users can view own documents"
ON user_documents FOR SELECT
USING (auth.uid() = create_user_id::uuid);
```

### 3. GDPR Compliance

**Features:**
- Explicit consent collection
- 7-year data retention
- Soft delete support (`deleted_at` column)
- Audit logging (all actions tracked)
- Right to be forgotten
- Data export capabilities

**GDPR Endpoints:**
```
GET  /api/gdpr/data-export?user_id={id}
POST /api/gdpr/delete-account
GET  /api/gdpr/audit-log?user_id={id}
```

### 4. Security Measures

**Helmet.js Headers:**
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)

**Rate Limiting:**
```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100  // limit each IP to 100 requests per windowMs
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10  // more strict for sensitive endpoints
});
```

**CORS Configuration:**
```javascript
const allowedOrigins = [
  'https://nodejs-1-ring120768.replit.app',
  'https://*.replit.dev',
  'http://localhost:5000'
];

cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});
```

**Input Validation:**
- Validator.js for email, phone, etc.
- Parameterized queries (no SQL injection)
- File type validation (multer)
- File size limits

**Error Handling:**
- Never expose stack traces in production
- Generic error messages to users
- Detailed logs to server
- Request ID tracking

---

## Deployment Architecture

### Current: Replit

**Configuration:**
```
Runtime: Node.js 18+
Port: Dynamic (process.env.PORT)
Host: 0.0.0.0
Startup Command: npm start
Environment: .env file (via Replit Secrets)
```

**Environment Variables:**
```env
# Supabase
SUPABASE_URL=https://*.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# what3words
WHAT3WORDS_API_KEY=...

# DVLA
DVLA_API_KEY=...

# Webhooks
TYPEFORM_WEBHOOK_SECRET=...
GITHUB_WEBHOOK_SECRET=...

# App
NODE_ENV=production
PORT=5000
REQUEST_TIMEOUT=30000
APP_URL=https://nodejs-1-ring120768.replit.app
```

### Recommended Production Setup

**Platform:** AWS, DigitalOcean, or Heroku

**Architecture:**
```
Internet
    ↓
Load Balancer (SSL/TLS termination)
    ↓
Auto-scaling Group (2-4 instances)
    ↓
Node.js App (PM2 for process management)
    ↓
Supabase (PostgreSQL + Storage)
    ↓
External APIs (OpenAI, what3words, DVLA)
```

**Process Management:**
```bash
# PM2 configuration
pm2 start index.js --name car-crash-lawyer-ai -i max
pm2 startup
pm2 save
```

**Monitoring:**
- Health checks: `/healthz`, `/readyz`
- Logging: Winston to CloudWatch/DataDog
- Error tracking: Sentry
- Uptime monitoring: Pingdom/UptimeRobot

**CI/CD Pipeline:**
```yaml
# GitHub Actions example
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    - Checkout code
    - Run tests (Jest)
    - Build (if needed)
    - Deploy to production
    - Run smoke tests
```

---

## Frontend Architecture

### Pages (18 total)

**Public Pages:**
- `index.html` - Landing page
- `login.html` - User login
- `signup-auth.html` - User registration
- `privacy-policy.html` - Privacy policy
- `demo.html` - Product demo

**Authenticated Pages:**
- `dashboard.html` - User dashboard
- `incident.html` - Report incident
- `transcribe.html` - Audio recording
- `transcription-status.html` - Transcription progress
- `report.html` - View reports
- `report-complete.html` - Report generated
- `declaration.html` - Legal declarations
- `safety-check.html` - Safety checklist

**Utility Pages:**
- `payment-success.html` - Post-payment welcome
- `what3words.html` - Location finder
- `findme.html` - Emergency location
- `temp.html` - Temporary page
- `subscribe.html` - Newsletter subscription

### Frontend Features

**Shared Components:**
```
<!-- Every page includes -->
<link rel="stylesheet" href="/css/mascot.css">
<script src="/js/mascot.js"></script>
```

**Mascot Component:**
- Fixed position: Top-left corner
- Responsive sizing: 80px (desktop) → 60px (tablet) → 50px (mobile)
- Links to homepage
- Hover effect

**Real-time Updates:**
```javascript
// WebSocket connection
const ws = new WebSocket('wss://nodejs-1-ring120768.replit.app');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'transcription_update') {
    updateTranscriptionUI(data.payload);
  }
};
```

**API Communication:**
```javascript
// Fetch with error handling
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      credentials: 'include',  // Send cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showErrorMessage('Failed to connect. Please try again.');
  }
}
```

---

## Performance Optimizations

### 1. Caching

**LRU Cache:**
```javascript
const LRU = require('lru-cache');

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 5  // 5 minutes
});
```

### 2. Compression

```javascript
const compression = require('compression');
app.use(compression());
```

### 3. Database Optimization

**Indexes:**
- Primary keys: All tables
- Foreign keys: User relations
- Query optimization: Status, type, date fields

**Connection Pooling:**
- Supabase handles connection pooling
- Max connections configured in Supabase dashboard

### 4. Image Optimization

**Signed URL Caching:**
- Short-lived (5 min) for downloads
- Long-lived (1 hour) for viewing

**Lazy Loading:**
```html
<img src="/images/mascot.png" loading="lazy" alt="AL mascot">
```

### 5. CDN Integration (Future)

- CloudFront for static assets
- Image optimization via imgix/Cloudinary
- Geo-distributed endpoints

---

## Monitoring & Observability

### Logging

**Winston Logger:**
```javascript
const logger = require('./utils/logger');

logger.info('User login', { userId, timestamp });
logger.error('Database error', { error: error.message, stack: error.stack });
logger.success('Image processed', { documentId, duration });
```

**Log Levels:**
- `error`: Errors requiring attention
- `warn`: Warnings, non-critical issues
- `info`: General information
- `success`: Successful operations
- `debug`: Debugging information (development only)

### Metrics

**Application Metrics:**
- Request count
- Response time
- Error rate
- Active users
- Document processing success rate

**System Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Health Checks

```bash
# Basic health
curl https://nodejs-1-ring120768.replit.app/healthz

# Readiness (with DB check)
curl https://nodejs-1-ring120768.replit.app/readyz
```

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev  # Uses nodemon for hot-reload

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format
```

### Git Workflow

**Branches:**
- `main`: Production-ready code
- `feat/audit-prep`: Current feature branch
- Feature branches: `feat/<feature-name>`
- Bug fixes: `fix/<bug-name>`

**Commit Convention:**
```
feat: Add short redirect URL for Typeform
fix: Remove invalid req reference in webhook
docs: Update architecture documentation
refactor: Improve image processor error handling
test: Add tests for webhook controller
```

### Testing

**Jest Configuration:**
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ]
};
```

**Test Structure:**
```
src/
├── middleware/
│   ├── __tests__/
│   │   ├── cors.integration.test.js
│   │   └── corsConfig.test.js
├── routes/
│   └── __tests__/
│       └── (route tests)
```

---

## Future Enhancements

### Planned Features

1. **Multi-tenancy:**
   - Support for law firms as organizations
   - User roles (admin, lawyer, client)

2. **Advanced Analytics:**
   - Dashboard with charts
   - Report insights via AI
   - Trend analysis

3. **Mobile Apps:**
   - React Native app
   - Offline support
   - Push notifications

4. **Enhanced AI:**
   - Legal document analysis
   - Fault determination
   - Settlement estimation

5. **Integrations:**
   - CRM systems (Salesforce, HubSpot)
   - Legal case management tools
   - Insurance company APIs

6. **Microservices Migration:**
   - Separate transcription service
   - Image processing service
   - PDF generation service
   - API gateway

### Infrastructure Improvements

1. **Container Orchestration:**
   - Docker + Kubernetes
   - Auto-scaling based on load

2. **Message Queue:**
   - RabbitMQ or AWS SQS
   - Async processing for heavy tasks

3. **Serverless Functions:**
   - AWS Lambda for webhooks
   - Cloudflare Workers for edge computing

4. **Database Sharding:**
   - Partition by user_id or region
   - Read replicas for scaling

---

## Troubleshooting

### Common Issues

**1. Port Already in Use:**
```bash
# Find process
lsof -i :5000

# Kill process
kill -9 $(lsof -t -i:5000)
```

**2. Image Processing Failures:**
```bash
# Monitor status
node scripts/monitor-image-processing.js

# Retry failed images
node scripts/retry-failed-images.js --dry-run
```

**3. Supabase Connection Issues:**
- Check environment variables
- Verify RLS policies
- Check service role key permissions

**4. Webhook Signature Verification Failed:**
- Ensure `req.rawBody` is captured
- Check secret key matches Typeform
- Verify HMAC algorithm (SHA-256)

---

## Conclusion

Car Crash Lawyer AI is a well-architected, production-ready application with:

✅ **Scalable architecture** - Ready for growth
✅ **GDPR compliance** - Legal requirements met
✅ **Comprehensive error handling** - Robust and reliable
✅ **Real-time capabilities** - Modern user experience
✅ **Security best practices** - Protected and safe
✅ **Monitoring & observability** - Easy to maintain
✅ **Clear separation of concerns** - Maintainable codebase

**Key Strengths:**
- Clean, modular code
- Comprehensive documentation
- Automatic retry mechanisms
- Real-time updates
- Mobile-responsive frontend
- Permanent, shareable document URLs

**Ready for:**
- Production deployment
- User onboarding
- Scale-up operations
- Feature expansion

---

*Last Updated: 2025-10-28*
*Version: 2.1.0*
*Author: Car Crash Lawyer AI Team*
