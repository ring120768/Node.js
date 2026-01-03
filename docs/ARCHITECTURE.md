# Car Crash Lawyer AI - Technical Architecture Document

**Version:** 1.0.0
**Last Updated:** 2026-01-03
**Status:** Production (Verified Working)
**Author:** Technical Audit - Claude Code

---

## Executive Summary

Car Crash Lawyer AI is a full-stack Node.js application deployed on Railway that enables users to document road traffic accidents through a guided multi-page form, generates comprehensive legal PDF reports with AI-powered analysis, and delivers them via email. The system integrates with Supabase (database, auth, storage), OpenAI (transcription/analysis), DVLA (vehicle lookup), and Resend (email delivery).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Application Entry Points](#2-application-entry-points)
3. [Route Architecture](#3-route-architecture)
4. [Service Layer](#4-service-layer)
5. [Database Schema](#5-database-schema)
6. [External Integrations](#6-external-integrations)
7. [PDF Generation Pipeline](#7-pdf-generation-pipeline)
8. [Email Delivery System](#8-email-delivery-system)
9. [Queue Systems](#9-queue-systems)
10. [Security Architecture](#10-security-architecture)
11. [Legacy Code Reference](#11-legacy-code-reference)
12. [Deployment Configuration](#12-deployment-configuration)
13. [File Reference Map](#13-file-reference-map)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ signup.html │  │incident.html│  │declaration  │  │   Dashboard         │ │
│  │ (Pages 1-3) │  │ (Pages 4-12)│  │   .html     │  │   (React/Vue?)      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │ HTTPS
┌────────────────────────────────────────┼────────────────────────────────────┐
│                           EXPRESS.JS SERVER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Auth Routes │  │ API Routes  │  │ PDF Routes  │  │  Webhook Routes     │ │
│  │ /auth/*     │  │ /api/*      │  │ /api/pdf/*  │  │  /webhooks/github   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                         │                                    │
│  ┌──────────────────────────────────────┼──────────────────────────────────┐ │
│  │                         SERVICE LAYER                                   │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │ │
│  │  │adobePdfFormFiller│  │ htmlToPdfConverter│  │   emailService         │ │ │
│  │  │   Service.js     │  │    (Puppeteer)   │  │   (Resend API)        │ │ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────────────┘ │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │ │
│  │  │ emailRetryService│  │ pdfQueueService  │  │   gdprService          │ │ │
│  │  │   (Queue)        │  │   (Queue)        │  │   (Data Retention)     │ │ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────────────┘ │ │
│  └──────────────────────────────────────┼──────────────────────────────────┘ │
└────────────────────────────────────────┬────────────────────────────────────┘
                                         │
┌────────────────────────────────────────┼────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Supabase   │  │   OpenAI    │  │    DVLA     │  │      Resend         │ │
│  │ (DB/Auth/   │  │  (Whisper   │  │  (Vehicle   │  │   (Email API)       │ │
│  │  Storage)   │  │   GPT-4o)   │  │   Lookup)   │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 20.x | Server runtime |
| **Framework** | Express.js 4.x | HTTP server & routing |
| **Database** | Supabase (PostgreSQL) | Data persistence, auth, storage |
| **PDF Generation** | pdf-lib + Puppeteer | Form filling + HTML rendering |
| **Email** | Resend API | Transactional email delivery |
| **AI** | OpenAI (Whisper, GPT-4o) | Audio transcription, report analysis |
| **Vehicle Data** | DVLA API | UK vehicle registration lookup |
| **Hosting** | Railway | Container deployment |
| **Caching** | Redis (via Supabase) | Session & rate limiting |

---

## 2. Application Entry Points

### 2.1 Main Entry Point

**File:** `src/app.js` (≈700 lines)

The Express application is configured with:

```javascript
// Key middleware order (CRITICAL)
1. Raw body capture (for webhook signatures)
2. CORS configuration
3. Helmet security headers
4. JSON/URL parsing
5. Rate limiting
6. Request ID generation
7. Authentication middleware
8. Route mounting
```

### 2.2 Server Startup

**File:** `index.js`

```javascript
// Environment: PORT from Railway or default 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT);
```

### 2.3 Configuration

**File:** `src/config/index.js`

Centralised configuration with environment variable mapping:

| Config Key | Environment Variable | Purpose |
|------------|---------------------|---------|
| `supabase.url` | `SUPABASE_URL` | Database connection |
| `supabase.serviceKey` | `SUPABASE_SERVICE_ROLE_KEY` | Admin database access |
| `openai.apiKey` | `OPENAI_API_KEY` | AI services |
| `dvla.apiKey` | `DVLA_API_KEY` | Vehicle lookup |
| `resend.apiKey` | `RESEND_API_KEY` | Email delivery |
| `resend.fromEmail` | `RESEND_FROM_EMAIL` | Verified sender |

---

## 3. Route Architecture

### 3.1 Route Hierarchy

```
/
├── /auth/*                    # Authentication routes
│   ├── POST /auth/signup      # User registration
│   ├── POST /auth/login       # User login
│   └── POST /auth/nonce       # Nonce generation
│
├── /api/*                     # Core API routes
│   ├── /api/incident-form/*   # Form submission
│   ├── /api/pdf/*             # PDF generation & download
│   ├── /api/ai/*              # AI transcription & analysis
│   ├── /api/dvla/*            # Vehicle lookup
│   ├── /api/location/*        # What3Words integration
│   ├── /api/gdpr/*            # Data export & deletion
│   └── /api/images/*          # Image upload & management
│
├── /webhooks/*                # External service webhooks
│   └── /webhooks/github       # GitHub repository events
│
├── /health                    # Health check endpoint
├── /debug/*                   # Debug endpoints (protected)
└── /*                         # Static file serving
```

### 3.2 Key Route Files

| File | Mount Point | Purpose |
|------|-------------|---------|
| `src/routes/auth.routes.js` | `/auth` | Authentication |
| `src/routes/incidentForm.routes.js` | `/api/incident-form` | Form submission |
| `src/routes/pdf.routes.js` | `/api/pdf` | PDF operations |
| `src/routes/ai.routes.js` | `/api/ai` | AI processing |
| `src/routes/dvla.routes.js` | `/api/dvla` | Vehicle lookup |
| `src/routes/location.routes.js` | `/api/location` | Geolocation |
| `src/routes/gdpr.routes.js` | `/api/gdpr` | GDPR compliance |
| `src/routes/webhook.routes.js` | `/webhooks` | External webhooks |

---

## 4. Service Layer

### 4.1 PDF Form Filler Service

**File:** `src/services/adobePdfFormFillerService.js` (1,316 lines)

**Despite the filename, this service uses pdf-lib (NOT Adobe SDK).**

**Purpose:** Fill PDF template with form data (Pages 1-12, 17-18)

**Key Features:**
- 213 form field mappings verified
- Witness page appending (dynamic)
- Other vehicle page appending (dynamic)
- DVLA data integration
- Declaration consent fields (Page 17)

**Critical Configuration:**
```javascript
// DISABLED - causes XRef table corruption
// form.flatten();

// DISABLED - corrupts PDF on Railway
// const compressed = await doc.save({ useObjectStreams: true });

// NeedAppearances required for checkbox rendering
form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);
```

### 4.2 HTML to PDF Converter

**File:** `src/services/htmlToPdfConverter.js` (448 lines)

**Purpose:** Convert AI-generated HTML (Pages 13-16) to PDF using Puppeteer

**Key Configuration:**
```javascript
// Browser launch args for Railway containers
args: [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',  // Use /tmp instead of /dev/shm
  '--disable-gpu',
  '--no-zygote'
]

// Memory management
const MAX_PAGES_PER_BROWSER = 8;  // Recycle after 8 pages
```

**Puppeteer Configuration:**

**File:** `.puppeteerrc.cjs`
```javascript
module.exports = {
  skipDownload: false,  // CRITICAL: Let Puppeteer download bundled Chrome
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
  // DO NOT set executablePath - use bundled Chrome
};
```

### 4.3 Email Service

**File:** `lib/emailService.js` (1,117 lines)

**Provider:** Resend API (HTTP-based, NOT SMTP)

**Why Resend over SMTP?** Railway blocks standard SMTP ports.

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `sendEmails()` | Send PDF to user + accounts |
| `sendTemplateEmail()` | Template-based emails |
| `sendIncident90DayNotice()` | GDPR retention warning |
| `sendImageDownloadLinks()` | Image export email |
| `sendAiProcessingEmail()` | Processing notification |

**Critical Attachment Configuration:**
```javascript
attachments: [{
  filename: fileName,
  content: pdfBuffer,
  contentType: 'application/pdf'  // REQUIRED for PDF delivery
}]
```

### 4.4 Email Retry Service

**File:** `src/services/emailRetryService.js` (720 lines)

**Purpose:** Reliable email delivery with exponential backoff

**Retry Intervals:**
```javascript
const RETRY_INTERVALS = [60, 300, 900, 3600, 14400];
// 1 min → 5 min → 15 min → 1 hr → 4 hr

const MAX_ATTEMPTS = 5;
const PDF_SEND_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes
```

### 4.5 PDF Queue Service

**File:** `src/services/pdfQueueService.js` (825 lines)

**Purpose:** PDF generation queue with automatic retry

**Retry Intervals:**
```javascript
const RETRY_INTERVALS = [300, 3600, 14400, 28800, 43200];
// 5 min → 1 hr → 4 hr → 8 hr → 12 hr (spread over 24 hours)

const MAX_ATTEMPTS = 5;
```

### 4.6 GDPR Service

**File:** `src/services/gdprService.js`

**Purpose:** 90-day data retention compliance

**Key Features:**
- Activity logging
- Data export (JSON/PDF)
- Soft deletion across all tables
- Retention warning emails (60, 30, 7, 1 days)

---

## 5. Database Schema

### 5.1 Core Tables

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐         ┌─────────────────────────────────────────────┐│
│  │   user_signup   │─────────│              incident_reports               ││
│  │   (PK: create_  │    1:N  │  (PK: id UUID)                              ││
│  │    user_id)     │         │  - auth_user_id, create_user_id, user_id    ││
│  └────────┬────────┘         │  - All form fields (100+ columns)           ││
│           │                  │  - voice_transcription, ai_summary          ││
│           │                  │  - pdf_sent_at, pdf_send_in_progress        ││
│           │                  │  - deleted_at (soft delete)                 ││
│           │                  └─────────────────┬───────────────────────────┘│
│           │                                    │                            │
│           │    ┌───────────────────────────────┼───────────────────────────┐│
│           │    │                               │                           ││
│           │    │  ┌────────────────────┐  ┌────┴───────────────────┐       ││
│           │    │  │ incident_witnesses │  │ incident_other_vehicles│       ││
│           │    │  │ (FK: incident_     │  │ (FK: incident_id)      │       ││
│           │    │  │  report_id)        │  │ - vehicle registration │       ││
│           │    │  │ - witness_name     │  │ - driver details       │       ││
│           │    │  │ - witness_mobile   │  │ - insurance info       │       ││
│           │    │  │ - witness_email    │  └────────────────────────┘       ││
│           │    │  │ - witness_statement│                                   ││
│           │    │  └────────────────────┘                                   ││
│           │    │                                                            ││
│           │    │  ┌────────────────────┐  ┌────────────────────────┐       ││
│           │    │  │ai_listening_       │  │ dvla_vehicle_info_new  │       ││
│           │    │  │ transcripts        │  │ (FK: create_user_id)   │       ││
│           │    │  │ (FK: incident_id)  │  │ - MOT data             │       ││
│           │    │  │ - transcription_   │  │ - Tax data             │       ││
│           │    │  │   text (Page 18)   │  │ - Vehicle details      │       ││
│           │    │  └────────────────────┘  └────────────────────────┘       ││
│           │    │                                                            ││
│           │    └────────────────────────────────────────────────────────────┘│
│           │                                                                  │
│  ┌────────┴────────┐  ┌─────────────────────┐  ┌────────────────────────┐   │
│  │  user_documents │  │completed_incident_  │  │ incident_images        │   │
│  │ (FK: create_    │  │      forms          │  │ (LEGACY - use          │   │
│  │  user_id)       │  │ (FK: create_user_id)│  │  user_documents)       │   │
│  │ - document_type │  │ - form_data (JSON)  │  └────────────────────────┘   │
│  │ - storage_path  │  │ - pdf_storage_path  │                               │
│  │ - signed_url    │  │ - sent_to_user      │                               │
│  └─────────────────┘  │ - sent_to_accounts  │                               │
│                       └─────────────────────┘                               │
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐           │
│  │    email_retry_queue        │  │   pdf_generation_queue      │           │
│  │ - create_user_id            │  │ - create_user_id            │           │
│  │ - email_type                │  │ - incident_id               │           │
│  │ - status (pending/failed/   │  │ - status (pending/failed/   │           │
│  │   completed/abandoned)      │  │   completed/abandoned)      │           │
│  │ - attempt_count             │  │ - attempt_count             │           │
│  │ - next_retry_at             │  │ - next_retry_at             │           │
│  │ - error_history (JSONB)     │  │ - error_history (JSONB)     │           │
│  └─────────────────────────────┘  └─────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Table Details

#### user_signup
| Column | Type | Description |
|--------|------|-------------|
| `create_user_id` | TEXT (PK) | UUID from auth system |
| `name`, `surname` | TEXT | User name |
| `email`, `mobile` | TEXT | Contact details |
| `street_address`, `town`, `postcode`, `country` | TEXT | Address |
| `date_of_birth` | DATE | DOB |
| `driving_license_number` | TEXT | License number |
| `car_registration_number` | TEXT | Vehicle reg |
| `vehicle_make`, `vehicle_model`, `vehicle_colour` | TEXT | Vehicle info |
| `insurance_company`, `policy_number` | TEXT | Insurance |
| `subscription_end_date` | TIMESTAMPTZ | Subscription expiry |

#### incident_reports
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Incident ID |
| `auth_user_id`, `create_user_id`, `user_id` | TEXT | User references |
| `accident_date`, `accident_time` | TEXT | When |
| `location`, `what3words`, `nearest_landmark` | TEXT | Where |
| `weather_*` | BOOLEAN (12 cols) | Weather conditions |
| `road_condition_*` | BOOLEAN (6 cols) | Road surface |
| `road_type_*` | BOOLEAN (7 cols) | Road type |
| `visibility_*` | BOOLEAN (9 cols) | Visibility |
| `special_condition_*` | BOOLEAN (12 cols) | Special conditions |
| `impact_point_*` | BOOLEAN (11 cols) | Vehicle damage |
| `medical_symptom_*` | BOOLEAN (12 cols) | Medical symptoms |
| `voice_transcription` | TEXT | AI transcription (Page 13) |
| `ai_summary` | TEXT | AI analysis (Pages 14-15) |
| `closing_statement` | TEXT | AI closing (Page 16) |
| `declaration_*` | Various | Declaration consent fields |
| `pdf_sent_at` | TIMESTAMPTZ | When PDF was sent |
| `pdf_send_in_progress` | BOOLEAN | Lock for duplicate prevention |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

#### completed_incident_forms
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Form ID |
| `create_user_id` | TEXT (FK) | User reference |
| `incident_id` | UUID (FK) | Incident reference |
| `form_data` | JSON | Complete form snapshot |
| `pdf_base64` | TEXT | PDF data (truncated to 1MB) |
| `pdf_url` | TEXT | Signed URL |
| `pdf_storage_path` | TEXT | Storage path for URL regeneration |
| `sent_to_user`, `sent_to_accounts` | BOOLEAN | Delivery status |
| `email_status` | JSON | Detailed email result |

---

## 6. External Integrations

### 6.1 Supabase

**Usage:** Database, Authentication, Storage, Realtime

**Connection:**
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Storage Buckets:**
- `user-documents` - User uploaded images
- `generated_reports` - Generated PDFs
- `incident-images-secure` - Legacy image storage

### 6.2 OpenAI

**Usage:** Audio transcription (Whisper), Report analysis (GPT-4o)

**Endpoints Used:**
- `POST /v1/audio/transcriptions` - Whisper transcription
- `POST /v1/chat/completions` - GPT-4o analysis

### 6.3 DVLA

**Usage:** UK vehicle registration lookup

**Endpoint:** `POST /vehicle-enquiry/v1/vehicles`

**Data Retrieved:**
- Vehicle make, model, colour
- MOT status and expiry
- Tax status and expiry
- Engine size, fuel type

### 6.4 What3Words

**Usage:** Precise location identification

**Integration:** Frontend map integration + location lookup

### 6.5 Resend

**Usage:** Transactional email delivery

**Configuration:**
```javascript
const resend = new Resend(process.env.RESEND_API_KEY);
// From address must be verified domain
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@carcrashlawyerai.com';
```

---

## 7. PDF Generation Pipeline

### 7.1 Hybrid Architecture

The PDF generation uses a **hybrid approach** combining two technologies:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PDF GENERATION PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: FORM FILLING (pdf-lib)                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Pages 1-12: Form fields filled via adobePdfFormFillerService.js        ││
│  │  - 213 form field mappings                                              ││
│  │  - Witness pages appended dynamically                                   ││
│  │  - Other vehicle pages appended dynamically                             ││
│  │  - DVLA data integrated                                                 ││
│  │                                                                          ││
│  │  Pages 17-18: Declaration + Emergency Audio from template               ││
│  │  - Declaration consent fields (5 checkboxes)                            ││
│  │  - Emergency audio transcription (text only, no URLs)                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                         │                                    │
│                                         ▼                                    │
│  PHASE 2: HTML RENDERING (Puppeteer)                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Pages 13-16: AI-generated content rendered from HTML templates         ││
│  │  - Page 13: AI Summary & Transcription                                  ││
│  │  - Page 14: Full Conversation Transcript                                ││
│  │  - Page 15: DVLA Reports                                                ││
│  │  - Page 16: Additional Information                                      ││
│  │                                                                          ││
│  │  Browser recycling after 8 pages (memory management)                    ││
│  │  Retry logic with browser recreation on crash                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                         │                                    │
│                                         ▼                                    │
│  PHASE 3: MERGING (pdf-lib)                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Final PDF assembled using PDFDocument.copyPages()                      ││
│  │  - Pages 1-12 (form filled)                                             ││
│  │  - Pages 13-16 (HTML rendered)                                          ││
│  │  - Pages 17-18 (declaration + emergency audio)                          ││
│  │  - Dynamic witness/vehicle pages                                        ││
│  │                                                                          ││
│  │  ⚠️  Compression DISABLED (corrupts XRef table on Railway)             ││
│  │  ⚠️  form.flatten() DISABLED (causes XRef errors)                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Performance Benchmarks (Railway Production)

| Metric | Value |
|--------|-------|
| Browser launch (cold start) | ~10 seconds |
| Page 13 (AI Summary) | 84.69 KB, ~3 seconds |
| Page 14 (Transcript) | 48.94 KB, ~2 seconds |
| Page 15 (DVLA Reports) | 29.38 KB, ~2 seconds |
| Page 16 (Additional) | 67.86 KB, ~2 seconds |
| Total 4 AI pages | 230.88 KB, ~13 seconds |
| Full PDF (20 pages) | ~2.84 MB |

### 7.3 Trigger Points

PDF generation is triggered by:

1. **Declaration Submission** (`POST /api/incident-form/declaration`)
   - Primary trigger after user completes legal declaration
   - Generates full PDF and sends via email

2. **Manual Regeneration** (`POST /api/pdf/generate`)
   - Admin endpoint for regeneration
   - Requires `create_user_id` parameter

3. **Queue Retry** (automatic)
   - PDF queue service retries failed generations
   - Spread over 24 hours with exponential backoff

---

## 8. Email Delivery System

### 8.1 Email Types

| Type | Template | Trigger | Attachment |
|------|----------|---------|------------|
| **PDF Delivery** | Inline | Declaration submission | Yes (PDF) |
| **90-Day Notice** | `incident-90-day-notice` | Form submission | No |
| **Image Links** | `image-download-links` | Manual request | No |
| **AI Processing** | `ai-processing-notice` | AI failure | No |
| **Admin Alert** | Various | System errors | No |

### 8.2 Delivery Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMAIL DELIVERY FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PDF Generated                                                            │
│       │                                                                      │
│       ▼                                                                      │
│  2. sendEmails() called                                                      │
│       │                                                                      │
│       ├──► SUCCESS: Mark pdf_sent_at, release lock                          │
│       │                                                                      │
│       └──► FAILURE: Queue for retry                                         │
│              │                                                               │
│              ▼                                                               │
│  3. Email Retry Queue                                                        │
│       │                                                                      │
│       ├──► Attempt 1: Wait 1 minute                                         │
│       ├──► Attempt 2: Wait 5 minutes                                        │
│       ├──► Attempt 3: Wait 15 minutes                                       │
│       ├──► Attempt 4: Wait 1 hour                                           │
│       ├──► Attempt 5: Wait 4 hours                                          │
│       │                                                                      │
│       ├──► SUCCESS: Mark completed, update email_status                     │
│       │                                                                      │
│       └──► FINAL FAILURE: Mark abandoned, notify admin                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Duplicate Prevention

```javascript
// PDF Send Lock mechanism
const PDF_SEND_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Lock acquisition
await tryAcquirePdfSendLock(incidentId);

// Lock release on success/failure
await releasePdfSendLock(incidentId, reason);

// Mark sent (final)
await markPdfSent(incidentId);
```

---

## 9. Queue Systems

### 9.1 Email Retry Queue

**Table:** `email_retry_queue`

**Status Flow:**
```
pending → processing → completed
              │
              └──► failed → processing → completed
                     │
                     └──► abandoned (after max attempts)
```

**Processing:**
- Cron job or manual trigger via `/api/pdf/email-queue/process`
- Picks items where `status IN ('pending', 'failed')` and `next_retry_at <= NOW()`

### 9.2 PDF Generation Queue

**Table:** `pdf_generation_queue`

**Purpose:** Retry full PDF generation when initial attempt fails

**Triggers:**
- AI pages not rendered
- Storage upload failure
- Email + storage both failed

---

## 10. Security Architecture

### 10.1 Authentication

- **Provider:** Supabase Auth
- **Method:** JWT tokens
- **Session:** Server-side validation

### 10.2 Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Users can only access their own data
CREATE POLICY "Users can view their own records"
  ON table_name
  FOR SELECT
  USING (auth.uid()::text = create_user_id);
```

### 10.3 Rate Limiting

**File:** `src/middleware/rateLimit.js`

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 req | 15 min |
| Auth | 5 req | 15 min |
| PDF generation | 10 req | 1 hour |

### 10.4 CORS Configuration

```javascript
const corsOptions = {
  origin: [
    'https://carcrashlawyerai.co.uk',
    'https://www.carcrashlawyerai.co.uk',
    'http://localhost:3000'
  ],
  credentials: true
};
```

### 10.5 Helmet Security Headers

Standard Helmet configuration with CSP customisation for external services.

---

## 11. Legacy Code Reference

### 11.1 Typeform Integration (DEPRECATED)

**Status:** ❌ No longer used - application uses in-house HTML forms

**Files to ignore:**
- `src/services/imageProcessor.js` lines 289-348 (processTypeformImage)
- `src/services/imageProcessorV2.js` lines 540-758 (Typeform processing)
- `src/middleware/webhookAuth.js` lines 86-115 (verifyTypeformSignature)
- `src/middleware/security.js` lines 22-24, 51, 142-159 (Typeform CORS/signature)
- `src/config/constants.js` lines 65-75 (TYPEFORM config)

**Note:** Typeform webhooks removed - see `src/routes/webhook.routes.js` comment.

### 11.2 Zapier Integration (DEPRECATED)

**Status:** ❌ No longer used

**Files to ignore:**
- `src/middleware/webhookAuth.js` lines 117-154 (verifyZapierSignature)
- `src/config/index.js` lines 80-85 (webhook.apiKey with Zapier fallback)

### 11.3 Legacy Tables (DEPRECATED)

**incident_images table:**
- Status: Still queried for backwards compatibility
- Replacement: `user_documents` table
- Reference: `lib/dataFetcher.js` lines 78-90

### 11.4 Adobe SDK References (NEVER USED)

**The filename `adobePdfFormFillerService.js` is misleading:**
- The service uses **pdf-lib** library
- Adobe PDF Services SDK was configured but never implemented
- `src/config/index.js` contains Adobe config (unused)

### 11.5 Legacy Route Redirects

**File:** `src/routes/index.js` lines 348-445

Legacy endpoints that redirect to new locations:
- `/s` → Payment success redirect (was for Typeform)
- `/location` → `/api/location/legacy`
- `/pdf/*` → `/api/pdf/*`

---

## 12. Deployment Configuration

### 12.1 Railway Configuration

**File:** `railway.json`
```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**File:** `nixpacks.toml`
```toml
[phases.setup]
aptPkgs = [
  'fonts-liberation',
  'libasound2t64',  # Ubuntu 24.04 name
  'libatk-bridge2.0-0',
  'libatk1.0-0',
  'libgbm1',
  'libgtk-3-0',
  'libnspr4',
  'libnss3',
  'libx11-xcb1',
  # ... additional Chromium dependencies
]

[variables]
PUPPETEER_SKIP_DOWNLOAD = "false"
NODE_ENV = "production"
```

### 12.2 Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Default: 3000 |
| `NODE_ENV` | Yes | production/development |
| `SUPABASE_URL` | Yes | Database URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key |
| `SUPABASE_ANON_KEY` | Yes | Public key |
| `OPENAI_API_KEY` | Yes | AI services |
| `DVLA_API_KEY` | Yes | Vehicle lookup |
| `RESEND_API_KEY` | Yes | Email delivery |
| `RESEND_FROM_EMAIL` | Yes | Verified sender |
| `APP_URL` | No | Public URL |
| `EMAIL_ENABLED` | No | Enable/disable emails |
| `ACCOUNTS_EMAIL` | No | Accounts recipient |
| `ADMIN_EMAIL` | No | Admin notifications |

---

## 13. File Reference Map

### 13.1 Core Application

| File | Lines | Purpose |
|------|-------|---------|
| `src/app.js` | ~700 | Express application |
| `index.js` | ~50 | Server entry point |
| `src/config/index.js` | 123 | Configuration |

### 13.2 Controllers

| File | Lines | Purpose |
|------|-------|---------|
| `src/controllers/pdf.controller.js` | 1,231 | PDF generation & delivery |
| `src/controllers/incidentForm.controller.js` | ~800 | Form submission |
| `src/controllers/ai.controller.js` | ~500 | AI processing |
| `src/controllers/auth.controller.js` | ~300 | Authentication |

### 13.3 Services

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/adobePdfFormFillerService.js` | 1,316 | PDF form filling |
| `src/services/htmlToPdfConverter.js` | 448 | HTML to PDF |
| `lib/emailService.js` | 1,117 | Email delivery |
| `src/services/emailRetryService.js` | 720 | Email queue |
| `src/services/pdfQueueService.js` | 825 | PDF queue |
| `src/services/gdprService.js` | ~800 | GDPR compliance |
| `lib/dataFetcher.js` | 469 | Data aggregation |

### 13.4 Middleware

| File | Purpose |
|------|---------|
| `src/middleware/auth.js` | JWT validation |
| `src/middleware/rateLimit.js` | Rate limiting |
| `src/middleware/security.js` | Security headers |
| `src/middleware/validation.js` | Request validation |
| `src/middleware/webhookAuth.js` | Webhook signatures |

### 13.5 Documentation

| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | This document |
| `docs/PUPPETEER_RAILWAY_TROUBLESHOOTING.md` | Puppeteer fix guide |

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-03 | 1.0.0 | Initial comprehensive audit |

---

*This document serves as the definitive technical reference for the Car Crash Lawyer AI application. It should be updated whenever significant architectural changes are made.*
