# Transcription-Status Narrative Integration

## Overview

The transcription-status page now includes a comprehensive **Full Accident Narrative** section (2000 character limit) that serves as the primary statement field, with voice transcription as an optional supplement.

## Implementation Summary

### What Changed

**File Modified:** `/public/transcription-status.html`

**Key Changes:**
1. Added "Full Accident Narrative" section with 2000-char textarea
2. Repositioned voice transcription as optional supplement
3. Implemented character/word counters with visual warnings
4. Updated auto-save to handle both narrative and transcription
5. Modified save functionality to combine both into personal statement
6. Updated validation to require at least one field

### Data Flow

```
Incident Form (12 pages)
    ↓
Page 12: Complete Report
    ↓
Save incident form data
    ↓
Navigate to transcription-status.html
    ↓
Transcription Tab
    ├─ Full Accident Narrative (2000 chars) - PRIMARY
    └─ Voice Transcription (optional) - SUPPLEMENT
    ↓
Auto-save to localStorage every 10 seconds
    ↓
"Save Changes" button
    ↓
Combine narrative + transcription
    ↓
POST /api/incident-reports/save-statement
    {
      userId,
      incidentId,
      personalStatement: "=== Full Accident Narrative ===\n\n[narrative]\n\n=== Voice Transcription ===\n\n[transcription]",
      accidentNarrative: "[narrative]",
      voiceTranscription: "[transcription]"
    }
    ↓
Save to database
    ↓
Continue to report-complete.html
```

## User Interface

### Full Accident Narrative Section

**Location:** First section in "Transcription" tab

**Features:**
- Large textarea (2000 char limit, 15 rows minimum)
- Real-time character counter (X / 2000 characters)
- Real-time word counter (X words)
- Visual warnings:
  - **Yellow (1600+ chars):** Warning color `#f59e0b`
  - **Red (1900+ chars):** Danger color `#e53e3e`
- Comprehensive placeholder text with examples
- Guidance on what to include

**Example Placeholder:**
```
Example: 'I was driving north on the A40 approaching the junction with Mill Road
at approximately 35mph in light traffic. The weather was clear with good visibility.
As I entered the junction on a green light, a silver Ford Focus traveling west on
Mill Road suddenly accelerated through what appeared to be a red light on their side...'

Continue with: What happened immediately after impact? Any injuries you noticed?
What did the other driver say or do? Who witnessed the accident? What emergency
services attended? Any other relevant details?
```

### Voice Transcription Section (Optional)

**Location:** Below narrative section in "Transcription" tab

**Features:**
- Now labeled as "Optional"
- Clear explanation it supplements written narrative
- contenteditable div for transcribed text
- Separate character/word counters
- Links to "Record" tab for audio recording

## Technical Implementation

### New Functions

**`updateNarrativeCount()`**
- Updates character and word counts for narrative textarea
- Applies visual warnings at 1600 and 1900 characters
- Called on input events

**Updated Functions:**

**`autoSaveDraft()`**
- Now saves both `draft_narrative` and `draft_transcription` to localStorage
- Saves every 10 seconds
- Includes timestamp and userId

**`restoreDraft()`**
- Restores both narrative and transcription from localStorage
- Shows single confirmation dialog
- Restores character/word counters

**`saveTranscription()`**
- Combines narrative and transcription into single statement
- Format:
  ```
  === Full Accident Narrative ===

  [narrative text]

  === Voice Transcription ===

  [transcription text]
  ```
- Sends to API: `/api/incident-reports/save-statement`
- Payload includes separate fields for each

**`clearDraft()`**
- Clears both narrative and transcription
- Removes all draft items from localStorage
- Updates both counters

**`saveAndContinue()`**
- Validates at least one field has content
- Shows warning if both empty
- Saves before redirecting to report-complete.html

### LocalStorage Keys

| Key | Content | Type |
|-----|---------|------|
| `draft_transcription` | Voice transcription text | string |
| `draft_narrative` | Written narrative text | string |
| `draft_timestamp` | Save timestamp | number |
| `draft_userId` | User UUID | string |

### API Payload Structure

**Endpoint:** `POST /api/incident-reports/save-statement`

**Payload:**
```json
{
  "userId": "uuid",
  "incidentId": "uuid",
  "personalStatement": "Combined narrative + transcription with headers",
  "accidentNarrative": "Full narrative text (2000 chars)",
  "voiceTranscription": "Optional voice transcription text"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Statement saved successfully",
  "data": {
    "incidentId": "uuid",
    "personalStatement": "...",
    "savedAt": "2025-10-29T06:00:00.000Z"
  }
}
```

## Integration with Incident Form

### Page 12 → Transcription-Status Flow

**Page 12: Final Medical Check**
- User completes wellness check
- Clicks "Complete Report"
- Form data from all 12 pages merged
- Alert confirms completion
- TODO: Update to redirect to transcription-status.html

**Expected Flow:**
```javascript
// In incident-form-page12-final-medical-check.html
submitBtn.addEventListener('click', () => {
  autoSave();

  // Merge all page data
  const allData = mergeAllPageData();

  // Save to API
  await saveIncidentReport(allData);

  // Redirect to transcription-status
  window.location.href = '/transcription-status.html';
});
```

### Data Mapping

| Incident Form | Transcription Page | Database Field |
|---------------|-------------------|----------------|
| 12 pages of structured data | - | `incident_reports` table columns |
| - | Full Accident Narrative | `accident_narrative` (2000 chars) |
| - | Voice Transcription | `voice_transcription` (text) |
| - | Combined Statement | `personal_statement` (text) |

## Character Limit Rationale

**2000 characters = ~300-350 words**

This allows users to provide:
- Detailed account of events (who, what, when, where, why)
- Road/weather conditions
- Actions taken before/during/after collision
- Witness information
- Emergency service details
- Injuries and immediate observations
- Other driver's statements/behavior

**Visual Warnings:**
- **1600 chars (80%):** Yellow warning - user approaching limit
- **1900 chars (95%):** Red warning - very close to limit
- **2000 chars (100%):** Hard limit enforced by textarea maxlength

## Auto-Save Behavior

**Frequency:** Every 10 seconds

**Triggers:**
- Automatic interval (setInterval)
- Text input events (debounced)

**Saved Data:**
- Narrative text
- Transcription text
- Timestamp
- User ID

**Restore Behavior:**
- On page load, checks for saved draft
- Shows time-aware confirmation dialog
- Restores both fields if accepted
- Clears drafts if declined

## Validation Rules

**Before Save:**
- ✅ Allow narrative only
- ✅ Allow transcription only
- ✅ Allow both
- ❌ Block if both empty

**Before Continue:**
- Same rules as save
- Shows warning: "Please write your accident narrative before continuing."

## Testing

### Test Script

**File:** `test-transcription-narrative-integration.js`

**Coverage:**
- Character counter color coding
- Word counting
- Combined statement generation
- LocalStorage draft structure
- API payload structure
- Validation rules

**Run:**
```bash
node test-transcription-narrative-integration.js
```

### Manual Testing Checklist

**⚠️ Important:** `transcription-status.html` is a protected page requiring authentication.

**Step 0: Login First**
   - [ ] Open http://localhost:3000/login.html
   - [ ] Login with valid credentials
   - [ ] Verify successful authentication

1. **Navigation:**
   - [ ] Open http://localhost:3000/transcription-status.html (after login)
   - [ ] Click "Transcription" tab
   - [ ] Verify narrative section appears first

2. **Character Counter:**
   - [ ] Type text and verify counter updates
   - [ ] Type 1600+ chars → Yellow warning
   - [ ] Type 1900+ chars → Red warning
   - [ ] Verify maxlength stops at 2000

3. **Word Counter:**
   - [ ] Verify word count updates correctly
   - [ ] Test with empty spaces (should not count)

4. **Auto-Save:**
   - [ ] Type text, wait 10 seconds
   - [ ] Verify "Saving draft..." indicator
   - [ ] Verify "Last saved: [time]" appears
   - [ ] Check localStorage for draft_narrative

5. **Draft Restore:**
   - [ ] Type narrative text
   - [ ] Refresh page
   - [ ] Accept restore prompt
   - [ ] Verify narrative restored
   - [ ] Verify counters updated

6. **Voice Transcription (Optional):**
   - [ ] Click "Record" tab
   - [ ] Record audio or type transcription
   - [ ] Return to "Transcription" tab
   - [ ] Verify both sections populated

7. **Save Functionality:**
   - [ ] Click "Save Changes" with narrative only → Success
   - [ ] Click "Save Changes" with transcription only → Success
   - [ ] Click "Save Changes" with both → Success
   - [ ] Click "Save Changes" with neither → Error

8. **API Integration:**
   - [ ] Open Network tab
   - [ ] Click "Save Changes"
   - [ ] Verify POST to /api/incident-reports/save-statement
   - [ ] Check payload includes:
     - personalStatement (combined)
     - accidentNarrative (separate)
     - voiceTranscription (separate)

9. **Clear Draft:**
   - [ ] Type text in both fields
   - [ ] Click "Clear Draft"
   - [ ] Confirm dialog
   - [ ] Verify both fields cleared
   - [ ] Verify counters reset to 0

10. **Save & Continue:**
    - [ ] Add narrative
    - [ ] Click "Save & Continue"
    - [ ] Verify saves successfully
    - [ ] Verify redirects to report-complete.html

## Backend Requirements

### Database Schema

The backend must support these fields in the relevant table:

```sql
-- Assuming incident_reports table or similar
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS accident_narrative TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS voice_transcription TEXT;
ALTER TABLE incident_reports ADD COLUMN IF NOT EXISTS personal_statement TEXT;
```

### API Endpoint

**Route:** `POST /api/incident-reports/save-statement`

**Expected Handler:**
```javascript
async function saveStatement(req, res) {
  const {
    userId,
    incidentId,
    personalStatement,
    accidentNarrative,
    voiceTranscription
  } = req.body;

  try {
    // Update incident report with statement data
    const { data, error } = await supabase
      .from('incident_reports')
      .update({
        personal_statement: personalStatement,
        accident_narrative: accidentNarrative,
        voice_transcription: voiceTranscription,
        statement_updated_at: new Date().toISOString()
      })
      .eq('id', incidentId)
      .eq('create_user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Statement saved successfully',
      data: {
        incidentId: data.id,
        personalStatement: data.personal_statement,
        savedAt: data.statement_updated_at
      }
    });
  } catch (error) {
    console.error('Save statement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save statement'
    });
  }
}
```

## Future Enhancements

### Potential Improvements

1. **Character Limit Increase:**
   - Consider 3000-5000 chars for very detailed accounts
   - User research to determine optimal length

2. **Formatting Options:**
   - Bold, italic, bullet points
   - Paragraph breaks
   - Rich text editor

3. **Templates:**
   - Pre-filled structure with prompts
   - "Fill in the blanks" format
   - Guided questions

4. **AI Assistance:**
   - Grammar/spelling check
   - Completeness analysis
   - Suggested improvements
   - Key detail extraction

5. **Merge Voice + Narrative:**
   - Single unified field
   - Voice-to-text directly into narrative
   - Seamless editing

6. **Progress Indicator:**
   - Show sections completed
   - Highlight missing details
   - Completeness percentage

7. **Export Options:**
   - Download as PDF
   - Email copy to user
   - Print-friendly view

## Known Issues

None currently identified.

## Related Files

- `/public/transcription-status.html` - Main implementation
- `/public/incident-form-page12-final-medical-check.html` - Previous page in flow
- `/public/report-complete.html` - Next page in flow
- `test-transcription-narrative-integration.js` - Test script

## Version History

- **2025-10-29:** Initial implementation
  - Added 2000-char narrative section
  - Repositioned voice transcription as optional
  - Implemented character/word counters
  - Updated auto-save and validation
  - Created test script and documentation
