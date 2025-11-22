# Dashboard Data Sources - Complete Reference

**Created**: 2025-10-28
**Purpose**: Document all available API endpoints and data sources for new dashboard

---

## Available API Endpoints for Dashboard

### 1. User Documents (Images, Videos, Files)
**API**: `GET /api/user-documents?user_id={userId}`

**Filters**:
- `status` - Filter by processing status
- `document_type` - Specific type OR use `image`/`video` for category filtering
- `document_category` - Additional categorization
- `limit` - Max results (default: 100)
- `offset` - Pagination

**Image Types**:
- `driving_license_picture`
- `vehicle_picture_front`
- `vehicle_picture_back`
- `vehicle_picture_driver_side`
- `vehicle_picture_passenger_side`
- `vehicle_damage_picture`
- `incident_picture`
- `test_image`

**Video Types**:
- `dashcam_footage`
- `incident_video`

**Response**:
```json
{
  "success": true,
  "documents": [{
    "id": "uuid",
    "create_user_id": "uuid",
    "document_type": "driving_license_picture",
    "document_category": "identification",
    "status": "completed",
    "storage_path": "user_id/filename.jpg",
    "public_url": "https://...",
    "signed_url": "https://...?token=...",
    "created_at": "2025-10-28T10:00:00Z"
  }],
  "count": 10,
  "total": 10
}
```

**Dashboard Sections**:
- **Images Gallery** - Filter by `document_type=image`
- **Dashcam Footage** - Filter by `document_type=video`

---

### 2. Incident Reports
**API**: `GET /api/incident-reports?user_id={userId}`

**Note**: Uses storage-based approach (JSON files in `incident-reports` bucket)

**Response**:
```json
{
  "success": true,
  "incidents": [{
    "incidentId": "INC_1234567890_abcd1234",
    "userId": "uuid",
    "createdAt": "2025-10-28T10:00:00Z",
    "status": "pending_processing",
    "dateTime": "2025-10-27T15:30:00Z",
    "location": {
      "address": "123 Main St, London",
      "coordinates": { "lat": 51.5074, "lng": -0.1278 }
    },
    "description": "Rear-end collision at traffic lights",
    "policeInvolved": true,
    "policeReferenceNumber": "REF123456"
  }]
}
```

**Dashboard Section**:
- **Incident Reports** - List all incidents with status

---

### 3. Audio Transcriptions
**API**: `GET /api/transcription/history?user_id={userId}`

**Response**:
```json
{
  "success": true,
  "transcriptions": [{
    "id": "uuid",
    "userId": "uuid",
    "fileName": "statement_123.mp3",
    "transcriptText": "I was driving along Main Street when...",
    "aiSummary": "User describes rear-end collision...",
    "duration": 120,
    "language": "en",
    "status": "completed",
    "createdAt": "2025-10-28T10:00:00Z"
  }]
}
```

**Dashboard Section**:
- **Audio Transcriptions** - List all transcriptions with summaries

---

### 4. Generated PDF Reports
**API**: `GET /api/pdf/status/:userId`

**Response**:
```json
{
  "success": true,
  "reports": [{
    "id": "uuid",
    "create_user_id": "uuid",
    "pdf_url": "https://...",
    "generated_at": "2025-10-28T10:00:00Z",
    "sent_to_user": true,
    "sent_to_accounts": true,
    "email_status": {
      "user": "sent",
      "accounts": "sent"
    }
  }]
}
```

**Dashboard Section**:
- **Generated Reports** - Download completed PDF forms

---

### 5. User Profile
**API**: From Supabase Auth session
```javascript
const { data: { user } } = await supabase.auth.getUser();
```

**Additional Profile Data**: `GET /api/profile/:userId`

**Response**:
```json
{
  "success": true,
  "profile": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+447411005390",
    "created_at": "2025-10-28T10:00:00Z"
  }
}
```

**Dashboard Section**:
- **User Profile Card** - Display user info and settings

---

### 6. Emergency Contacts
**API**: `GET /api/contacts/:userId`

**Response**:
```json
{
  "success": true,
  "contacts": {
    "emergency_contact": "+447411005390",
    "recovery_breakdown_number": "07411005390",
    "emergency_services_number": "999"
  }
}
```

**Dashboard Section**:
- **Emergency Buttons** - Quick-dial emergency contacts

---

### 7. DVLA Vehicle Information
**API**: Stored in `user_signup` table (part of profile)

**Data**:
- `make` - Vehicle manufacturer
- `model` - Vehicle model
- `colour` - Vehicle color
- `year_of_manufacture` - Year
- `fuel_type` - Fuel type
- `co2_emissions` - CO2 emissions

**Dashboard Section**:
- **Vehicle Information Card** - Display registered vehicle details

---

### 8. Export History (GDPR)
**API**: `GET /api/exports/history`

**Response**:
```json
{
  "success": true,
  "exports": [{
    "id": "uuid",
    "userId": "uuid",
    "exportType": "full_data",
    "status": "completed",
    "downloadUrl": "https://...",
    "createdAt": "2025-10-28T10:00:00Z",
    "expiresAt": "2025-11-04T10:00:00Z"
  }]
}
```

**Dashboard Section**:
- **Data Exports** - GDPR data export history

---

## Supabase Tables (Direct Access)

### Primary Tables
1. **user_signup** - Personal info, vehicle, insurance
2. **incident_reports** - Accident details (131+ columns)
3. **user_documents** - Image processing status
4. **ai_transcription** - OpenAI Whisper transcripts
5. **ai_summary** - GPT-4 summaries
6. **completed_incident_forms** - Final PDF records
7. **temp_uploads** - Temporary image uploads (24hr expiry)

### Relationships
- All tables link via `create_user_id` (UUID)
- RLS policies enforce user-level isolation
- Service role key bypasses RLS for webhooks

---

## Dashboard Sections Summary

✅ **Sections to Implement**:
1. **User Profile Card** - Name, email, phone, registration date
2. **Vehicle Information** - DVLA data, registration, insurance
3. **Incident Reports** - List of incidents with status
4. **Images Gallery** - All uploaded photos with preview
5. **Dashcam Footage** - Videos with playback
6. **Audio Transcriptions** - Transcripts and AI summaries
7. **Generated Reports** - PDF downloads
8. **Emergency Contacts** - Quick-dial buttons
9. **Data Exports** - GDPR export history
10. **Quick Actions** - Upload new incident, generate report, etc.

---

## Authentication Required

All endpoints require Supabase Auth session:
```javascript
const { data: { session } } = await supabase.auth.getSession();
const userId = session?.user?.id;

// OR from URL params (for testing)
const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('user_id') || session?.user?.id;
```

---

**Last Updated**: 2025-10-28
**Version**: 2.1.0
