# Individual Deletion Endpoints

Granular GDPR-compliant deletion endpoints that allow users to delete specific items without removing their entire account.

## Overview

These endpoints complement the full account deletion feature (`/api/account/delete`) by providing fine-grained control over what data users want to delete. This meets Apple and Google Play requirements for data protection and GDPR Article 17 (Right to Erasure).

## Endpoints

All endpoints require authentication via `requireAuth` middleware. Users can only delete their own data - authorization is verified in each controller.

### 1. Delete Individual Document/Photo

**Endpoint:** `DELETE /api/deletions/document/:id`

**Description:** Deletes a single photo or document upload, including the file in Supabase Storage.

**Parameters:**
- `id` (path) - UUID of the document in `user_documents` table

**Authorization:** User must own the document (`user_id` match verified)

**What gets deleted:**
- Database record from `user_documents`
- File from Supabase Storage bucket `user-documents`

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Document belongs to another user
- `404 Not Found` - Document doesn't exist
- `500 Internal Server Error` - Deletion failed

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/deletions/document/abc123-def456 \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 2. Delete Incident Report

**Endpoint:** `DELETE /api/deletions/report/:id`

**Description:** Deletes an incident report and all associated data (witnesses, other vehicles).

**Parameters:**
- `id` (path) - UUID of the report in `incident_reports` table

**Authorization:** User must own the report (`user_id` match verified)

**What gets deleted:**
- Database record from `incident_reports`
- Associated records from `incident_witnesses`
- Associated records from `incident_other_vehicles`

**Response:**
```json
{
  "success": true,
  "message": "Report deleted successfully"
}
```

**Error responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Report belongs to another user
- `404 Not Found` - Report doesn't exist
- `500 Internal Server Error` - Deletion failed

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/deletions/report/xyz789-abc123 \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 3. Delete Completed PDF

**Endpoint:** `DELETE /api/deletions/pdf/:id`

**Description:** Deletes a generated PDF report, including the file in Supabase Storage.

**Parameters:**
- `id` (path) - UUID of the PDF in `completed_incident_forms` table

**Authorization:** User must own the PDF (`user_id` match verified)

**What gets deleted:**
- Database record from `completed_incident_forms`
- PDF file from Supabase Storage bucket `completed-pdfs`

**Response:**
```json
{
  "success": true,
  "message": "PDF deleted successfully"
}
```

**Error responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - PDF belongs to another user
- `404 Not Found` - PDF doesn't exist
- `500 Internal Server Error` - Deletion failed

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/deletions/pdf/pdf123-abc456 \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

### 4. Delete Transcription

**Endpoint:** `DELETE /api/deletions/transcription/:id`

**Description:** Deletes a voice transcription and associated audio file.

**Parameters:**
- `id` (path) - UUID of the transcription in `ai_transcription` table

**Authorization:** User must own the transcription (`user_id` match verified)

**What gets deleted:**
- Database record from `ai_transcription`
- Audio file from Supabase Storage bucket `voice-recordings`

**Response:**
```json
{
  "success": true,
  "message": "Transcription deleted successfully"
}
```

**Error responses:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Transcription belongs to another user
- `404 Not Found` - Transcription doesn't exist
- `500 Internal Server Error` - Deletion failed

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/deletions/transcription/trans123-xyz789 \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Security

### Authentication
All endpoints require a valid session cookie (`sb-access-token`) verified by the `requireAuth` middleware.

### Authorization
Each endpoint verifies that the item being deleted belongs to the authenticated user:
```javascript
if (item.user_id !== userId) {
  return res.status(403).json({ error: 'Not authorized' });
}
```

### Audit Logging
All deletion requests are logged with:
- User ID
- Item ID
- Timestamp
- Success/failure status

Logs can be found in the application logs and are searchable by user ID for GDPR audit requirements.

---

## Storage Cleanup

The endpoints handle both database and file storage cleanup:

1. **Fetch item** - Verify it exists and belongs to user
2. **Delete storage file** - Remove from Supabase Storage bucket
3. **Delete database record** - Remove from PostgreSQL table
4. **Log action** - Audit trail for compliance

If storage deletion fails, the database record is still deleted and the error is logged (orphaned files are cleaned up by automated maintenance scripts).

---

## Testing

### Manual Testing

1. **Login** to get auth token:
   ```bash
   # Login and capture cookie
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}' \
     -c cookies.txt
   ```

2. **Get real IDs** from dashboard or database:
   ```sql
   SELECT id FROM user_documents WHERE user_id = 'your-user-uuid' LIMIT 1;
   ```

3. **Test deletion**:
   ```bash
   curl -X DELETE http://localhost:5000/api/deletions/document/REAL_ID \
     -H "Cookie: sb-access-token=TOKEN" \
     -H "Content-Type: application/json"
   ```

### Automated Testing

Run the test script:
```bash
node test-deletion-endpoints.js
```

This tests all endpoints with fake IDs to verify:
- Authentication middleware works (401)
- Authorization checks work (403)
- ID validation works (404)
- Successful deletion (200) when testing with real IDs

---

## Integration with Dashboard

These endpoints will be called from the dashboard UI when users click "Delete" buttons on:

- Individual photos (timeline items)
- Incident reports (report list)
- PDFs (downloads section)
- Voice transcriptions (transcription list)

**Example frontend code:**
```javascript
async function deleteDocument(documentId) {
  try {
    const response = await fetch(`/api/deletions/document/${documentId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete');
    }

    showToast('Document deleted successfully', 'success');
    // Reload dashboard data
    await loadActivity();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }
}
```

---

## GDPR Compliance

These endpoints support GDPR requirements:

- **Article 17 (Right to Erasure)** - Users can delete specific data items
- **Granular control** - Don't force "all or nothing" deletion
- **Audit trail** - All deletions logged for compliance
- **Storage cleanup** - Files removed from storage, not just database
- **Permanent deletion** - No soft delete, actual erasure from systems

**7-year retention:**
Users can still delete data before the 7-year retention period ends. The retention period only prevents automatic deletion by the system - user-initiated deletion is always allowed.

---

## Files

| File | Purpose |
|------|---------|
| `src/controllers/deletion.controller.js` | Deletion logic and authorization |
| `src/routes/deletion.routes.js` | Route definitions |
| `src/routes/index.js` | Route mounting |
| `test-deletion-endpoints.js` | Test script |

---

## Next Steps

1. **Frontend integration** - Add delete buttons to dashboard timeline
2. **Confirmation dialogs** - "Are you sure?" before deletion
3. **Undo functionality** - Brief window to undo deletion (optional)
4. **Batch deletion** - Select multiple items for deletion (future)

---

**Last Updated:** 2026-01-11
**Version:** 1.0.0
