# AI Pages Field Structure - Legal Documentation

**Purpose**: Define fields for AI-generated transcription, analysis, and factual narrative pages
**Legal Context**: These pages may be used as court evidence and must meet legal documentation standards
**Date Created**: 2025-11-01
**Version**: 1.0

---

## CRITICAL LEGAL REQUIREMENTS

### ⚖️ Court Admissibility Standards

**UK Civil Procedure Rules (CPR) - Practice Direction 32 (Evidence)**:
- AI-generated content must be clearly identified
- Source data must be traceable
- Processing methods must be documented
- Human verification/approval required

**Disclosure Requirements**:
- Timestamp when AI processing occurred
- AI model version and provider
- Confidence scores (if available)
- Any human edits/corrections

**Chain of Custody**:
- Original audio file metadata
- Processing timestamps
- Version history if regenerated

---

## PAGE 18: AI TRANSCRIPTION & ANALYSIS

**Page Title**: "AI Transcription & Professional Analysis"

**Purpose**: Present verbatim transcription, AI summary, and recommendations

**Legal Status**: Supporting evidence (requires professional verification)

### Section 1: Document Control (Header Section)

**Purpose**: Legal metadata and version control

#### Fields:
- `ai_page_generated_date` - Auto-populated (DD/MM/YYYY)
- `ai_page_generated_time` - Auto-populated (HH:MM GMT/BST)
- `ai_processing_id` - Auto-populated (UUID for audit trail)
- `ai_model_provider` - Auto-populated (e.g., "OpenAI")
- `ai_model_version` - Auto-populated (e.g., "Whisper v3", "GPT-4")
- `ai_processing_timestamp` - Auto-populated (ISO 8601 format)
- `human_verified` - Checkbox ☐ (Solicitor/barrister verification)
- `verified_by_name` - Text input (Professional's name)
- `verified_date` - Date input (DD/MM/YYYY)
- `verification_signature` - Signature field

**Display Example**:
```
┌─────────────────────────────────────────────────────────┐
│ AI-GENERATED DOCUMENT - REQUIRES PROFESSIONAL REVIEW     │
│                                                           │
│ Generated: 31/10/2025 14:32 GMT                          │
│ Processing ID: a7f3b2c1-4d5e-6789-abcd-ef0123456789      │
│ AI Provider: OpenAI (Whisper v3, GPT-4o)                 │
│                                                           │
│ ☐ Verified by legal professional                         │
│ Name: ________________  Date: __________  Sign: ______    │
└─────────────────────────────────────────────────────────┘
```

---

### Section 2: Audio Recording Metadata

**Purpose**: Chain of custody for original evidence

#### Fields:
- `audio_file_name` - Auto-populated (e.g., "incident_recording_2025-10-31.m4a")
- `audio_file_size` - Auto-populated (e.g., "12.3 MB")
- `audio_duration` - Auto-populated (e.g., "8 minutes 42 seconds")
- `audio_recorded_date` - Auto-populated (from file metadata)
- `audio_recorded_device` - Auto-populated if available (e.g., "iPhone 15 Pro")
- `audio_quality_score` - Auto-populated (e.g., "Good (87/100)")
- `audio_storage_url` - Internal reference (Supabase bucket path)

**Display Example**:
```
Original Recording Details:
• File: incident_recording_2025-10-31.m4a (12.3 MB)
• Duration: 8 minutes 42 seconds
• Recorded: 31/10/2025 09:15 GMT
• Device: iPhone 15 Pro
• Audio Quality: Good (87/100)
• Storage Reference: [Internal: supabase://user-audio/uuid]
```

---

### Section 3: Verbatim Transcription

**Purpose**: Complete, unedited AI transcription of audio recording

#### Fields:
- `transcription_text` - Large textarea (10,000 character limit)
- `transcription_language` - Auto-populated (e.g., "English (UK)")
- `transcription_confidence` - Auto-populated (e.g., "94% average confidence")
- `transcription_word_count` - Auto-populated (e.g., "1,247 words")

**Legal Disclaimer** (printed on page):
> **IMPORTANT LEGAL NOTICE**
> This is an AI-generated transcription and may contain errors. The original audio recording remains the primary evidence. Any party relying on this transcription should verify accuracy against the original audio file.

**Display Example**:
```
VERBATIM TRANSCRIPTION (AI-Generated)
Language: English (UK) | Confidence: 94% | Word Count: 1,247 words

─────────────────────────────────────────────────────────

[00:00:00] "Okay, so I'm recording this right after the accident
happened. I'm still at the scene. Um, it's about 9:15 in the
morning on October 31st, 2025. I'm on the A40 Westway near
White City junction..."

[Continues for full transcription - large text area]

─────────────────────────────────────────────────────────

⚠️ AI-GENERATED TRANSCRIPTION - VERIFY AGAINST ORIGINAL AUDIO
Processed by: OpenAI Whisper v3 | Average Confidence: 94%
```

---

### Section 4: AI-Generated Summary

**Purpose**: Concise extraction of key facts from transcription

#### Fields:
- `ai_summary_text` - Textarea (2,000 character limit)
- `ai_summary_key_points` - Textarea (bullet points, 1,000 chars)
- `ai_summary_generated_by` - Auto-populated (e.g., "GPT-4o")
- `ai_summary_timestamp` - Auto-populated (ISO 8601)

**Display Example**:
```
AI-GENERATED SUMMARY
Generated by: GPT-4o | Timestamp: 2025-10-31T14:32:15Z

Key Points Extracted:
• Accident occurred 31/10/2025 at approximately 09:15 GMT
• Location: A40 Westway near White City junction, London
• Weather conditions: Light rain, wet road surface
• User was traveling westbound at approximately 40 mph
• Speed limit: 40 mph
• Other vehicle: Silver Ford Focus, registration AB12 CDE
• Other driver failed to indicate before lane change
• Impact: Rear-left quarter panel of user's vehicle
• No injuries reported at scene
• Police not called, details exchanged
• Dashcam footage captured incident

Summary Narrative:
[AI-generated concise summary in paragraph form - 200-300 words]

─────────────────────────────────────────────────────────

⚠️ AI-GENERATED SUMMARY - SUBJECT TO PROFESSIONAL REVIEW
This summary was automatically generated and may require verification.
```

---

### Section 5: AI Recommendations & Advice

**Purpose**: AI-generated suggested actions and legal considerations

#### Fields:
- `ai_advice_immediate_actions` - Textarea (500 chars)
- `ai_advice_evidence_gaps` - Textarea (500 chars)
- `ai_advice_legal_considerations` - Textarea (500 chars)
- `ai_advice_next_steps` - Textarea (500 chars)

**Legal Disclaimer** (prominent):
> **NOT LEGAL ADVICE**
> This section contains AI-generated suggestions only. It does NOT constitute legal advice and should NOT be relied upon without consulting a qualified solicitor. The information is provided for general guidance only.

**Display Example**:
```
AI-GENERATED RECOMMENDATIONS
⚠️ NOT LEGAL ADVICE - CONSULT A QUALIFIED SOLICITOR

Immediate Actions Suggested:
• Obtain independent medical assessment within 7 days
• Request dashcam footage from nearby businesses
• Preserve all physical evidence (clothing, damaged items)
• Contact insurance company within 24 hours

Evidence Gaps Identified:
• No independent witness statements obtained
• No photos of road conditions at time of incident
• Other driver's insurance details not verified
• No measurement of skid marks (if any)

Legal Considerations:
• Potential liability claim against other driver
• Consider personal injury claim if symptoms develop
• Document all medical appointments and expenses
• Keep detailed record of time off work

Next Steps Recommended:
1. Consult qualified personal injury solicitor
2. Obtain copy of other driver's insurance policy
3. Request CCTV footage (within 30-day retention period)
4. Medical examination if any symptoms develop

─────────────────────────────────────────────────────────

⚠️ DISCLAIMER: AI-GENERATED SUGGESTIONS ONLY
This is NOT legal advice. Always consult a qualified solicitor
before taking action. Generated: 31/10/2025 14:32 GMT
```

---

### Section 6: Professional Review Section

**Purpose**: Space for solicitor/barrister to add notes

#### Fields:
- `professional_review_notes` - Large textarea (2,000 chars)
- `professional_corrections` - Textarea (1,000 chars)
- `professional_name` - Text input
- `professional_firm` - Text input
- `professional_sra_number` - Text input (SRA registration number)
- `professional_review_date` - Date input (DD/MM/YYYY)
- `professional_signature` - Signature field

**Display Example**:
```
PROFESSIONAL REVIEW & VERIFICATION
(To be completed by qualified solicitor/barrister)

Review Notes:
┌─────────────────────────────────────────────────────────┐
│                                                           │
│ [Large textarea for professional notes]                   │
│                                                           │
└─────────────────────────────────────────────────────────┘

Corrections/Amendments:
┌─────────────────────────────────────────────────────────┐
│                                                           │
│ [Textarea for corrections]                                │
│                                                           │
└─────────────────────────────────────────────────────────┘

Reviewed by:
Name: _________________________  Firm: ____________________
SRA Number: _______________  Date: __________  Sign: ______
```

---

## PAGE 19: AI FACTUAL NARRATIVE

**Page Title**: "AI-Generated Factual Account of Incident"

**Purpose**: Chronological, third-person narrative combining all evidence

**Legal Status**: Secondary evidence (synthesized from primary sources)

### Section 1: Document Control (Header Section)

**Purpose**: Legal metadata and version control

#### Fields:
- `narrative_generated_date` - Auto-populated (DD/MM/YYYY)
- `narrative_generated_time` - Auto-populated (HH:MM GMT/BST)
- `narrative_version` - Auto-populated (e.g., "v1.0")
- `narrative_regeneration_count` - Auto-populated (e.g., "Generated 1 time")
- `narrative_sources_count` - Auto-populated (e.g., "Based on 12 data sources")
- `narrative_ai_model` - Auto-populated (e.g., "GPT-4o")
- `human_approved` - Checkbox ☐
- `approved_by_name` - Text input
- `approved_date` - Date input (DD/MM/YYYY)
- `approval_signature` - Signature field

**Display Example**:
```
┌─────────────────────────────────────────────────────────┐
│ AI-GENERATED FACTUAL NARRATIVE - REQUIRES VERIFICATION   │
│                                                           │
│ Generated: 31/10/2025 14:45 GMT | Version: 1.0           │
│ Based on: 12 data sources (form data + transcription)    │
│ AI Model: GPT-4o | Regenerated: 0 times                  │
│                                                           │
│ ☐ Approved by legal professional                         │
│ Name: ________________  Date: __________  Sign: ______    │
└─────────────────────────────────────────────────────────┘
```

---

### Section 2: Data Sources Matrix

**Purpose**: Transparency about what data was used to generate narrative

#### Fields:
- `sources_form_fields` - Auto-populated (e.g., "98 form fields completed")
- `sources_transcription` - Auto-populated (e.g., "1,247 words transcribed")
- `sources_photos` - Auto-populated (e.g., "12 photos uploaded")
- `sources_witness_statements` - Auto-populated (e.g., "2 witness statements")
- `sources_medical_records` - Auto-populated (e.g., "0 medical records")
- `sources_police_report` - Auto-populated (e.g., "No police report")
- `sources_other_documents` - Auto-populated (e.g., "3 documents attached")

**Display Example**:
```
DATA SOURCES USED TO GENERATE NARRATIVE
✓ Form Fields: 98 fields completed
✓ Audio Transcription: 1,247 words (8 min 42 sec)
✓ Photographs: 12 images (scene, vehicles, damage)
✓ Witness Statements: 2 independent witnesses
✗ Medical Records: None attached
✗ Police Report: Police not called
✓ Other Documents: 3 documents (insurance, repair quote)

Total Sources: 12 primary evidence items
```

---

### Section 3: Timeline of Events

**Purpose**: Chronological breakdown extracted from all sources

#### Fields:
- `timeline_events` - Auto-generated structured list (10-20 events)
- Each event contains:
  - `timeline_event_time` - Time (HH:MM)
  - `timeline_event_description` - Text (200 chars)
  - `timeline_event_source` - Text (e.g., "User statement", "Transcription")

**Display Example**:
```
CHRONOLOGICAL TIMELINE
(All times in GMT/BST)

09:00 - User departed home address (123 High Street, London)
        Source: User statement (Form field: departure_time)

09:12 - User traveling westbound on A40 Westway
        Source: Audio transcription [00:00:45]

09:14 - Weather conditions: Light rain began
        Source: User statement (Form field: weather_conditions)

09:15 - Position: Approaching White City junction
        Source: Audio transcription [00:01:23]

09:15:30 - Other vehicle (Silver Ford Focus, AB12 CDE) in adjacent lane
           Source: User statement (Form field: other_vehicle_description)

09:15:45 - Other vehicle began lane change without signaling
           Source: Audio transcription [00:02:15]

09:15:50 - User applied brakes (estimated speed reduced from 40 to 25 mph)
           Source: User statement (Form field: your_speed)

09:15:52 - COLLISION OCCURRED - Impact to rear-left quarter panel
           Source: Audio transcription [00:02:45] + Photo evidence

09:16 - Both vehicles pulled to hard shoulder
        Source: Audio transcription [00:03:20]

09:18 - Drivers exchanged details, no police called
        Source: User statement (Form field: police_attended = No)

09:25 - Photos taken of damage and scene
        Source: Photo metadata (12 images, timestamp 09:25-09:31)

09:35 - User departed scene (vehicle still drivable)
        Source: User statement (Form field: damage_still_driveable = Yes)

14:30 - User completed incident report form
        Source: System timestamp (Form submission)
```

---

### Section 4: Factual Narrative (Storybook Style)

**Purpose**: Readable, third-person account suitable for court presentation

#### Fields:
- `narrative_full_text` - Very large textarea (15,000 character limit)
- `narrative_word_count` - Auto-populated (e.g., "2,450 words")
- `narrative_reading_time` - Auto-populated (e.g., "~10 minutes")
- `narrative_style` - Auto-populated ("Formal legal narrative, third-person")

**Legal Notice** (printed above narrative):
> **LEGAL STATUS OF THIS NARRATIVE**
> This is an AI-generated synthesis of evidence provided by the claimant and supporting documentation. It does NOT constitute a witness statement under CPR Part 22 and has NOT been verified by oath or affirmation. All facts should be cross-referenced with primary sources. This document is intended to assist legal professionals in understanding the incident chronology only.

**Writing Style Guidelines** (for AI model):
- Third-person perspective ("The claimant", "Mr/Ms [Name]")
- Past tense throughout
- Objective, factual tone
- No opinions or speculation
- Quote direct evidence where available
- Clearly mark uncertainties ("The claimant recalls...", "According to the transcription...")
- Use precise language ("approximately", "estimated", "reported")
- Include sensory details from transcription (weather, sounds, observations)
- Maintain chronological flow
- Separate facts from inference

**Display Example**:
```
AI-GENERATED FACTUAL NARRATIVE
Word Count: 2,450 words | Reading Time: ~10 minutes
Style: Formal legal narrative, third-person perspective

⚠️ LEGAL NOTICE: This AI-generated narrative synthesizes evidence
provided by the claimant. It is NOT a sworn witness statement
under CPR Part 22. All facts should be verified against primary
sources. Intended for legal professional review only.

─────────────────────────────────────────────────────────

THE INCIDENT: ROAD TRAFFIC COLLISION ON A40 WESTWAY

On the morning of Tuesday, 31st October 2025, at approximately
09:15 hours GMT, a road traffic collision occurred on the A40
Westway near the White City junction in West London. The incident
involved two vehicles: a [User's Vehicle Make/Model] driven by
the claimant, Mr/Ms [Full Name], registration [REG], and a silver
Ford Focus motor vehicle, registration AB12 CDE, driven by
[Other Driver Name].

BACKGROUND AND JOURNEY COMMENCEMENT

According to the claimant's statement, the journey commenced at
approximately 09:00 hours from the claimant's home address at
[Address]. The purpose of the journey was [Purpose]. The claimant
reports that they were familiar with the route and had traveled
it regularly for [Context].

Weather conditions at the commencement of the journey were
described as overcast with light precipitation. The claimant
specifically recalls that light rain began falling at approximately
09:14 hours, as recorded in the audio transcription at timestamp
[00:01:12]. Road surface conditions were consequently wet but not
waterlogged.

THE APPROACH TO THE COLLISION POINT

At approximately 09:12 hours, the claimant was traveling westbound
on the A40 Westway dual carriageway. The claimant states that
their vehicle was positioned in the nearside (left-hand) lane,
traveling at approximately 40 miles per hour. This speed was
consistent with the posted speed limit of 40 mph for that section
of roadway, as confirmed by the claimant in the incident report
form (Field: speed_limit = 40 mph).

Traffic density is described by the claimant as "moderate" with
steady flow. Visibility was categorized as "good" despite the
light rain, with an estimated visibility range of 100-200 metres.
Road markings were reported as clearly visible.

As the claimant approached the White City junction at approximately
09:15 hours, they observed a silver Ford Focus motor vehicle in
the offside (right-hand) lane, traveling in the same westbound
direction at a similar speed. The transcription records the
claimant stating: "There was a silver Ford Focus next to me,
maybe slightly ahead" [Timestamp 00:01:23].

THE COLLISION SEQUENCE

At approximately 09:15:45 hours, according to the claimant's
audio recording, the silver Ford Focus began to maneuver from
the offside lane toward the nearside lane occupied by the
claimant's vehicle. The claimant specifically reports that no
turn signal (indicator) was observed prior to this maneuver.
The transcription records: "He just started coming over into my
lane, no indicator, nothing" [Timestamp 00:02:15].

The claimant reports taking immediate evasive action by applying
the vehicle's brakes. The claimant estimates that vehicle speed
reduced from approximately 40 mph to approximately 25 mph in the
seconds before impact. However, the lateral movement of the Ford
Focus continued, resulting in contact between the vehicles.

The collision occurred at approximately 09:15:52 hours. The point
of impact was to the rear-left quarter panel of the claimant's
vehicle, as confirmed by photographic evidence (Images 4-7,
timestamp 09:25-09:27). The claimant describes feeling a "hard
jolt" and hearing the sound of metal contact. The airbags in the
claimant's vehicle did NOT deploy, and the claimant confirms that
seat belts were in use at the time of impact.

IMMEDIATE POST-COLLISION ACTIONS

Following the collision, both vehicles came to a controlled stop
on the hard shoulder of the A40 Westway, approximately 50 metres
west of the collision point. The claimant's audio recording
captures this sequence: "We've both pulled over onto the hard
shoulder now" [Timestamp 00:03:20].

The claimant and the other driver exited their respective vehicles
at approximately 09:16 hours. The claimant reports that both
parties were visibly shaken but neither reported injuries at the
scene. The claimant's incident report form confirms no medical
attention was required (Field: medical_attention_needed = No).

EXCHANGE OF DETAILS

Between approximately 09:16 and 09:20 hours, the claimant and
the other driver exchanged mandatory information as required by
the Road Traffic Act 1988. Details exchanged included:

• Full names
• Contact telephone numbers
• Vehicle registration numbers
• Insurance company details
• Address information

The claimant reports that the other driver, [Other Driver Name],
was "polite but nervous" and did not admit fault at the scene.
According to the transcription, the other driver stated: "I didn't
see you there, I'm really sorry" [Timestamp 00:04:56]. The
claimant notes this is not an explicit admission of liability.

Neither party contacted the police, as there were no injuries
and both vehicles remained drivable. This decision was mutual
and is consistent with Metropolitan Police guidance for non-injury
collisions.

EVIDENCE GATHERING AT SCENE

Between approximately 09:25 and 09:31 hours, the claimant captured
photographic evidence using a mobile telephone device (iPhone 15
Pro). A total of twelve (12) photographs were taken, depicting:

• Damage to claimant's vehicle (rear-left quarter panel) - 4 photos
• Damage to other vehicle (front-right bumper) - 3 photos
• Overall scene including road layout - 3 photos
• Vehicle registration plates - 2 photos

Photographic metadata confirms these images were captured on
31/10/2025 between 09:25:14 and 09:31:47 GMT, at location
coordinates [Lat/Long from what3words or GPS if available].

No independent witness statements were obtained at the scene.
The claimant reports that other vehicles passed by but did not
stop. CCTV coverage at this location is unknown but may exist
via Transport for London (TfL) cameras.

DEPARTURE FROM SCENE

At approximately 09:35 hours, both parties departed the scene.
The claimant's vehicle remained drivable despite visible damage
to the rear-left quarter panel and rear bumper. The claimant
drove directly to [Destination] without incident. The claimant
did not require recovery services (Field: recovery_company_name
= [blank]).

SUBSEQUENT ACTIONS

At 14:30 hours on the same day (31/10/2025), the claimant
completed a comprehensive incident report form via the Car Crash
Lawyer AI online portal. This report captured 98 data fields
covering all aspects of the incident, including weather conditions,
road layout, vehicle details, and damage assessment.

The claimant also recorded an audio statement lasting 8 minutes
42 seconds, providing a verbal account of the incident while
details were fresh in memory. This recording was subsequently
transcribed using AI speech-to-text technology (OpenAI Whisper v3)
with an average confidence score of 94%.

SUMMARY OF KEY FACTS

Based on the evidence provided by the claimant and supporting
documentation, the following facts are established:

1. Date and Time: 31/10/2025 at approximately 09:15 hours GMT
2. Location: A40 Westway near White City junction, London
3. Weather: Light rain, wet road surface
4. Claimant's Speed: ~40 mph (within speed limit)
5. Collision Cause: Other vehicle lane change without signaling
6. Point of Impact: Rear-left quarter panel of claimant's vehicle
7. Injuries: None reported by either party
8. Police: Not called (mutual decision, no injuries)
9. Evidence: 12 photographs, audio statement, form data

AREAS REQUIRING FURTHER INVESTIGATION

The following aspects may require additional evidence or
clarification:

1. Independent witness statements (none obtained)
2. CCTV footage from TfL cameras (if available)
3. Dashcam footage (claimant's vehicle not equipped)
4. Other driver's account of the incident
5. Vehicle damage repair estimates
6. Long-term medical assessment (if symptoms develop)

This factual narrative is based exclusively on evidence provided
by or on behalf of the claimant. It represents one perspective
of the incident and should be considered alongside all other
available evidence, including any statement from the other driver
and independent sources.

─────────────────────────────────────────────────────────

END OF NARRATIVE

Generated: 31/10/2025 14:45 GMT
AI Model: GPT-4o (Version 2025-10-15)
Word Count: 2,450 words
Sources: 12 data items (form + transcription + photos)

⚠️ AI-GENERATED NARRATIVE - PROFESSIONAL VERIFICATION REQUIRED
This narrative synthesizes evidence but is NOT a sworn statement.
All facts should be verified against primary sources before use
in legal proceedings.
```

---

### Section 5: Fact-Checking Matrix

**Purpose**: Cross-reference key facts across multiple sources

#### Fields:
- Auto-generated table with columns:
  - `fact_statement` - Text (e.g., "Collision occurred at 09:15")
  - `source_1` - Text (e.g., "User statement")
  - `source_2` - Text (e.g., "Audio transcription")
  - `source_3` - Text (e.g., "Photo metadata")
  - `confidence` - Text (e.g., "High - 3 sources agree")

**Display Example**:
```
FACT-CHECKING CROSS-REFERENCE

| Fact                        | Source 1        | Source 2      | Source 3    | Confidence |
|-----------------------------|-----------------|---------------|-------------|------------|
| Date: 31/10/2025            | Form field      | Transcription | Photo data  | HIGH ✓     |
| Time: ~09:15                | Form field      | Transcription | —           | MEDIUM     |
| Location: A40 near WC       | Form field      | Transcription | GPS data    | HIGH ✓     |
| Weather: Light rain         | Form field      | Transcription | —           | MEDIUM     |
| User speed: ~40 mph         | Form field      | Transcription | —           | MEDIUM     |
| Other car: Silver Ford      | Form field      | Transcription | Photo       | HIGH ✓     |
| Other reg: AB12 CDE         | Form field      | Transcription | Photo       | HIGH ✓     |
| No indicator used           | Form field      | Transcription | —           | MEDIUM     |
| Impact: Rear-left panel     | Form field      | Transcription | Photo       | HIGH ✓     |
| No injuries                 | Form field      | Transcription | —           | MEDIUM     |
| Police not called           | Form field      | Transcription | —           | MEDIUM     |
| Vehicle drivable            | Form field      | Transcription | —           | MEDIUM     |

Legend:
✓ HIGH = 3+ sources agree
  MEDIUM = 2 sources agree
  LOW = 1 source only (requires verification)
```

---

### Section 6: Professional Review & Approval

**Purpose**: Space for solicitor to verify narrative accuracy

#### Fields:
- `professional_review_narrative` - Large textarea (2,000 chars)
- `professional_factual_corrections` - Textarea (1,000 chars)
- `professional_additional_evidence_needed` - Textarea (500 chars)
- `narrative_approved` - Checkbox ☐
- `narrative_rejected` - Checkbox ☐ (with reason field)
- `professional_name_narrative` - Text input
- `professional_firm_narrative` - Text input
- `professional_sra_number_narrative` - Text input
- `professional_review_date_narrative` - Date input
- `professional_signature_narrative` - Signature field

**Display Example**:
```
PROFESSIONAL VERIFICATION OF NARRATIVE
(To be completed by qualified solicitor/barrister)

Narrative Review:
┌─────────────────────────────────────────────────────────┐
│                                                           │
│ [Large textarea for professional assessment]              │
│                                                           │
└─────────────────────────────────────────────────────────┘

Factual Corrections Required:
┌─────────────────────────────────────────────────────────┐
│                                                           │
│ [Textarea for corrections]                                │
│                                                           │
└─────────────────────────────────────────────────────────┘

Additional Evidence Needed:
┌─────────────────────────────────────────────────────────┐
│                                                           │
│ [Brief textarea]                                          │
│                                                           │
└─────────────────────────────────────────────────────────┘

Status:
☐ APPROVED - Narrative accurate and suitable for use
☐ REJECTED - Requires amendments (see notes above)

Verified by:
Name: _________________________  Firm: ____________________
SRA Number: _______________  Date: __________  Sign: ______
```

---

## SUMMARY: TOTAL FIELD COUNT

### Page 18: AI Transcription & Analysis
- **Document Control**: 10 fields
- **Audio Metadata**: 7 fields
- **Transcription**: 4 fields
- **AI Summary**: 4 fields
- **AI Recommendations**: 4 fields
- **Professional Review**: 7 fields
- **TOTAL PAGE 18**: **36 fields**

### Page 19: AI Factual Narrative
- **Document Control**: 9 fields
- **Data Sources**: 7 fields
- **Timeline**: 1 structured field (10-20 events)
- **Narrative**: 4 fields
- **Fact-Checking**: 1 structured field (matrix)
- **Professional Review**: 10 fields
- **TOTAL PAGE 19**: **32 fields**

---

## PDF FORM IMPLEMENTATION NOTES

### Auto-Population Fields
All fields marked "Auto-populated" should be filled by the Node.js backend using:

```javascript
// Example: Page 18 document control
pdfForm.getField('ai_page_generated_date').setText(
  new Date().toLocaleDateString('en-GB')
);
pdfForm.getField('ai_model_version').setText('Whisper v3, GPT-4o');
pdfForm.getField('ai_processing_id').setText(uuidv4());

// Example: Transcription data
pdfForm.getField('transcription_text').setText(
  transcriptionData.transcript_text
);
pdfForm.getField('transcription_confidence').setText(
  `${Math.round(transcriptionData.confidence * 100)}% average confidence`
);

// Example: AI-generated narrative
const narrativeText = await generateFactualNarrative({
  formData: incidentData,
  transcription: transcriptionData.transcript_text,
  photos: photoMetadata,
  witnesses: witnessStatements
});
pdfForm.getField('narrative_full_text').setText(narrativeText);
```

---

### OpenAI API Calls Required

**For Page 18 - AI Summary**:
```javascript
// Call GPT-4o to summarize transcription
const summaryPrompt = `
Analyze this accident transcription and provide:
1. Concise summary (200-300 words)
2. Key facts as bullet points
3. Immediate action recommendations
4. Evidence gaps identified

Transcription:
${transcriptionText}
`;

const summary = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: summaryPrompt }],
  temperature: 0.3 // Low temperature for factual accuracy
});
```

**For Page 19 - Factual Narrative**:
```javascript
// Call GPT-4o to generate legal narrative
const narrativePrompt = `
You are generating a factual account for potential use in UK court proceedings.

CRITICAL REQUIREMENTS:
- Third-person perspective only
- Past tense throughout
- Objective, factual tone - NO opinions or speculation
- Quote direct evidence where available
- Mark uncertainties clearly ("The claimant recalls...", "According to...")
- Use precise legal language
- Maintain strict chronological order
- Separate facts from inference
- Include all relevant details (weather, time, location, actions)

STYLE: Formal legal narrative suitable for court disclosure

DATA SOURCES:
${JSON.stringify({
  formData: incidentData,
  transcription: transcriptionText,
  photos: photoMetadata,
  witnesses: witnessStatements
}, null, 2)}

Generate a comprehensive factual narrative (2000-2500 words) that synthesizes
all evidence into a coherent, chronological account. Start with background,
then approach to collision, collision sequence, immediate aftermath, evidence
gathering, and summary of key facts.
`;

const narrative = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: narrativePrompt }],
  temperature: 0.1, // Very low for maximum factual accuracy
  max_tokens: 4000
});
```

---

### Database Schema Updates Required

**New tables needed**:

```sql
-- Store AI processing metadata
CREATE TABLE ai_processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  create_user_id UUID REFERENCES auth.users(id),
  incident_report_id UUID REFERENCES incident_reports(id),

  -- Processing details
  processing_type TEXT CHECK (processing_type IN ('transcription', 'summary', 'narrative')),
  ai_model_provider TEXT DEFAULT 'OpenAI',
  ai_model_version TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Results
  output_text TEXT,
  confidence_score DECIMAL(3,2),
  word_count INTEGER,
  processing_duration_ms INTEGER,

  -- Metadata
  input_sources JSONB, -- List of data sources used
  regeneration_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store professional verification
CREATE TABLE ai_content_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_job_id UUID REFERENCES ai_processing_jobs(id),

  verified_by_name TEXT,
  verified_by_firm TEXT,
  verified_by_sra_number TEXT,
  verification_status TEXT CHECK (verification_status IN ('approved', 'rejected', 'pending')),
  verification_notes TEXT,
  corrections_required TEXT,
  verified_at TIMESTAMPTZ,
  signature_data TEXT, -- Base64 encoded signature

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## LEGAL DISCLAIMERS (Required on Both Pages)

### Footer Disclaimer (All AI pages):
```
⚠️ IMPORTANT LEGAL NOTICE

This document contains AI-generated content and has NOT been verified by a
qualified legal professional. It should NOT be relied upon for legal proceedings
without independent verification of all facts against primary sources.

This is NOT a witness statement under Civil Procedure Rules Part 22 and has
NOT been verified by oath or affirmation. The content is provided for general
information purposes only and does NOT constitute legal advice.

Any party seeking to rely on this document in legal proceedings should:
1. Verify all facts against original source materials
2. Obtain independent legal advice from a qualified solicitor
3. Ensure the content is reviewed and approved by legal counsel
4. Understand that AI-generated content may contain errors

Generated by: Car Crash Lawyer AI System
AI Provider: OpenAI (Whisper, GPT-4o)
Generated: [DATE] [TIME] GMT/BST
Processing ID: [UUID]

For legal advice, please consult a qualified solicitor regulated by the
Solicitors Regulation Authority (SRA).
```

---

## ACCESSIBILITY CONSIDERATIONS

### Screen Reader Support
- All auto-populated fields should have aria-labels
- Legal disclaimers should have role="alert" for importance
- Timeline should use semantic HTML lists
- Narrative should have clear heading structure

### Print Optimization
- Page breaks after each major section
- Avoid splitting narrative mid-paragraph
- Ensure signatures print clearly
- Include page numbers: "Page 18 of 19", "Page 19 of 19"

---

## VERSION CONTROL & REGENERATION

If narrative is regenerated (e.g., after user adds more evidence):

1. **Increment version number**: v1.0 → v1.1
2. **Store previous version** in database
3. **Add regeneration note**:
   ```
   REGENERATION NOTICE
   This narrative was regenerated on [DATE] at [TIME] to incorporate
   additional evidence. Previous version (v1.0) archived.

   Changes: Added witness statement from [Name], incorporated medical report
   ```
4. **Require fresh professional review** if content changed significantly

---

## NEXT STEPS FOR IMPLEMENTATION

1. **Create HTML mockups** for Pages 18-19 (like existing pages 1-17)
2. **Update database schema** (add ai_processing_jobs and ai_content_verification tables)
3. **Implement OpenAI API calls** for summary and narrative generation
4. **Create PDF form fields** in Adobe Acrobat Pro
5. **Build backend service** (src/services/aiNarrativeService.js)
6. **Add to PDF generation pipeline** (lib/generators/pdfGenerator.js)
7. **Create verification workflow** for legal professionals
8. **Test with real incident data** to ensure narrative quality

---

**Document Status**: Draft for review
**Last Updated**: 2025-11-01
**Version**: 1.0
**Next Review**: After client approval of field structure
