# Pages 13-18 PDF Field Mapping Reference

**Document Version:** 1.0
**Date:** 16 November 2025
**Purpose:** Definitive field mapping for AI-generated PDF pages
**Legal Context:** All data must be FACTUAL, NO URLs allowed

---

## Page 13: User's Direct Statement

### Overview
**Purpose:** User's personal account of the incident
**Content Type:** Transcription text (user's own words - NOT AI-generated)
**Word Count:** Variable (typically 200-500 words)
**Legal Requirement:** Must be user's direct statement, not AI interpretation

### PDF Field Mapping

| PDF Field Name | Database Source | Data Type | Transformation |
|----------------|-----------------|-----------|----------------|
| `ai_summary_of_accident_data_transcription` | `ai_transcription.transcript_text` | TEXT | None (direct copy) |

### Database Schema

**Table:** `ai_transcription`

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | UUID | Primary key | `ea85d0c8-00eb-4bc9-8b48-5c41c9f08b46` |
| `create_user_id` | UUID | Foreign key to user | `ee7cfcaf-5810-4c62-b99b-ab0f2291733e` |
| `transcript_text` | TEXT | User's transcription | "I was driving along..." |
| `audio_file_url` | TEXT | Optional audio reference | (Not used in PDF) |
| `created_at` | TIMESTAMP | Creation time | `2025-11-16 12:22:00` |

### Code Implementation

**File:** `src/services/adobePdfFormFillerService.js` (lines 708-717)

```javascript
// ========================================
// PAGE 13: User's Direct Statement (Transcription)
// ========================================
// User's personal statement about the incident - straight transcription,
// manually input, or edited
// Data source: ai_transcription.transcript_text (user's own words)
// This is NOT AI-generated - it's the user's direct account
const userTranscription = data.aiTranscription?.transcription || '';

setFieldText('ai_summary_of_accident_data_transcription', userTranscription.trim());
console.log(`   ✅ Page 13 (User's Transcription): ${userTranscription ? userTranscription.length + ' chars' : 'No data'}`);
```

### Data Flow

```
User Input (Audio/Text)
    ↓
POST /api/transcription/transcribe (OpenAI Whisper)
    ↓
ai_transcription.transcript_text
    ↓
dataFetcher.js → fetchAITranscription()
    ↓
data.aiTranscription.transcription
    ↓
adobePdfFormFillerService.js → setFieldText()
    ↓
PDF Page 13 Field: ai_summary_of_accident_data_transcription
```

### Validation Rules

- ✅ Must be user's own words (not AI-generated)
- ✅ Can be empty (optional field)
- ✅ No HTML formatting
- ✅ No character limit (PDF field auto-wraps)

---

## Page 14: Comprehensive AI Closing Statement

### Overview
**Purpose:** AI-generated comprehensive closing statement (legal narrative)
**Content Type:** Narrative text using ALL incident data (160+ fields)
**Word Count:** 800-1200 words (optimal range)
**Legal Requirement:** Must be factual, based on all user input from pages 1-12
**Importance:** Described as **"the centre piece"** of the entire legal document

### PDF Field Mapping

| PDF Field Name | Database Source | Data Type | Transformation |
|----------------|-----------------|-----------|----------------|
| `detailed_account_of_what_happened` | `ai_analysis.combined_report` | TEXT | HTML → Plain Text |

### Database Schema

**Table:** `ai_analysis`

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | UUID | Primary key | `f7a8c2d1-9e4b-4c8f-a3d5-1b2e3f4a5c6d` |
| `create_user_id` | UUID | Foreign key to user | `ee7cfcaf-5810-4c62-b99b-ab0f2291733e` |
| `combined_report` | TEXT | HTML narrative | `<p>Based on the comprehensive...</p>` |
| `incident_data` | JSONB | Source data used | `{"incident_reports": {...}, ...}` |
| `created_at` | TIMESTAMP | Generation time | `2025-11-16 12:30:00` |

### HTML to Plain Text Transformation

**File:** `src/services/adobePdfFormFillerService.js` (lines 742-770)

```javascript
// ========================================
// PAGE 14: Comprehensive AI Closing Statement Narrative (CENTRE PIECE)
// ========================================
// AI-generated comprehensive closing statement using ALL data from pages 1-12 + transcription
// This is the legal narrative equivalent to a closing statement (800-1200 words)
// Data source: ai_analysis.combined_report (HTML format)
let page14Narrative = '';

if (data.aiAnalysis?.combinedReport) {
  // Strip HTML tags and convert to plain text for PDF
  page14Narrative = data.aiAnalysis.combinedReport
    .replace(/<p>/gi, '\n\n')           // Paragraphs → double newline
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')      // Line breaks → newline
    .replace(/<ul>/gi, '\n')            // Lists → newline
    .replace(/<\/ul>/gi, '\n')
    .replace(/<li>/gi, '• ')            // List items → bullet points
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')            // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ')            // HTML entities → characters
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\n\n+/g, '\n\n')        // Collapse multiple newlines
    .trim();
}

setFieldText('detailed_account_of_what_happened', page14Narrative);
console.log(`   ✅ Page 14 (Comprehensive Narrative): ${page14Narrative ? page14Narrative.length + ' chars, ' + page14Narrative.split(/\s+/).length + ' words' : 'No data'}`);
```

### Data Sources (Comprehensive - 160+ Fields)

**ai_analysis.incident_data includes:**

1. **incident_reports** (131+ fields)
   - Personal details, vehicle info, insurance details
   - Accident location, date, time, weather conditions
   - Damage descriptions, injuries, medical details
   - Police information, witness details

2. **incident_other_vehicles** (up to 5 vehicles, 65+ fields each)
   - Other driver details, vehicle info, insurance
   - Damage descriptions, driver conditions

3. **incident_witnesses** (up to 3 witnesses, 30+ fields each)
   - Contact information, relationship to incident
   - Statement availability

### AI Generation Process

**Endpoint:** `POST /api/ai/generate-analysis`

**4-Step Pipeline (25-50 seconds):**

1. **Step 1:** Initial summary generation
2. **Step 2:** Quality review and enhancement
3. **Step 3:** Comprehensive narrative creation (Page 14) ← **This step**
4. **Step 4:** Final review with next steps (Page 15)

**OpenAI Configuration:**
- Model: `gpt-4o`
- Temperature: `0.3` (legal accuracy, not creative writing)
- Max Tokens: `3000` (allows for 800-1200 word narratives)

### Data Flow

```
User Completes Pages 1-12
    ↓
incident_reports + incident_other_vehicles + incident_witnesses
    ↓
User Clicks "Generate AI Analysis" Button
    ↓
POST /api/ai/generate-analysis (4-step pipeline)
    ↓
Step 3: Generate Comprehensive Narrative (ALL 160+ fields)
    ↓
ai_analysis.combined_report (HTML format)
    ↓
dataFetcher.js → fetchAIAnalysis()
    ↓
data.aiAnalysis.combinedReport
    ↓
adobePdfFormFillerService.js → HTML stripping
    ↓
PDF Page 14 Field: detailed_account_of_what_happened (plain text)
```

### Validation Rules

- ✅ Must be 800-1200 words (optimal range)
- ✅ Must use ALL incident data (160+ fields)
- ✅ Must be factual (based on user input only)
- ✅ Temperature 0.3 (legal accuracy)
- ✅ HTML must be stripped for PDF
- ✅ No URLs or external references

### Example Output Format

```
Based on the comprehensive information provided, the following narrative
presents a factual account of the incident that occurred on [DATE] at [TIME]
in [LOCATION].

INCIDENT OVERVIEW
The incident involved [USER'S NAME] driving a [VEHICLE MAKE/MODEL] when...

CIRCUMSTANCES LEADING TO INCIDENT
Prior to the collision, weather conditions were [CONDITIONS]...

IMPACT AND DAMAGE
The collision resulted in damage to [AFFECTED AREAS]...

[... continues for 800-1200 words total ...]
```

---

## Page 15: Key Points Summary & Next Steps Guide

### Overview
**Purpose:** Concise bullet point summary + action items for the user
**Content Type:** Structured lists (key points + next steps)
**Format:** Bullet points (•) for key points, Numbered list (1,2,3) for next steps
**Legal Requirement:** Factual summary only, no narrative duplication

### PDF Field Mapping

| PDF Field Name | Database Source | Data Type | Transformation |
|----------------|-----------------|-----------|----------------|
| `ai_combined_narrative_and_next_steps` | `ai_analysis.key_points` + `ai_analysis.final_review.nextSteps` | TEXT[] + JSONB | Array → Formatted Text |

### Database Schema

**Table:** `ai_analysis`

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `key_points` | TEXT[] | Bullet point summary | `["Driver failed to yield", "Significant vehicle damage", ...]` |
| `final_review` | JSONB | Contains nextSteps array | `{"nextSteps": ["Contact insurance", ...]}` |

### Code Implementation

**File:** `src/services/adobePdfFormFillerService.js` (lines 772-814)

```javascript
// ========================================
// PAGE 15: AI Key Points & Next Steps Guide
// ========================================
// AI bullet point summary + recommended next steps for the user
// Data sources:
//   - ai_analysis.key_points (TEXT[] array) - Bullet point summary
//   - ai_analysis.final_review.nextSteps (JSONB array) - Action items
// NOTE: Narrative is on Page 14, NOT duplicated here
let page15Content = '';

if (data.aiAnalysis) {
  // Add key points as bullet list
  if (data.aiAnalysis.keyPoints && data.aiAnalysis.keyPoints.length > 0) {
    page15Content += 'KEY POINTS SUMMARY:\n\n';
    data.aiAnalysis.keyPoints.forEach(point => {
      page15Content += `• ${point}\n\n`;
    });
  }

  // Add next steps guide
  if (data.aiAnalysis.finalReview?.nextSteps && data.aiAnalysis.finalReview.nextSteps.length > 0) {
    if (page15Content) {
      page15Content += '\n' + '─'.repeat(60) + '\n\n';
    }
    page15Content += 'RECOMMENDED NEXT STEPS:\n\n';
    data.aiAnalysis.finalReview.nextSteps.forEach((step, index) => {
      page15Content += `${index + 1}. ${step}\n\n`;
    });
  }
}

if (page15Content) {
  setFieldText('ai_combined_narrative_and_next_steps', page15Content.trim());
  console.log(`   ✅ Page 15 (Key Points & Next Steps): ${page15Content.length} chars`);
} else {
  console.log('   ⚠️  Page 15 (Key Points & Next Steps): No data available');
}
```

### Data Flow

```
User Clicks "Generate AI Analysis" Button
    ↓
POST /api/ai/generate-analysis (4-step pipeline)
    ↓
Step 1: Generate key_points (TEXT[] array)
Step 4: Generate final_review.nextSteps (JSONB array)
    ↓
ai_analysis.key_points + ai_analysis.final_review
    ↓
dataFetcher.js → fetchAIAnalysis()
    ↓
data.aiAnalysis.keyPoints + data.aiAnalysis.finalReview.nextSteps
    ↓
adobePdfFormFillerService.js → Format as bullet/numbered lists
    ↓
PDF Page 15 Field: ai_combined_narrative_and_next_steps
```

### Validation Rules

- ✅ key_points must be TEXT[] array (not empty)
- ✅ final_review.nextSteps must be array (not empty)
- ✅ No narrative duplication (narrative is on Page 14)
- ✅ Bullet points use • symbol
- ✅ Next steps use numbered list (1, 2, 3...)
- ✅ Divider line (60 dashes) between sections

### Example Output Format

```
KEY POINTS SUMMARY:

• The incident occurred on [DATE] at [LOCATION] during [CONDITIONS]

• Your vehicle sustained [DAMAGE TYPE] requiring repair/replacement

• The other driver was operating a [VEHICLE] registered to [OWNER]

• There were [NUMBER] witnesses present at the scene

• Police attended and documented the incident under reference [REF]

• You reported [INJURIES] and sought medical attention

────────────────────────────────────────────────────────────────

RECOMMENDED NEXT STEPS:

1. Contact your insurance company within 24-48 hours to report the claim

2. Obtain repair estimates from at least two certified mechanics

3. Keep all medical records and receipts related to injury treatment

4. Follow up with witnesses to obtain written statements if possible

5. Request a copy of the police report using reference number [REF]

6. Do not admit fault or discuss the incident on social media

7. Consult with a personal injury solicitor within 3 months if injuries persist
```

---

## Page 18: Emergency Audio Transcription (AI Eavesdropper)

### Overview
**Purpose:** Transcription of emergency audio recorded during incident
**Content Type:** Audio transcription with metadata
**Legal Requirement:** **TEXT ONLY - NO URLs** (critical for legal document)
**Feature Status:** Optional (not all incidents have emergency audio)

### PDF Field Mapping

| PDF Field Name | Database Source | Data Type | Transformation |
|----------------|-----------------|-----------|----------------|
| `emergency_audio_transcription` | `ai_listening_transcripts.transcription_text` | TEXT | Add metadata footer |

### Database Schema

**Table:** `ai_listening_transcripts`

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | UUID | Primary key | `d8e9f0a1-2b3c-4d5e-6f7a-8b9c0d1e2f3a` |
| `incident_id` | UUID | Foreign key to incident | `a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6` |
| `create_user_id` | UUID | Foreign key to user | `ee7cfcaf-5810-4c62-b99b-ab0f2291733e` |
| `transcription_text` | TEXT | Audio transcription | "Hello, I need help..." |
| `recorded_at` | TIMESTAMP | Recording time | `2025-11-16 14:30:00` |
| `duration_seconds` | INTEGER | Recording length | `120` (2 minutes) |
| `audio_storage_path` | TEXT | Storage reference | (NOT used in PDF - legal requirement) |

### Code Implementation

**File:** `src/services/adobePdfFormFillerService.js` (lines 872-908)

```javascript
// ========================================
// PAGE 18: AI Eavesdropper (Emergency Audio Recording)
// ========================================
// LEGAL REQUIREMENT: TEXT ONLY - No URLs allowed in legal document
const emergencyTranscription = data.emergencyAudio?.transcription_text || '';
const emergencyTimestamp = data.emergencyAudio?.recorded_at || '';
const emergencyDuration = data.emergencyAudio?.duration_seconds || null;

// Add transcription text with disclaimer
let emergencyContent = '';
if (emergencyTranscription) {
  emergencyContent = emergencyTranscription + '\n\n';

  // Add metadata footer
  emergencyContent += '─'.repeat(60) + '\n';
  emergencyContent += 'RECORDING INFORMATION:\n';
  if (emergencyTimestamp) {
    emergencyContent += `Recorded: ${new Date(emergencyTimestamp).toLocaleString('en-GB', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: 'Europe/London'
    })}\n`;
  }
  if (emergencyDuration) {
    const minutes = Math.floor(emergencyDuration / 60);
    const seconds = emergencyDuration % 60;
    emergencyContent += `Duration: ${minutes}m ${seconds}s\n`;
  }
  emergencyContent += '\nNote: This is an AI-generated transcription of emergency audio recorded during the incident. ' +
                     'Transcription accuracy may vary depending on audio quality and background noise.';
}

setFieldText('emergency_audio_transcription', emergencyContent.trim());
```

### CRITICAL: NO URLs - Legal Requirement

**File:** `lib/dataFetcher.js` (lines 132-165) - **REMOVED URL GENERATION**

```javascript
// ❌ REMOVED (violated legal requirement):
const { data: signedData, error: signedError } = await supabase.storage
  .from('incident-audio')
  .createSignedUrl(emergencyAudio.audio_storage_path, 31536000);

if (signedData && !signedError) {
  emergencyAudio.audio_url = signedData.signedUrl;  // ❌ NOT ALLOWED
}

// ✅ NOW (text only):
emergencyAudioData = {
  id: emergencyAudio.id,
  incident_id: emergencyAudio.incident_id,
  transcription_text: emergencyAudio.transcription_text || '',
  recorded_at: emergencyAudio.recorded_at,
  duration_seconds: emergencyAudio.duration_seconds || null,
  created_at: emergencyAudio.created_at
  // ❌ REMOVED: audio_url field
};
```

**Reason for Removal:**
> "None of this information is to be presented as URL links however this needs to be full text for clean transfer of information into the documentation which is important for legal purposes"

### Data Flow

```
User Records Emergency Audio (incident.html)
    ↓
Audio File Upload → Supabase Storage (incident-audio bucket)
    ↓
POST /api/transcription/transcribe-emergency (OpenAI Whisper)
    ↓
ai_listening_transcripts.transcription_text
    ↓
dataFetcher.js → fetchEmergencyAudio() (NO URL generation)
    ↓
data.emergencyAudio.transcription_text
    ↓
adobePdfFormFillerService.js → Add metadata footer
    ↓
PDF Page 18 Field: emergency_audio_transcription (text + metadata only)
```

### Validation Rules

- ✅ **NO URLs** - Text only (critical legal requirement)
- ✅ Transcription text can be empty (optional feature)
- ✅ Metadata footer required if transcription exists
- ✅ Timestamp formatted in UK format (DD/MM/YYYY)
- ✅ Duration displayed as "Xm Ys" format
- ✅ AI transcription disclaimer required

### Example Output Format

```
Hello, I need to report a car accident. I'm at the junction of High Street
and Market Road. A blue Ford Focus has collided with my vehicle, a silver
Toyota Corolla. The other driver appears to be uninjured but is quite shaken.
My passenger has a minor injury to their shoulder. We need police and possibly
an ambulance. The registration of the other vehicle is AB12 CDE. I'm
recording this for my records.

────────────────────────────────────────────────────────────────
RECORDING INFORMATION:
Recorded: Saturday, 16 November 2025 at 14:30:15 GMT
Duration: 2m 15s

Note: This is an AI-generated transcription of emergency audio recorded
during the incident. Transcription accuracy may vary depending on audio
quality and background noise.
```

---

## Summary Table: All 4 Pages

| Page | PDF Field Name | Database Source | Data Type | Transformation | Legal Requirement |
|------|----------------|-----------------|-----------|----------------|-------------------|
| **13** | `ai_summary_of_accident_data_transcription` | `ai_transcription.transcript_text` | TEXT | None | User's own words |
| **14** | `detailed_account_of_what_happened` | `ai_analysis.combined_report` | TEXT | HTML → Plain | 800-1200 words, ALL data |
| **15** | `ai_combined_narrative_and_next_steps` | `ai_analysis.key_points` + `final_review.nextSteps` | TEXT[] + JSONB | Array → Formatted | Bullet + numbered lists |
| **18** | `emergency_audio_transcription` | `ai_listening_transcripts.transcription_text` | TEXT | Add metadata | **TEXT ONLY - NO URLs** |

---

## Data Fetching Reference

**File:** `lib/dataFetcher.js`

### Function: fetchAITranscription(userId) - Page 13

```javascript
// Lines 167-185
const { data: transcription, error: transcriptionError } = await supabase
  .from('ai_transcription')
  .select('*')
  .eq('create_user_id', createUserId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

return {
  id: transcription.id,
  transcription: transcription.transcript_text,
  created_at: transcription.created_at
};
```

### Function: fetchAIAnalysis(userId) - Pages 14 & 15

```javascript
// Lines 187-224
const { data: analysis, error: analysisError } = await supabase
  .from('ai_analysis')
  .select('*')
  .eq('create_user_id', createUserId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

return {
  id: analysis.id,
  combinedReport: analysis.combined_report,     // Page 14
  keyPoints: analysis.key_points,               // Page 15
  finalReview: analysis.final_review,           // Page 15 (nextSteps)
  incidentData: analysis.incident_data,
  created_at: analysis.created_at
};
```

### Function: fetchEmergencyAudio(userId) - Page 18

```javascript
// Lines 132-165 (UPDATED - NO URL generation)
const { data: emergencyAudio, error: emergencyAudioError } = await supabase
  .from('ai_listening_transcripts')
  .select('*')
  .eq('create_user_id', createUserId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// LEGAL REQUIREMENT: NO URLs - transcription text only
if (!emergencyAudio.transcription_text) {
  console.warn('⚠️  Emergency audio has no transcription text (Page 18 will be incomplete)');
}

return {
  id: emergencyAudio.id,
  incident_id: emergencyAudio.incident_id,
  transcription_text: emergencyAudio.transcription_text || '',
  recorded_at: emergencyAudio.recorded_at,
  duration_seconds: emergencyAudio.duration_seconds || null,
  created_at: emergencyAudio.created_at
  // ❌ REMOVED: audio_url - violates legal requirement
};
```

---

## Testing & Verification

### Verification Script

**File:** `scripts/verify-pages-13-18-implementation.js`

**Usage:**
```bash
node scripts/verify-pages-13-18-implementation.js [user-uuid]
```

**Example:**
```bash
node scripts/verify-pages-13-18-implementation.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e
```

### What It Checks

**Code Implementation (8 checks):**
1. Emergency audio URL removal (dataFetcher.js)
2. Page 13 comment mapping (dataFetcher.js)
3. Page 18 legal requirement comment (dataFetcher.js)
4. Page 13 PDF field mapping (adobePdfFormFillerService.js)
5. Page 14 PDF field mapping (adobePdfFormFillerService.js)
6. Page 14 HTML stripping (adobePdfFormFillerService.js)
7. Page 15 PDF field mapping (adobePdfFormFillerService.js)
8. Page 18 PDF field mapping + no URL usage (adobePdfFormFillerService.js)

**Data Verification (4 checks):**
1. Page 13: User transcription exists and has content
2. Page 14: AI analysis exists with 800-1200 word narrative
3. Page 15: Key points and next steps arrays exist
4. Page 18: Emergency audio transcription exists (NO URLs)

### PDF Generation Test

**File:** `test-form-filling.js`

**Usage:**
```bash
node test-form-filling.js [user-uuid]
```

**What It Tests:**
- Complete PDF generation with all 18 pages
- Pages 13-18 field population
- HTML stripping for Page 14
- Array formatting for Page 15
- Metadata formatting for Page 18
- No URL presence in Page 18

---

## Common Issues & Troubleshooting

### Issue 1: Page 13 Empty

**Symptom:** `ai_summary_of_accident_data_transcription` field is blank

**Cause:** User hasn't created transcription content

**Solution:**
1. Navigate to `transcription-status.html`
2. Upload audio file or manually enter text
3. Verify `ai_transcription.transcript_text` has content

### Issue 2: Pages 14-15 Empty

**Symptom:** `detailed_account_of_what_happened` and `ai_combined_narrative_and_next_steps` fields are blank

**Cause:** User hasn't generated AI analysis

**Solution:**
1. Navigate to `transcription-status.html`
2. Click "Generate Comprehensive AI Analysis" button
3. Wait 25-50 seconds for 4-step pipeline
4. Verify `ai_analysis` table has record

### Issue 3: Page 14 Narrative Too Short

**Symptom:** Narrative is < 800 words

**Cause:** Insufficient incident data or AI generation issue

**Solution:**
1. Ensure user completed all pages 1-12 thoroughly
2. Verify `ai_analysis.incident_data` contains all 160+ fields
3. Re-generate AI analysis if needed

### Issue 4: Page 18 Has URL

**Symptom:** Verification script reports URL presence in Page 18

**Cause:** Code regression - emergency audio URL generation added back

**Solution:**
1. Check `lib/dataFetcher.js` lines 132-165
2. Ensure NO `createSignedUrl()` calls for emergency audio
3. Ensure NO `audio_url` field in returned object

---

## File References

| File | Lines | Purpose |
|------|-------|---------|
| `lib/dataFetcher.js` | 132-165 | Emergency audio fetching (NO URLs) |
| `lib/dataFetcher.js` | 167-185 | AI transcription fetching (Page 13) |
| `lib/dataFetcher.js` | 187-224 | AI analysis fetching (Pages 14-15) |
| `src/services/adobePdfFormFillerService.js` | 708-717 | Page 13 PDF mapping |
| `src/services/adobePdfFormFillerService.js` | 742-770 | Page 14 PDF mapping + HTML stripping |
| `src/services/adobePdfFormFillerService.js` | 772-814 | Page 15 PDF mapping + formatting |
| `src/services/adobePdfFormFillerService.js` | 872-908 | Page 18 PDF mapping + metadata |
| `src/controllers/ai.controller.js` | 1-500+ | AI generation pipeline (4 steps) |
| `scripts/verify-pages-13-18-implementation.js` | 1-580 | Verification script |

---

## Legal Compliance Checklist

- [x] **Page 13:** User's own words (not AI-generated) ✅
- [x] **Page 14:** Uses ALL incident data (160+ fields) ✅
- [x] **Page 14:** Temperature 0.3 for legal accuracy ✅
- [x] **Page 14:** 800-1200 words optimal range ✅
- [x] **Page 15:** Factual summary only (no narrative duplication) ✅
- [x] **Page 18:** TEXT ONLY - NO URLs ✅
- [x] **All Pages:** Factual data based on user input only ✅

---

**Document Version:** 1.0
**Last Updated:** 16 November 2025
**Maintained By:** Claude Code
**Status:** Production Ready ✅
