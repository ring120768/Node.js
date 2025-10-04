# TRACE SESSION ID GENERATION IN TRANSCRIPTION SYSTEM

## PROBLEM DESCRIPTION
In the transcription system, there's a user ID appearing in what should be a Session ID field. We need to trace where this Session ID is being generated and why it contains user ID data.

## TASK 1 - LOCATE SESSION ID GENERATION

Search for ALL places where Session IDs are created, assigned, or modified in the transcription flow:

### 1. Search for Session ID creation patterns:
```javascript
// Look for patterns like:
sessionId
session_id
sessionID
transcriptionSessionId
transcription_session_id
recordingSessionId
recording_session_id
```

### 2. Check these specific files for Session ID logic:
- `transcriptionService.js` - Main transcription service
- `index.js` - Look for transcription endpoints
- `transcription-status.html` - Frontend recording interface
- `public/js/*` - Any JavaScript that handles recording/transcription
- `mockFunctions.js` - May have mock session generation
- `incidentEndpoints.js` - May handle evidence/audio sessions
- `audioStorage.js` - Audio file handling may create sessions
- `test-transcription.js` - Test scripts may show session creation

### 3. Search database operations involving sessions:
- Any INSERT into `transcription_queue` table
- Any UPDATE to `transcription_queue` table
- Any INSERT into `ai_transcription` table
- Look for session-related columns in these tables

### 4. Search for specific code patterns:
```javascript
// Patterns that might be incorrectly using user_id as session_id:
session = userId
sessionId = user_id
session_id = create_user_id
transcriptionSession = req.body.userId
sessionId = req.params.userId
generateSessionId(userId) // Where userId is used to create session
```

## TASK 2 - TRACE THE DATA FLOW

Map out the complete flow of Session ID through the system:

### 1. Frontend (Recording Interface):
- How is Session ID generated when user starts recording?
- Is it generated client-side or server-side?
- Check `transcription-status.html` and any associated JavaScript

### 2. API Endpoints:
- `/api/whisper/transcribe`
- `/api/store-evidence-audio`
- `/api/generate-ai-summary`
- Any webhook endpoints handling transcription

### 3. Database Storage:
- How is Session ID stored in `transcription_queue`?
- What's the relationship between Session ID and user_id?
- Are they being conflated somewhere?

## TASK 3 - IDENTIFY THE CORRUPTION POINT

Look for where Session ID and User ID might be getting mixed up:

### Common Mistakes to Search For:
```javascript
// WRONG - Using user_id as session_id:
const sessionId = req.body.create_user_id;
const sessionId = userData.id;
sessionId: userId

// WRONG - Copying user_id into session field:
session_id: user_id,
transcription_session_id: create_user_id

// WRONG - Not generating unique session IDs:
const session = { id: userId, ... }
```

### Correct Pattern Should Be:
```javascript
// RIGHT - Generating unique session ID:
const sessionId = crypto.randomUUID();
const sessionId = `session-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

// RIGHT - Keeping user_id and session_id separate:
{
  session_id: uniqueSessionId,
  user_id: create_user_id,
  ...
}
```

## TASK 4 - SPECIFIC SEARCHES

Run these exact searches across the codebase:

1. `grep -r "session.*=.*user" --include="*.js"`
2. `grep -r "sessionId.*userId" --include="*.js"`
3. `grep -r "session_id.*user_id" --include="*.js"`
4. `grep -r "transcription.*session" --include="*.js"`
5. Search for any place where `create_user_id` is assigned to a variable containing "session"

## TASK 5 - CHECK WEBHOOK DATA

Examine webhook handlers that might be setting Session IDs:

1. Check `/webhook/signup` 
2. Check `/webhook/incident-report`
3. Look for any webhook that processes transcription data
4. See if Typeform or any external service is sending session data

## OUTPUT REQUIRED

For each location where Session ID is generated or modified, provide:

```
FILE: [filename]
LINE: [line number]
FUNCTION/CONTEXT: [where in the code flow]
CURRENT CODE: [show the actual code]
ISSUE: [explain if this is the corruption point]
FIX NEEDED: [what should be changed]
```

## SPECIAL ATTENTION AREAS

1. **WebSocket/Real-time code**: Mock WebSocket implementation may have session logic
2. **Queue Processing**: `processTranscriptionQueue` function may create/modify sessions
3. **Frontend Recording**: JavaScript that initiates recording may set session
4. **Database Triggers**: Any Supabase functions that might modify session data

## CRITICAL QUESTIONS TO ANSWER

1. **WHERE** is the Session ID first generated?
2. **WHY** is it containing user_id data?
3. **WHEN** does the corruption occur (client-side, server-side, or database)?
4. **WHAT** should the Session ID actually contain?
5. **HOW** can we ensure Session IDs are unique and separate from User IDs?

## DATABASE SCHEMA CHECK

Also check the database schema for:
- Column definitions for session-related fields
- Any constraints or defaults that might affect session IDs
- Foreign key relationships that might cause confusion

This is critical for proper session management and data attribution in the transcription system.