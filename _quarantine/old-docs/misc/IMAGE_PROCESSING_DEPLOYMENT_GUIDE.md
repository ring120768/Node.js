# Image Processing System - Complete Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [What Was Built](#what-was-built)
3. [Root Cause Analysis](#root-cause-analysis)
4. [Deployment Steps](#deployment-steps)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [API Documentation](#api-documentation)

---

## Overview

This guide covers the complete deployment of the enhanced image processing system for your Typeform to Supabase integration. The system now includes:

- **Comprehensive status tracking** (pending, processing, completed, failed)
- **Automatic retry mechanism** for failed uploads
- **User-facing API** to access documents
- **Monitoring tools** to track system health
- **Detailed error logging** for diagnostics

---

## What Was Built

### 1. Database Schema

**File:** `supabase/sql/user_documents_schema.sql`

New `user_documents` table with:
- Status tracking (pending, processing, completed, failed)
- Retry mechanism (retry_count, max_retries, next_retry_at)
- File metadata (size, type, dimensions)
- Error logging (error_message, error_code, error_details)
- GDPR compliance (retention_until, soft delete)
- Performance indexes
- Helper functions

### 2. Enhanced Image Processor

**File:** `src/services/imageProcessorV2.js`

Features:
- Integrates with user_documents table
- Comprehensive status tracking
- Error categorization (AUTH_ERROR, TIMEOUT, FILE_TOO_LARGE, etc.)
- Better logging and monitoring
- Backwards compatible with existing code

### 3. Retry Service

**File:** `src/services/imageRetryService.js`

Features:
- Finds failed documents needing retry
- Exponential backoff retry strategy
- Marks permanently failed documents after max retries
- Comprehensive statistics

### 4. User Documents API

**Files:**
- `src/controllers/userDocuments.controller.js`
- `src/routes/userDocuments.routes.js`

Endpoints:
- `GET /api/user-documents` - List user's documents
- `GET /api/user-documents/stats` - Get statistics
- `GET /api/user-documents/:id` - Get specific document
- `GET /api/user-documents/:id/download` - Download document
- `POST /api/user-documents/:id/refresh-url` - Refresh signed URL
- `DELETE /api/user-documents/:id` - Delete document (soft delete)

### 5. Monitoring & Retry Scripts

**Files:**
- `scripts/monitor-image-processing.js` - Monitor system health
- `scripts/retry-failed-images.js` - Retry failed uploads

Can be run manually or as cron jobs.

---

## Root Cause Analysis

### Why Were 3 Out of 5 Images Failing?

Based on analysis of your current implementation, the failures were caused by:

1. **Silent Failures**: Image record creation was non-critical and failed silently (imageProcessor.js:264-269)
2. **No Status Tracking**: Impossible to identify which images failed
3. **No Retry Mechanism**: Failed images were abandoned
4. **Limited Visibility**: Errors logged as warnings, not tracked in database
5. **Non-Critical Design**: Image processing failures didn't fail the webhook, but also didn't get retried

### How This Solution Fixes It

1. **Explicit Status Tracking**: Every image has a status (pending → processing → completed/failed)
2. **Error Recording**: All failures logged in database with error codes
3. **Automatic Retry**: Failed images retry with exponential backoff
4. **Monitoring**: Scripts to identify and diagnose failures
5. **User Visibility**: API endpoints to check document status

---

## Deployment Steps

### Step 1: Database Setup

1. **Run the SQL schema** to create the `user_documents` table:

```bash
# Option A: Via Supabase Dashboard
# Go to SQL Editor and paste contents of:
# supabase/sql/user_documents_schema.sql

# Option B: Via Supabase CLI
supabase db push
```

2. **Verify table creation**:

```sql
SELECT * FROM user_documents LIMIT 1;
SELECT * FROM get_user_document_stats('test-user-id');
```

3. **Set up Supabase Storage buckets** (if not already created):

```sql
-- In Supabase Dashboard > Storage
-- Create buckets:
-- - user-documents
-- - incident-images
```

4. **Configure storage policies** (for RLS):

The schema file includes RLS policies, but verify they're enabled in Supabase Dashboard > Storage > Policies.

### Step 2: Install Dependencies

No new dependencies required! All use existing packages:
- `axios` - Already installed
- `@supabase/supabase-js` - Already installed
- `crypto` - Node.js built-in

### Step 3: Update Application Code

#### Option A: Gradual Migration (Recommended)

Keep existing image processor and gradually migrate to V2:

1. **Test V2 with new submissions**:

```javascript
// In src/app.js, add both processors
const ImageProcessor = require('./services/imageProcessor');
const ImageProcessorV2 = require('./services/imageProcessorV2');

app.locals.imageProcessor = new ImageProcessor(supabase);
app.locals.imageProcessorV2 = new ImageProcessorV2(supabase); // Add V2
```

2. **Update webhook controller** to use V2 for new submissions:

```javascript
// In src/controllers/webhook.controller.js
// Around line 600, replace:
const processedImages = await imageProcessor.processMultipleImages(
  validImageUrls,
  authUserId || token
);

// With:
const imageProcessorV2 = req.app.locals.imageProcessorV2 || imageProcessor;
const processedImages = await imageProcessorV2.processMultipleImages(
  validImageUrls,
  authUserId || token,
  {
    documentCategory: 'user_signup',
    sourceId: formResponse.form_id
  }
);
```

#### Option B: Full Migration

Replace imageProcessor entirely:

```javascript
// In src/app.js, replace:
const ImageProcessor = require('./services/imageProcessor');
// With:
const ImageProcessorV2 = require('./services/imageProcessorV2');

app.locals.imageProcessor = new ImageProcessorV2(supabase);
```

### Step 4: Add API Routes

Add user documents routes to your Express app:

```javascript
// In src/app.js or src/routes/index.js
const userDocumentsRoutes = require('./routes/userDocuments.routes');

app.use('/api/user-documents', userDocumentsRoutes);
```

### Step 5: Set Up Cron Jobs (Optional but Recommended)

Add cron jobs to automatically retry failed images:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Retry failed images every 30 minutes
*/30 * * * * cd /path/to/Node.js && node scripts/retry-failed-images.js >> logs/retry.log 2>&1

# Monitor system health every hour
0 * * * * cd /path/to/Node.js && node scripts/monitor-image-processing.js >> logs/monitor.log 2>&1
```

### Step 6: Test the System

See [Testing](#testing) section below.

---

## Configuration

### Environment Variables

No new environment variables required! The system uses existing configuration:

```env
# Already configured
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Constants

The system uses existing constants from `src/config/constants.js`:

```javascript
STORAGE: {
  IMAGE_DOWNLOAD_RETRIES: 3,       // Number of retry attempts
  IMAGE_DOWNLOAD_RETRY_DELAY: 2000, // Initial delay (exponential backoff)
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB max file size
}
```

You can adjust these in `src/config/constants.js` if needed.

---

## Testing

### 1. Database Testing

```bash
# Test database functions
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Test document creation
supabase.from('user_documents').insert({
  create_user_id: 'test-user',
  document_type: 'test_image',
  status: 'pending',
  original_url: 'https://example.com/test.jpg'
}).then(r => console.log('Test insert:', r.error ? r.error : 'Success'));
"
```

### 2. Image Processor Testing

```bash
# Create a test script
cat > scripts/test-image-processor.js << 'EOF'
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ImageProcessorV2 = require('../src/services/imageProcessorV2');

async function test() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const processor = new ImageProcessorV2(supabase);

  // Test with a public image URL
  const result = await processor.processTypeformImage(
    'https://picsum.photos/200/300', // Test image URL
    'test-user-123',
    'test_image',
    { documentCategory: 'user_signup' }
  );

  console.log('Test result:', result);
}

test().catch(console.error);
EOF

# Run the test
node scripts/test-image-processor.js
```

### 3. API Testing

```bash
# List documents for a user
curl http://localhost:5000/api/user-documents?user_id=test-user-123

# Get stats
curl http://localhost:5000/api/user-documents/stats?user_id=test-user-123

# Get specific document
curl http://localhost:5000/api/user-documents/{document-id}?user_id=test-user-123
```

### 4. Retry Service Testing

```bash
# Dry run - see what would be retried
node scripts/retry-failed-images.js --dry-run

# Actually retry (limit to 5 for testing)
node scripts/retry-failed-images.js --limit=5
```

### 5. Monitoring Testing

```bash
# Basic monitoring
node scripts/monitor-image-processing.js

# Detailed monitoring
node scripts/monitor-image-processing.js --detailed --show-failed

# Monitor specific user
node scripts/monitor-image-processing.js --user=test-user-123
```

### 6. End-to-End Testing

Submit a Typeform with images and verify:

1. **Check webhook logs** for image processing
2. **Check user_documents table** for entries:
   ```sql
   SELECT * FROM user_documents
   WHERE create_user_id = 'your-user-id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. **Check status progression**: pending → processing → completed
4. **Verify Supabase Storage** has the files
5. **Test API endpoints** to retrieve documents

---

## Monitoring & Maintenance

### Daily Tasks

1. **Check monitoring script output**:
   ```bash
   node scripts/monitor-image-processing.js
   ```

2. **Review failure rate**:
   - Acceptable: < 5% failure rate
   - Warning: 5-20% failure rate
   - Critical: > 20% failure rate

### Weekly Tasks

1. **Review error patterns**:
   ```bash
   node scripts/monitor-image-processing.js --detailed --show-failed
   ```

2. **Manually retry permanently failed images** (if needed):
   ```sql
   -- Reset retry count for specific failed images
   UPDATE user_documents
   SET retry_count = 0,
       next_retry_at = NOW(),
       error_message = NULL
   WHERE status = 'failed'
     AND retry_count >= max_retries
     AND id IN ('uuid1', 'uuid2');
   ```

### Monthly Tasks

1. **Review statistics**:
   ```sql
   SELECT
     status,
     COUNT(*) as count,
     ROUND(AVG(file_size)/1024/1024, 2) as avg_size_mb,
     ROUND(AVG(processing_duration_ms), 0) as avg_duration_ms
   FROM user_documents
   WHERE created_at >= NOW() - INTERVAL '30 days'
   GROUP BY status;
   ```

2. **Check storage usage**:
   ```sql
   SELECT
     storage_bucket,
     COUNT(*) as files,
     SUM(file_size)/1024/1024/1024 as total_gb
   FROM user_documents
   WHERE status = 'completed'
   GROUP BY storage_bucket;
   ```

### Automated Alerts

Set up alerts for:
- Failure rate > 20%
- More than 50 documents in retry queue
- Documents stuck in "processing" for > 1 hour

Example alert script:

```javascript
// scripts/check-alerts.js
const { createClient } = require('@supabase/supabase-js');

async function checkAlerts() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase
    .from('user_documents')
    .select('status')
    .is('deleted_at', null);

  const total = data.length;
  const failed = data.filter(d => d.status === 'failed').length;
  const failureRate = (failed / total) * 100;

  if (failureRate > 20) {
    console.error(`ALERT: High failure rate: ${failureRate.toFixed(2)}%`);
    // Send email/Slack notification here
  }
}

checkAlerts();
```

---

## Troubleshooting

### Problem: Images Still Failing

**Diagnosis:**
```bash
node scripts/monitor-image-processing.js --show-failed
```

**Common Causes:**

1. **Typeform URL Expiration**
   - Error Code: `AUTH_ERROR` or `NOT_FOUND`
   - Solution: Typeform URLs may expire. This is why original URLs are kept in `original_url` field.

2. **File Too Large**
   - Error Code: `FILE_TOO_LARGE`
   - Solution: Increase `MAX_FILE_SIZE` in `src/config/constants.js` or reject large files in Typeform

3. **Network Timeout**
   - Error Code: `TIMEOUT`
   - Solution: Increase timeout in imageProcessor or check network connectivity

4. **Supabase Storage Permissions**
   - Error Code: `STORAGE_UPLOAD_ERROR`
   - Solution: Check bucket permissions in Supabase Dashboard

### Problem: Retry Not Working

**Check:**
```sql
SELECT * FROM user_documents
WHERE status = 'failed'
  AND retry_count < max_retries
ORDER BY next_retry_at;
```

**Common Issues:**
- `next_retry_at` is in the future (normal - wait for scheduled time)
- `retry_count >= max_retries` (permanently failed)
- Cron job not running (check crontab)

### Problem: API Not Returning Documents

**Check:**
1. Routes registered in app.js:
   ```javascript
   app.use('/api/user-documents', require('./routes/userDocuments.routes'));
   ```

2. Database has data:
   ```sql
   SELECT * FROM user_documents WHERE create_user_id = 'test-user';
   ```

3. RLS policies enabled:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_documents';
   ```

### Problem: High Failure Rate

**Steps:**

1. **Identify error pattern**:
   ```bash
   node scripts/monitor-image-processing.js --detailed
   ```

2. **Check specific errors**:
   ```sql
   SELECT error_code, error_message, COUNT(*)
   FROM user_documents
   WHERE status = 'failed'
   GROUP BY error_code, error_message
   ORDER BY COUNT(*) DESC;
   ```

3. **Fix root cause** based on error code (see above)

4. **Manually retry** after fix:
   ```bash
   node scripts/retry-failed-images.js --limit=50
   ```

---

## API Documentation

### List User Documents

**Endpoint:** `GET /api/user-documents`

**Query Parameters:**
- `user_id` (required for testing) - User ID
- `status` (optional) - Filter by status (pending, processing, completed, failed)
- `document_type` (optional) - Filter by type
- `document_category` (optional) - Filter by category
- `limit` (optional, default: 100) - Results per page
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "create_user_id": "user123",
        "document_type": "driving_license",
        "status": "completed",
        "storage_path": "user-documents/user123/...",
        "signed_url": "https://...",
        "file_size": 1024000,
        "created_at": "2025-01-15T10:00:00Z",
        ...
      }
    ],
    "pagination": {
      "total": 10,
      "limit": 100,
      "offset": 0,
      "has_more": false
    }
  }
}
```

### Get Document Stats

**Endpoint:** `GET /api/user-documents/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "total_documents": 10,
    "pending_documents": 0,
    "processing_documents": 0,
    "completed_documents": 8,
    "failed_documents": 2,
    "total_size_bytes": 5242880,
    "document_types": {
      "driving_license": 1,
      "vehicle_front": 1,
      "vehicle_back": 1,
      ...
    }
  }
}
```

### Get Specific Document

**Endpoint:** `GET /api/user-documents/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "create_user_id": "user123",
    "document_type": "driving_license",
    "status": "completed",
    "storage_path": "user-documents/user123/...",
    "signed_url": "https://...",
    "file_size": 1024000,
    "mime_type": "image/jpeg",
    "processing_duration_ms": 2500,
    "created_at": "2025-01-15T10:00:00Z",
    "metadata": { ... }
  }
}
```

### Download Document

**Endpoint:** `GET /api/user-documents/:id/download`

**Response:** Redirects to signed Supabase Storage URL (5-minute expiry)

### Refresh Signed URL

**Endpoint:** `POST /api/user-documents/:id/refresh-url`

**Body:**
```json
{
  "expiry_seconds": 3600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signed_url": "https://...",
    "expires_in": 3600,
    "document_id": "uuid"
  }
}
```

### Delete Document

**Endpoint:** `DELETE /api/user-documents/:id`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "document_id": "uuid"
}
```

---

## Summary

This enhanced image processing system provides:

✅ **Complete visibility** into image processing status
✅ **Automatic retry** for failed uploads
✅ **User-facing API** to access documents
✅ **Monitoring tools** for system health
✅ **Detailed error tracking** for diagnostics

**Next Steps:**

1. Deploy database schema
2. Test with a sample submission
3. Set up cron jobs for automatic retries
4. Monitor the system for 24-48 hours
5. Review failure rates and adjust configuration

**Support:**

If you encounter issues during deployment, check:
1. Supabase Dashboard > Logs
2. Application logs: `tail -f logs/*.log`
3. Monitoring script: `node scripts/monitor-image-processing.js --show-failed`

Good luck with the deployment! 🚀
