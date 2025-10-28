# WebSocket Real-Time Notifications System

**Version:** 1.0.0
**Last Updated:** 2025-10-28
**Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Message Types](#message-types)
6. [Integration Guide](#integration-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Overview

The WebSocket Real-Time Notifications System provides live updates to the dashboard for:
- **Image Processing**: Real-time status updates as images are uploaded and processed
- **PDF Generation**: Notifications when incident reports are generated
- **Audio Transcription**: Updates during transcription processing
- **General Status Updates**: Any system-wide notifications

### Key Features

✅ **Automatic Reconnection** - Exponential backoff reconnection strategy
✅ **User Session Management** - Multiple tabs/devices per user supported
✅ **Health Monitoring** - Heartbeat mechanism keeps connections alive
✅ **Toast Notifications** - Beautiful, non-intrusive UI notifications
✅ **Event-Driven Architecture** - Easy to extend with new event types
✅ **Connection State Tracking** - Visual indicators for connection status

---

## Architecture

### System Flow

```
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│                 │          │                 │          │                 │
│  Service Layer  │─────────▶│  WebSocket      │─────────▶│  Frontend       │
│  (Image, PDF,   │  Emit    │  Server         │  Broadcast│  Dashboard      │
│   Transcription)│  Events  │  (index.js)     │  Messages │  (Browser)      │
│                 │          │                 │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
       │                             │                             │
       │                             │                             │
       └─────────────────────────────┴─────────────────────────────┘
                    Supabase Database (status tracking)
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **WebSocket Server** | `src/websocket/index.js` | Manages connections, broadcasts messages |
| **Constants** | `src/config/constants.js` | Message types and status enums |
| **ImageProcessorV2** | `src/services/imageProcessorV2.js` | Emits image processing updates |
| **PDF Generator** | `lib/pdfGenerator.js` | Emits PDF generation updates |
| **Frontend Client** | `public/js/websocket-client.js` | Browser WebSocket client |
| **Toast System** | `public/js/toast-notifications.js` | UI notifications |
| **Dashboard Init** | `public/js/dashboard-websocket-init.js` | Auto-initialization |

---

## Backend Implementation

### 1. WebSocket Server (`src/websocket/index.js`)

#### Initialization

The WebSocket server is initialized in `index.js` after HTTP server creation:

```javascript
const websocketModule = require('./src/websocket');
const wss = websocketModule.initializeWebSocket(server);
app.locals.websocketServer = wss;
```

#### Connection Management

- **User Sessions**: Tracks connections by `userId` (supports multiple devices)
- **Queue Sessions**: Tracks connections by `queueId` (for specific tasks)
- **Heartbeat**: Pings every 30 seconds to keep connections alive
- **Cleanup**: Removes stale connections every 60 seconds

#### Broadcasting Functions

```javascript
// Broadcast to specific user (all their connections)
broadcastToUser(userId, data);

// Broadcast image processing update
broadcastImageProcessingUpdate(userId, {
  type: 'image_processed',
  documentId: 'uuid',
  documentType: 'driving_license_picture',
  status: 'completed',
  signedUrl: 'https://...'
});

// Broadcast PDF generation update
broadcastPDFGenerationUpdate(userId, {
  type: 'pdf_generated',
  reportId: 'uuid',
  pdfUrl: 'https://...',
  status: 'completed'
});

// Broadcast transcription update
broadcastTranscriptionUpdate(queueId, {
  type: 'transcription_complete',
  transcriptionId: 'uuid',
  status: 'completed'
});
```

### 2. Service Integration

#### Image Processing (`src/services/imageProcessorV2.js`)

WebSocket notifications are emitted at key points in the image processing pipeline:

```javascript
class ImageProcessorV2 {
  constructor(supabaseClient, websocketService = null) {
    this.supabase = supabaseClient;
    this.websocketService = websocketService;
  }

  async processTypeformImage(typeformUrl, userId, imageType, options = {}) {
    // 1. Create document record
    const documentRecord = await this.createDocumentRecord({...});

    // Emit: Processing started
    this.emitWebSocketUpdate(userId, 'image_processing_started', {
      documentId: documentRecord.id,
      documentType: imageType,
      status: 'pending'
    });

    try {
      // 2. Download from Typeform
      const { buffer, contentType, fileName, fileSize } = await this.downloadFromUrl(...);

      // 3. Upload to Supabase Storage
      const storagePath = await this.uploadToSupabase(...);

      // 4. Mark as completed
      await this.updateDocumentRecord(documentId, { status: 'completed', ... });

      // Emit: Processing completed
      this.emitWebSocketUpdate(userId, 'image_processed', {
        documentId,
        documentType: imageType,
        status: 'completed',
        signedUrl
      });

    } catch (error) {
      // Emit: Processing failed
      this.emitWebSocketUpdate(userId, 'image_processing_failed', {
        documentId,
        documentType: imageType,
        status: 'failed',
        error: error.message
      });
    }
  }

  emitWebSocketUpdate(userId, type, data) {
    if (this.websocketService?.broadcastImageProcessingUpdate) {
      this.websocketService.broadcastImageProcessingUpdate(userId, { type, ...data });
    }
  }
}
```

#### PDF Generation (Future Integration)

To integrate WebSocket into PDF generation:

```javascript
// In lib/pdfGenerator.js or pdf.controller.js

const websocketModule = require('../src/websocket');

async function generatePDF(userId, data) {
  try {
    // Emit: PDF generation started
    websocketModule.broadcastPDFGenerationUpdate(userId, {
      type: 'pdf_generation_started',
      status: 'generating'
    });

    // Generate PDF
    const pdfBuffer = await generatePDFLogic(data);

    // Upload to Supabase Storage
    const { data: uploadData } = await supabase.storage
      .from('completed-reports')
      .upload(fileName, pdfBuffer);

    // Emit: PDF generation completed
    websocketModule.broadcastPDFGenerationUpdate(userId, {
      type: 'pdf_generated',
      reportId: uploadData.id,
      pdfUrl: uploadData.publicUrl,
      status: 'completed'
    });

  } catch (error) {
    // Emit: PDF generation failed
    websocketModule.broadcastPDFGenerationUpdate(userId, {
      type: 'pdf_generation_failed',
      status: 'failed',
      error: error.message
    });
  }
}
```

### 3. Message Types (`src/config/constants.js`)

All WebSocket message types are defined in constants:

```javascript
WS_MESSAGE_TYPES: {
  // Connection management
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',

  // Transcription updates
  TRANSCRIPTION_QUEUED: 'transcription_queued',
  TRANSCRIPTION_PROCESSING: 'transcription_processing',
  TRANSCRIPTION_PROGRESS: 'transcription_progress',
  TRANSCRIPTION_COMPLETE: 'transcription_complete',
  TRANSCRIPTION_FAILED: 'transcription_failed',

  // Image processing updates
  IMAGE_PROCESSING_STARTED: 'image_processing_started',
  IMAGE_PROCESSING_PROGRESS: 'image_processing_progress',
  IMAGE_PROCESSED: 'image_processed',
  IMAGE_PROCESSING_FAILED: 'image_processing_failed',

  // PDF generation updates
  PDF_GENERATION_STARTED: 'pdf_generation_started',
  PDF_GENERATION_PROGRESS: 'pdf_generation_progress',
  PDF_GENERATED: 'pdf_generated',
  PDF_GENERATION_FAILED: 'pdf_generation_failed',

  // Generic updates
  REALTIME_UPDATE: 'realtime_update',
  STATUS_UPDATE: 'status_update'
}
```

---

## Frontend Implementation

### 1. WebSocket Client (`public/js/websocket-client.js`)

The frontend WebSocket client handles:
- Automatic connection and reconnection
- Message routing and event handling
- Toast notification display
- Connection state management

#### Basic Usage

```javascript
// Create client instance
const wsClient = new DashboardWebSocketClient({
  debug: true, // Enable debug logging
  reconnectDelay: 1000, // Start reconnect delay (ms)
  maxReconnectDelay: 30000, // Max reconnect delay (ms)
  heartbeatInterval: 30000 // Heartbeat interval (ms)
});

// Connect with user ID
wsClient.connect('user-uuid-here');

// Listen for events
wsClient.on('image_processed', (data) => {
  console.log('Image processed:', data);
  // Refresh dashboard
  updateCounts();
});

wsClient.on('pdf_generated', (data) => {
  console.log('PDF generated:', data);
  // Show download button
  showDownloadButton(data.pdfUrl);
});

// Disconnect when done
wsClient.disconnect();
```

#### Available Events

```javascript
// Connection events
wsClient.on('connected', () => { /* ... */ });
wsClient.on('disconnected', (event) => { /* ... */ });
wsClient.on('error', (error) => { /* ... */ });

// Image processing events
wsClient.on('image_processed', (data) => { /* ... */ });
wsClient.on('image_processing_failed', (data) => { /* ... */ });

// PDF generation events
wsClient.on('pdf_generated', (data) => { /* ... */ });
wsClient.on('pdf_generation_failed', (data) => { /* ... */ });

// Transcription events
wsClient.on('transcription_complete', (data) => { /* ... */ });
wsClient.on('transcription_failed', (data) => { /* ... */ });

// Generic status updates
wsClient.on('status_update', (data) => { /* ... */ });

// Raw message handler (catches all messages)
wsClient.on('message', (data) => { /* ... */ });
```

### 2. Toast Notifications (`public/js/toast-notifications.js`)

Beautiful, non-intrusive notifications appear in the top-right corner:

```javascript
// Show success toast
window.showToast('Image Uploaded', 'Your driving license has been processed successfully!', 'success');

// Show error toast
window.showToast('Upload Failed', 'Failed to process image. Please try again.', 'error');

// Show info toast
window.showToast('Processing', 'Your file is being processed...', 'info');

// Show warning toast
window.showToast('Large File', 'This may take a few moments...', 'warning');

// Custom duration (default 5000ms)
window.showToast('Quick Message', 'This disappears quickly', 'info', 2000);
```

### 3. Dashboard Integration (`public/js/dashboard-websocket-init.js`)

Auto-initialization script for dashboard pages:

```html
<!-- In dashboard.html -->
<head>
  <!-- Load dependencies -->
  <script src="/js/toast-notifications.js"></script>
  <script src="/js/websocket-client.js"></script>
  <script src="/js/dashboard-websocket-init.js"></script>
</head>

<body data-user-id="<%= userId %>">
  <!-- Dashboard content -->

  <script>
    // WebSocket is auto-initialized on page load
    // Access client via window.getDashboardWebSocket()

    const wsClient = window.getDashboardWebSocket();
    if (wsClient) {
      console.log('WebSocket connection state:', wsClient.getState());
    }
  </script>
</body>
```

#### Connection Status Indicator

Add a status indicator to show connection state:

```html
<!-- In navigation or header -->
<div id="ws-connection-status" style="
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  color: #6B7280;
">
  <span style="margin-right: 4px;">○</span>Offline
</div>
```

The status automatically updates:
- **● Live** (green) - Connected, real-time updates active
- **○ Offline** (gray) - Disconnected, attempting to reconnect
- **⚠ Error** (red) - Connection error

---

## Message Types

### Image Processing Messages

#### `image_processing_started`

```json
{
  "type": "image_processing_started",
  "documentId": "uuid",
  "documentType": "driving_license_picture",
  "status": "pending",
  "timestamp": "2025-10-28T12:00:00.000Z"
}
```

#### `image_processed`

```json
{
  "type": "image_processed",
  "documentId": "uuid",
  "documentType": "driving_license_picture",
  "status": "completed",
  "signedUrl": "https://supabase.co/storage/...",
  "processingDuration": 2500,
  "timestamp": "2025-10-28T12:00:02.500Z"
}
```

#### `image_processing_failed`

```json
{
  "type": "image_processing_failed",
  "documentId": "uuid",
  "documentType": "driving_license_picture",
  "status": "failed",
  "error": "Download timeout after 30 seconds",
  "timestamp": "2025-10-28T12:00:30.000Z"
}
```

### PDF Generation Messages

#### `pdf_generated`

```json
{
  "type": "pdf_generated",
  "reportId": "uuid",
  "pdfUrl": "https://supabase.co/storage/...",
  "status": "completed",
  "fileSize": 2048576,
  "timestamp": "2025-10-28T12:05:00.000Z"
}
```

#### `pdf_generation_failed`

```json
{
  "type": "pdf_generation_failed",
  "status": "failed",
  "error": "Missing required fields: incident_date",
  "timestamp": "2025-10-28T12:05:00.000Z"
}
```

### Transcription Messages

#### `transcription_complete`

```json
{
  "type": "transcription_complete",
  "transcriptionId": "uuid",
  "status": "completed",
  "duration": 120,
  "wordCount": 350,
  "timestamp": "2025-10-28T12:10:00.000Z"
}
```

---

## Integration Guide

### Step 1: Backend Integration

To add WebSocket notifications to a new service:

1. **Import WebSocket module:**

```javascript
const websocketModule = require('../websocket');
```

2. **Emit updates at key points:**

```javascript
// When processing starts
websocketModule.broadcastStatusUpdate(userId, {
  type: 'status_update',
  updateType: 'processing_started',
  resource: 'vehicle_lookup',
  status: 'processing'
});

// When processing completes
websocketModule.broadcastStatusUpdate(userId, {
  type: 'status_update',
  updateType: 'processing_complete',
  resource: 'vehicle_lookup',
  status: 'completed',
  data: { make: 'Toyota', model: 'Corolla' }
});

// When processing fails
websocketModule.broadcastStatusUpdate(userId, {
  type: 'status_update',
  updateType: 'processing_failed',
  resource: 'vehicle_lookup',
  status: 'failed',
  error: 'DVLA API timeout'
});
```

3. **Add message types to constants (if needed):**

```javascript
// src/config/constants.js
WS_MESSAGE_TYPES: {
  // ... existing types ...
  VEHICLE_LOOKUP_COMPLETE: 'vehicle_lookup_complete'
}
```

### Step 2: Frontend Integration

1. **Ensure scripts are loaded:**

```html
<script src="/js/toast-notifications.js"></script>
<script src="/js/websocket-client.js"></script>
<script src="/js/dashboard-websocket-init.js"></script>
```

2. **Listen for custom events:**

```javascript
const wsClient = window.getDashboardWebSocket();
wsClient.on('status_update', (data) => {
  if (data.updateType === 'vehicle_lookup_complete') {
    console.log('Vehicle lookup complete:', data.data);
    updateVehicleInfo(data.data);
  }
});
```

3. **Manually trigger UI updates:**

```javascript
wsClient.on('pdf_generated', (data) => {
  // Show download button
  const downloadBtn = document.getElementById('download-report-btn');
  downloadBtn.style.display = 'block';
  downloadBtn.href = data.pdfUrl;
});
```

---

## Testing

### Manual Testing

1. **Test Connection:**

```javascript
// Open browser console on dashboard
const wsClient = window.getDashboardWebSocket();
console.log('Connection state:', wsClient.getState());
```

2. **Test Image Upload:**

Upload an image via Typeform and watch for notifications:
- "Image processing started" toast
- "Image processed successfully" toast
- Dashboard images section updates

3. **Test Reconnection:**

```javascript
// Manually disconnect
const wsClient = window.getDashboardWebSocket();
wsClient.disconnect();

// Should automatically reconnect within 1-2 seconds
// Watch console for reconnection attempts
```

### Automated Testing Script

Create `test-websocket-notifications.js`:

```javascript
#!/usr/bin/env node

const WebSocket = require('ws');

const TEST_USER_ID = 'test-user-uuid';
const WS_URL = 'ws://localhost:5000';

async function testWebSocketNotifications() {
  console.log('🧪 Testing WebSocket Notifications\n');

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');

    // Subscribe to user updates
    ws.send(JSON.stringify({
      type: 'subscribe',
      userId: TEST_USER_ID
    }));

    console.log(`📡 Subscribed to updates for user: ${TEST_USER_ID}\n`);
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message.type);
    console.log(JSON.stringify(message, null, 2), '\n');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });

  // Keep script running
  process.on('SIGINT', () => {
    console.log('\n👋 Closing connection...');
    ws.close();
    process.exit(0);
  });
}

testWebSocketNotifications().catch(console.error);
```

**Run the test:**

```bash
node test-websocket-notifications.js
```

Then trigger an image upload or PDF generation and watch for real-time updates.

---

## Troubleshooting

### Issue: WebSocket not connecting

**Symptoms:**
- Console shows "WebSocket connection failed"
- Status indicator stays "Offline"

**Solutions:**

1. **Check server is running:**
```bash
curl http://localhost:5000/healthz
```

2. **Check WebSocket initialization:**
```javascript
// In browser console
window.getDashboardWebSocket()?.getState()
```

3. **Check user ID:**
```javascript
// User ID must be provided
console.log(sessionStorage.getItem('user_id'));
```

4. **Check for CORS/CSP issues:**
```
// Check browser console for security errors
// WebSocket connections bypass CORS but may hit CSP
```

### Issue: Messages not received

**Symptoms:**
- WebSocket connected but no toast notifications appear
- Console shows no incoming messages

**Solutions:**

1. **Verify subscription:**
```javascript
const wsClient = window.getDashboardWebSocket();
console.log('User ID:', wsClient.userId);
console.log('Connected:', wsClient.getState().isConnected);
```

2. **Check message handlers:**
```javascript
// Add debug handler to catch all messages
wsClient.on('message', (data) => {
  console.log('Raw message:', data);
});
```

3. **Verify backend is emitting:**
```javascript
// In backend service, add logging
logger.info('Emitting WebSocket update', { userId, type, data });
```

### Issue: Reconnection loops

**Symptoms:**
- Console shows constant reconnection attempts
- Connection status flickers

**Solutions:**

1. **Check server health:**
```bash
# Server might be restarting frequently
curl http://localhost:5000/healthz
```

2. **Increase reconnection delay:**
```javascript
const wsClient = new DashboardWebSocketClient({
  reconnectDelay: 5000, // Start at 5 seconds
  maxReconnectDelay: 60000 // Max 60 seconds
});
```

3. **Check for port conflicts:**
```bash
# Another process might be using the port
lsof -i :5000
```

### Issue: Toast notifications not showing

**Symptoms:**
- WebSocket messages received but no visual notifications

**Solutions:**

1. **Check toast system loaded:**
```javascript
// In browser console
typeof window.showToast // Should be 'function'
```

2. **Manually test toast:**
```javascript
window.showToast('Test', 'This is a test notification', 'success');
```

3. **Check z-index conflicts:**
```css
/* Toast container should be on top */
#toast-container {
  z-index: 10000 !important;
}
```

---

## Security Considerations

### 1. Authentication

**Current implementation:**
- WebSocket connections are **not authenticated** - they rely on user ID subscription
- Suitable for internal dashboards where users are already authenticated via HTTP

**Production recommendation:**
```javascript
// In websocket/index.js - validate JWT token on connection
wss.on('connection', async (ws, request) => {
  try {
    const token = new URL(request.url, 'ws://localhost').searchParams.get('token');
    const user = await validateJWT(token);
    ws.userId = user.id;
    ws.isAuthenticated = true;
  } catch (error) {
    ws.close(4001, 'Unauthorized');
  }
});
```

### 2. Rate Limiting

**Current implementation:**
- No per-connection rate limiting
- Relies on HTTP rate limiting for API endpoints

**Production recommendation:**
```javascript
// Track messages per connection
const messageCounts = new WeakMap();

ws.on('message', (message) => {
  const count = (messageCounts.get(ws) || 0) + 1;
  messageCounts.set(ws, count);

  if (count > 100) { // Max 100 messages per connection
    ws.close(4029, 'Too many requests');
    return;
  }

  // Process message...
});
```

### 3. Data Sanitization

**Always sanitize data before broadcasting:**

```javascript
// Bad - XSS risk
broadcastToUser(userId, {
  type: 'status_update',
  message: userInput // Could contain <script> tags
});

// Good - Sanitized
const sanitizeHtml = require('sanitize-html');
broadcastToUser(userId, {
  type: 'status_update',
  message: sanitizeHtml(userInput, { allowedTags: [] })
});
```

### 4. Connection Limits

**Set max connections per user:**

```javascript
const MAX_CONNECTIONS_PER_USER = 5;

function canUserConnect(userId) {
  const userSessions = getUserSessions(userId);
  return userSessions.size < MAX_CONNECTIONS_PER_USER;
}
```

---

## Performance Optimization

### 1. Message Batching

For high-frequency updates, batch messages:

```javascript
let batchQueue = [];
let batchTimer = null;

function queueMessage(userId, message) {
  batchQueue.push({ userId, message });

  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      flushBatch();
    }, 100); // Batch every 100ms
  }
}

function flushBatch() {
  const batch = batchQueue;
  batchQueue = [];
  batchTimer = null;

  // Group by userId
  const grouped = {};
  batch.forEach(({ userId, message }) => {
    if (!grouped[userId]) grouped[userId] = [];
    grouped[userId].push(message);
  });

  // Send batched messages
  Object.entries(grouped).forEach(([userId, messages]) => {
    broadcastToUser(userId, {
      type: 'batch_update',
      messages
    });
  });
}
```

### 2. Connection Pooling

Reuse WebSocket connections across page navigation:

```javascript
// Store in sessionStorage for same-tab reuse
sessionStorage.setItem('ws_connection_id', connectionId);

// Reconnect to same session
const existingConnectionId = sessionStorage.getItem('ws_connection_id');
if (existingConnectionId) {
  ws.send(JSON.stringify({
    type: 'reconnect',
    connectionId: existingConnectionId
  }));
}
```

---

## Future Enhancements

### 1. Presence System

Track online users:

```javascript
// Backend
const onlineUsers = new Set();

ws.on('connection', (ws) => {
  onlineUsers.add(ws.userId);
  broadcastPresence();
});

ws.on('close', () => {
  onlineUsers.delete(ws.userId);
  broadcastPresence();
});
```

### 2. Typing Indicators

For collaborative features:

```javascript
ws.on('message', (data) => {
  if (data.type === 'typing') {
    broadcastToRoom(data.roomId, {
      type: 'user_typing',
      userId: ws.userId
    });
  }
});
```

### 3. Binary Data Support

For large files or images:

```javascript
wss.on('connection', (ws) => {
  ws.on('message', (message, isBinary) => {
    if (isBinary) {
      // Handle binary data (images, files)
      processBinaryUpload(message);
    } else {
      // Handle JSON messages
      processJsonMessage(message);
    }
  });
});
```

---

## Changelog

### Version 1.0.0 (2025-10-28)

- ✅ Initial WebSocket server implementation
- ✅ Frontend client with auto-reconnection
- ✅ Toast notification system
- ✅ Dashboard integration
- ✅ Image processing notifications
- ✅ PDF generation notifications
- ✅ Transcription notifications
- ✅ Comprehensive documentation

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in browser console (enable debug mode)
3. Check server logs for WebSocket errors
4. Create an issue in the project repository

**Debug Mode:**

```javascript
// Enable verbose logging
const wsClient = new DashboardWebSocketClient({ debug: true });
```

---

**Last Updated:** 2025-10-28
**Maintained By:** Car Crash Lawyer AI Development Team
