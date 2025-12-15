# Architectural Plan: Pages 13-18 AI Transcription & Analysis System

**Date:** 2025-11-16
**Project:** Car Crash Lawyer AI - Legal Document Generation
**Version:** 2.0 - Fresh Architecture
**Status:** 🎯 Ready for Implementation

---

## Executive Summary

This document defines a complete architectural redesign for the transcription and AI analysis system (PDF Pages 13-18), focusing on creating a **legal-grade document** comparable to a closing statement. The design prioritizes:

1. **Factual accuracy** - All AI-generated content based strictly on user input
2. **Comprehensive data integration** - Using ALL pages 1-12 data + transcription
3. **Legal document standards** - Full text only, NO URLs
4. **Clear data flow** - UI/UX → Database → PDF with complete traceability

---

## Page Allocation & Purpose

| Page | Purpose | Data Source | PDF Field(s) |
|------|---------|-------------|--------------|
| **13** | User's Direct Statement | ai_transcription.transcript_text | `ai_summary_of_accident_data_transcription` |
| **14** | AI Comprehensive Narrative<br>**(CENTRE PIECE)** | ai_analysis.combined_report<br>(using ALL pages 1-12 + transcription) | **NEW FIELD REQUIRED**<br>`ai_comprehensive_narrative` |
| **15** | AI Bullet Points + Next Steps Guide | ai_analysis.key_points<br>ai_analysis.final_review.nextSteps | **NEW FIELDS REQUIRED**<br>`ai_key_points`<br>`ai_next_steps` |
| **18** | Emergency Audio Transcription<br>(Eavesdropping) | ai_listening_transcripts.transcription_text | `emergency_audio_transcription`<br>`emergency_recording_timestamp` |

---

## Current State Analysis

### ✅ What Works Well

1. **ai_analysis Table Structure (migration 013)**
   - `combined_report` column perfect for Page 14 comprehensive narrative
   - `key_points` TEXT[] array for Page 15 bullet points
   - `final_review` JSONB with nextSteps[] for Page 15 guide
   - RLS policies ensure user data isolation

2. **AI Controller (src/controllers/ai.controller.js)**
   - 4-step GPT-4o analysis pipeline already implemented
   - Temperature 0.7 appropriate for legal context
   - Proper error handling and logging
   - Database storage working correctly

3. **Data Fetcher (lib/dataFetcher.js)**
   - Already fetches ai_analysis data (lines 200-228)
   - Already fetches ai_transcription data (lines 163-194)
   - Already fetches emergency audio (lines 132-157)
   - Metadata tracking comprehensive

4. **Page 18 Emergency Audio**
   - Fields exist: `emergency_audio_transcription`, `emergency_recording_timestamp`
   - Data pipeline working (ai_listening_transcripts table)

### ❌ Critical Gaps

1. **Page 14 PDF Field Missing**
   - No dedicated field in PDF template for comprehensive narrative
   - Currently using `detailed_account_of_what_happened` which is also Page 6 field
   - **REQUIRED:** New PDF field `ai_comprehensive_narrative`

2. **Page 15 PDF Fields Missing**
   - No fields for bullet points
   - No fields for next steps guide
   - **REQUIRED:** New PDF fields `ai_key_points`, `ai_next_steps`

3. **AI Prompt Uses Limited Data**
   - ai.controller.js lines 190-196 only use 7 fields:
     - Date, time, location, weather, medical status, vehicle make/model, other driver
   - **REQUIRED:** Use ALL 160+ incident_reports fields + witnesses + vehicles
   - User wants comprehensive legal narrative using complete dataset

4. **URL Fields Violate Legal Requirements**
   - Page 18 sets `emergency_audio_url` (pdfGenerator.js line 478)
   - dataFetcher.js generates signed URLs for audio (lines 146-153)
   - **REQUIRED:** Remove all URL fields, full text only

5. **Field Mapping Confusion**
   - Comments say emergencyAudio = Page 15 (dataFetcher.js line 399)
   - Comments say aiAnalysis = Pages 13 & 18 (dataFetcher.js line 402)
   - **ACTUAL USER REQUIREMENT:** Page 13 = transcription, Page 14 = narrative, Page 15 = bullets/steps, Page 18 = emergency

---

## Proposed Architecture

### Phase 1: PDF Template Updates

**Action:** Update PDF template to add 3 new fields

**New Fields Required:**

```javascript
// Page 14 - Comprehensive AI Narrative (multi-paragraph text field)
ai_comprehensive_narrative: PDFTextField
  - Type: Text (allow multi-line)
  - Size: Large (full page minus header/footer)
  - Font: 10pt serif (legal document style)
  - Purpose: Closing statement quality narrative

// Page 15 - AI Bullet Points (formatted list)
ai_key_points: PDFTextField
  - Type: Text (allow multi-line)
  - Size: Half page
  - Font: 10pt sans-serif
  - Format: "• Point 1\n• Point 2\n• Point 3..."

// Page 15 - Next Steps Guide (formatted list)
ai_next_steps: PDFTextField
  - Type: Text (allow multi-line)
  - Size: Half page
  - Font: 10pt sans-serif
  - Format: "1. Action item\n2. Action item\n3. Action item..."
```

**Alternative:** If PDF template cannot be modified, repurpose existing fields:
- Page 14: Use `ai_summary_of_accident_data` (currently underutilized)
- Page 15: Split `detailed_account_of_what_happened` into two sections

---

### Phase 2: AI Prompt Enhancement

**File:** `src/controllers/ai.controller.js`

**Current Limitation (lines 181-200):**
```javascript
Incident Details from Form:
- Date: ${incidentData.when_did_the_accident_happen || 'Not specified'}
- Time: ${incidentData.what_time_did_the_accident_happen || 'Not specified'}
- Location: ${incidentData.where_exactly_did_this_happen || 'Not specified'}
// ... only 7 fields total
```

**New Comprehensive Approach:**

```javascript
/**
 * Generate closing statement quality narrative using ALL incident data
 *
 * Data sources:
 * - Personal statement (transcription)
 * - Incident details (160+ fields from incident_reports)
 * - Witness statements (up to 3 witnesses)
 * - Other vehicles (up to 5 vehicles)
 * - Medical information
 * - Road conditions, weather, lighting
 * - Police involvement
 * - Insurance details
 * - Vehicle damage assessments
 */
async function generateClosingStatementNarrative(transcription, fullIncidentData) {

  // Extract comprehensive data structure
  const comprehensiveData = {
    // SECTION 1: Incident Overview
    incident: {
      date: fullIncidentData.when_did_the_accident_happen,
      time: fullIncidentData.what_time_did_the_accident_happen,
      location: {
        address: fullIncidentData.where_exactly_did_this_happen,
        what3words: fullIncidentData.what3words_location,
        coordinates: fullIncidentData.location_coordinates,
        roadType: fullIncidentData.road_type,
        speedLimit: fullIncidentData.speed_limit
      }
    },

    // SECTION 2: Environmental Conditions
    conditions: {
      weather: extractWeatherConditions(fullIncidentData),
      lighting: fullIncidentData.lighting_conditions,
      roadSurface: fullIncidentData.road_surface_conditions,
      visibility: fullIncidentData.visibility,
      trafficDensity: fullIncidentData.traffic_density
    },

    // SECTION 3: User's Vehicle
    userVehicle: {
      make: fullIncidentData.make_of_car,
      model: fullIncidentData.model_of_car,
      registration: fullIncidentData.vehicle_registration_number,
      color: fullIncidentData.vehicle_color,
      damage: extractDamageDetails(fullIncidentData),
      preExistingDamage: fullIncidentData.pre_existing_damage,
      occupants: fullIncidentData.number_of_occupants,
      seatbelts: fullIncidentData.seatbelts_worn,
      airbags: fullIncidentData.airbags_deployed
    },

    // SECTION 4: Other Vehicles (up to 5)
    otherVehicles: fullIncidentData.vehicles || [],

    // SECTION 5: Witnesses (up to 3)
    witnesses: fullIncidentData.witnesses || [],

    // SECTION 6: Medical/Injuries
    medical: {
      immediateSymptoms: fullIncidentData.medical_symptoms || [],
      injuryDetails: fullIncidentData.medical_injury_details,
      currentStatus: fullIncidentData.medical_how_are_you_feeling,
      hospitalVisit: fullIncidentData.hospital_visit,
      ambulanceCalled: fullIncidentData.ambulance_called,
      medicalTreatment: fullIncidentData.medical_treatment_received
    },

    // SECTION 7: Emergency Response
    emergency: {
      policeInvolved: fullIncidentData.police_involved,
      policeStation: fullIncidentData.police_station,
      crimeReferenceNumber: fullIncidentData.crime_reference_number,
      officerName: fullIncidentData.police_officer_name,
      officerBadge: fullIncidentData.police_officer_badge_number
    },

    // SECTION 8: Insurance
    insurance: {
      userInsurer: fullIncidentData.insurance_company,
      userPolicyNumber: fullIncidentData.insurance_policy_number,
      otherDriverInsurer: fullIncidentData.other_driver_insurance_company,
      otherDriverPolicy: fullIncidentData.other_driver_policy_number
    },

    // SECTION 9: Fault & Liability
    fault: {
      userOpinion: fullIncidentData.who_was_at_fault,
      contributingFactors: fullIncidentData.contributing_factors || [],
      mitigatingCircumstances: fullIncidentData.mitigating_circumstances
    }
  };

  // COMPREHENSIVE PROMPT for Page 14
  const closingStatementPrompt = `You are a senior legal counsel preparing a closing statement for a car accident case.

YOUR TASK: Create a professional, factual narrative suitable for a legal document that synthesizes ALL available evidence and testimony into a cohesive account of the incident.

TONE & STYLE:
- Third person, past tense
- Objective and factual (NO speculation or assumptions)
- Professional legal language
- Logical narrative flow (chronological where appropriate)
- Include ALL relevant details provided
- Comparable to a closing statement quality

PERSONAL STATEMENT (Primary Evidence):
"""
${transcription}
"""

SUPPORTING EVIDENCE FROM INCIDENT REPORT:

1. INCIDENT OVERVIEW
   - Date: ${comprehensiveData.incident.date || 'Not recorded'}
   - Time: ${comprehensiveData.incident.time || 'Not recorded'}
   - Location: ${comprehensiveData.incident.location.address || 'Not recorded'}
   - Road Type: ${comprehensiveData.incident.location.roadType || 'Not recorded'}
   - Speed Limit: ${comprehensiveData.incident.location.speedLimit || 'Not recorded'}

2. ENVIRONMENTAL CONDITIONS
   - Weather: ${JSON.stringify(comprehensiveData.conditions.weather)}
   - Lighting: ${comprehensiveData.conditions.lighting || 'Not recorded'}
   - Road Surface: ${comprehensiveData.conditions.roadSurface || 'Not recorded'}
   - Visibility: ${comprehensiveData.conditions.visibility || 'Not recorded'}

3. USER'S VEHICLE
   - Make/Model: ${comprehensiveData.userVehicle.make} ${comprehensiveData.userVehicle.model}
   - Registration: ${comprehensiveData.userVehicle.registration || 'Not recorded'}
   - Occupants: ${comprehensiveData.userVehicle.occupants || 'Not recorded'}
   - Seatbelts: ${comprehensiveData.userVehicle.seatbelts || 'Not recorded'}
   - Airbags: ${comprehensiveData.userVehicle.airbags || 'Not recorded'}
   - Damage: ${JSON.stringify(comprehensiveData.userVehicle.damage)}

4. OTHER VEHICLES INVOLVED
${formatOtherVehicles(comprehensiveData.otherVehicles)}

5. WITNESSES
${formatWitnesses(comprehensiveData.witnesses)}

6. MEDICAL/INJURIES
   - Immediate Symptoms: ${JSON.stringify(comprehensiveData.medical.immediateSymptoms)}
   - Injury Details: ${comprehensiveData.medical.injuryDetails || 'None reported'}
   - Current Status: ${comprehensiveData.medical.currentStatus || 'Not recorded'}
   - Hospital Visit: ${comprehensiveData.medical.hospitalVisit || 'Not recorded'}

7. EMERGENCY RESPONSE
   - Police Involved: ${comprehensiveData.emergency.policeInvolved || 'Not recorded'}
   - Crime Reference: ${comprehensiveData.emergency.crimeReferenceNumber || 'Not recorded'}

8. INSURANCE
   - User's Insurer: ${comprehensiveData.insurance.userInsurer || 'Not recorded'}
   - Other Driver's Insurer: ${comprehensiveData.insurance.otherDriverInsurer || 'Not recorded'}

9. FAULT ASSESSMENT
   - Opinion on Fault: ${comprehensiveData.fault.userOpinion || 'Not stated'}
   - Contributing Factors: ${JSON.stringify(comprehensiveData.fault.contributingFactors)}

STRUCTURE YOUR NARRATIVE:
1. Opening: Brief context (date, time, location, parties involved)
2. Conditions: Environmental and road conditions
3. Sequence of Events: Chronological account based on personal statement and evidence
4. Impact: Description of collision, damage, injuries
5. Immediate Response: Emergency services, medical attention
6. Witness Accounts: If available, incorporate witness perspectives
7. Fault Analysis: Objective assessment based on evidence
8. Documentation: Police, insurance, medical records
9. Closing: Summary of key facts supporting the user's position

CRITICAL REQUIREMENTS:
- Use ONLY the information provided (no fabrication)
- If information is missing, state "Not recorded" or omit
- Maintain professional legal tone throughout
- Each paragraph should be 3-5 sentences
- Total length: 800-1200 words
- Output as plain text (paragraphs separated by double newlines)

Begin your closing statement narrative:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a senior legal counsel with 25 years of experience in personal injury and traffic accident law. You specialize in creating comprehensive closing statements.'
      },
      { role: 'user', content: closingStatementPrompt }
    ],
    temperature: 0.3,  // Lower temperature for factual accuracy
    max_tokens: 3000   // Allow longer response for comprehensive narrative
  });

  return response.choices[0].message.content;
}

// Helper function to extract weather conditions from array/string
function extractWeatherConditions(data) {
  if (data.weather_conditions && Array.isArray(data.weather_conditions)) {
    return data.weather_conditions;
  }
  // Check individual weather fields
  const conditions = [];
  if (data.weather_clear) conditions.push('Clear');
  if (data.weather_raining) conditions.push('Rain');
  if (data.weather_fog) conditions.push('Fog');
  if (data.weather_snow) conditions.push('Snow');
  return conditions.length > 0 ? conditions : ['Not specified'];
}

// Helper function to extract damage details
function extractDamageDetails(data) {
  return {
    front: data.damage_front || false,
    rear: data.damage_rear || false,
    driverSide: data.damage_driver_side || false,
    passengerSide: data.damage_passenger_side || false,
    description: data.vehicle_damage_description || 'Not specified'
  };
}

// Helper function to format other vehicles
function formatOtherVehicles(vehicles) {
  if (!vehicles || vehicles.length === 0) {
    return '   - No other vehicles recorded';
  }

  return vehicles.map((vehicle, index) => `
   Vehicle ${index + 1}:
   - Make/Model: ${vehicle.make || 'Unknown'} ${vehicle.model || 'Unknown'}
   - Registration: ${vehicle.registration || 'Not recorded'}
   - Driver: ${vehicle.driver_name || 'Not recorded'}
   - Insurance: ${vehicle.insurance_company || 'Not recorded'}
   - Damage: ${vehicle.damage_description || 'Not recorded'}
  `).join('\n');
}

// Helper function to format witnesses
function formatWitnesses(witnesses) {
  if (!witnesses || witnesses.length === 0) {
    return '   - No witnesses recorded';
  }

  return witnesses.map((witness, index) => `
   Witness ${index + 1}:
   - Name: ${witness.witness_name || 'Not recorded'}
   - Contact: ${witness.witness_mobile_number || witness.witness_email_address || 'Not recorded'}
   - Statement: ${witness.witness_statement || 'Not provided'}
  `).join('\n');
}
```

**Key Changes from Current Implementation:**

1. **Temperature: 0.7 → 0.3** (factual accuracy prioritized)
2. **Uses ALL incident data** (not just 7 fields)
3. **Structured prompt** with 9 evidence sections
4. **Legal document tone** explicitly defined
5. **Word count guidance** (800-1200 words for Page 14)
6. **Helper functions** to safely extract nested data

---

### Phase 3: PDF Field Mapping Updates

**File:** `lib/pdfGenerator.js`

**Current Mapping (Lines 403-405):**
```javascript
// WRONG: Field name confusion
setFieldText('ai_summary_of_accident_data', incident.ai_summary_of_data_collected || '');
setFieldText('ai_summary_of_accident_data_transcription', incident.detailed_account_of_what_happened || '');
```

**New Mapping:**

```javascript
// ========================================
// PAGES 13-15: AI ANALYSIS & TRANSCRIPTION
// ========================================

// Page 13: User's Direct Statement/Transcription
if (data.aiTranscription && data.aiTranscription.transcription) {
  setFieldText('ai_summary_of_accident_data_transcription', data.aiTranscription.transcription);
  logger.info('✅ Page 13: User transcription populated');
}

// Page 14: AI Comprehensive Narrative (CENTRE PIECE)
if (data.aiAnalysis && data.aiAnalysis.combinedReport) {
  // NEW FIELD: ai_comprehensive_narrative (or repurpose ai_summary_of_accident_data)
  setFieldText('ai_comprehensive_narrative', data.aiAnalysis.combinedReport);
  logger.info('✅ Page 14: AI comprehensive narrative populated');

  // Also set AI model metadata for audit trail
  if (data.aiAnalysis.created_at) {
    setFieldText('ai_model_used', `GPT-4o (Generated: ${new Date(data.aiAnalysis.created_at).toLocaleDateString('en-GB')})`);
  }
}

// Page 15: AI Bullet Points + Next Steps
if (data.aiAnalysis) {
  // Bullet Points Section
  if (data.aiAnalysis.keyPoints && Array.isArray(data.aiAnalysis.keyPoints)) {
    const bulletPoints = data.aiAnalysis.keyPoints
      .map(point => `• ${point}`)
      .join('\n\n');

    // NEW FIELD: ai_key_points
    setFieldText('ai_key_points', bulletPoints);
    logger.info(`✅ Page 15: ${data.aiAnalysis.keyPoints.length} bullet points populated`);
  }

  // Next Steps Guide Section
  if (data.aiAnalysis.finalReview && data.aiAnalysis.finalReview.nextSteps) {
    const nextSteps = data.aiAnalysis.finalReview.nextSteps
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n\n');

    // NEW FIELD: ai_next_steps
    setFieldText('ai_next_steps', nextSteps);
    logger.info(`✅ Page 15: ${data.aiAnalysis.finalReview.nextSteps.length} next steps populated`);
  }
}

// ========================================
// PAGE 18: EMERGENCY AUDIO TRANSCRIPTION
// ========================================

// Page 18: Emergency Audio (AI Eavesdropper) - FULL TEXT ONLY
if (data.emergencyAudio) {
  // Transcription text (word-for-word)
  if (data.emergencyAudio.transcription_text) {
    setFieldText('emergency_audio_transcription', data.emergencyAudio.transcription_text);
    logger.info('✅ Page 18: Emergency audio transcription populated');
  }

  // Timestamp (formatted for UK legal documents)
  if (data.emergencyAudio.recorded_at) {
    const timestamp = new Date(data.emergencyAudio.recorded_at).toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    setFieldText('emergency_recording_timestamp', timestamp);
    logger.info('✅ Page 18: Recording timestamp populated');
  }

  // ❌ REMOVED: emergency_audio_url field (violates legal document requirement)
  // Legal documents must contain full text only, NO URLs
}

// Add legal footnote to Page 18 (if field exists in template)
if (data.emergencyAudio && data.emergencyAudio.transcription_text) {
  const footnote = 'This transcription is an unaltered, word-for-word record of the emergency audio recording captured at the time of the incident.';
  // Check if footnote field exists in PDF template
  try {
    setFieldText('emergency_audio_footnote', footnote);
  } catch (error) {
    // Field doesn't exist - add footnote to transcription text instead
    const transcriptionWithFootnote = `${data.emergencyAudio.transcription_text}\n\n---\n${footnote}`;
    setFieldText('emergency_audio_transcription', transcriptionWithFootnote);
  }
}
```

**Key Changes:**

1. ✅ Clear separation: Page 13 = transcription, Page 14 = narrative, Page 15 = bullets/steps, Page 18 = emergency
2. ✅ Uses ai_analysis.combinedReport for Page 14 (comprehensive narrative)
3. ✅ Formats bullet points and next steps as numbered/bulleted lists
4. ❌ Removes all URL fields (legal document requirement)
5. ✅ Adds legal footnote to emergency audio

---

### Phase 4: Data Fetcher Updates

**File:** `lib/dataFetcher.js`

**Current Comment Confusion (Lines 399-402):**
```javascript
emergencyAudio: emergencyAudioData, // Page 15: Emergency audio (WRONG)
aiTranscription: aiTranscriptionData, // Page 14: User's direct statement (WRONG)
aiAnalysis: aiAnalysisData, // Pages 13 & 18: Comprehensive AI analysis (WRONG)
```

**Corrected Comments:**

```javascript
emergencyAudio: emergencyAudioData, // Page 18: Emergency audio (AI Eavesdropper) - word-for-word transcription
aiTranscription: aiTranscriptionData, // Page 13: User's direct statement (transcription/manually input/edited)
aiAnalysis: aiAnalysisData, // Pages 14 & 15: Comprehensive AI narrative + bullet points + next steps
```

**Remove URL Generation (Lines 146-153):**

```javascript
// ❌ DELETE THIS BLOCK (violates legal document requirement)
if (emergencyAudio.audio_storage_path) {
  const { data: signedData, error: signedError } = await supabase.storage
    .from('incident-audio')
    .createSignedUrl(emergencyAudio.audio_storage_path, 31536000);

  if (signedData && !signedError) {
    emergencyAudio.audio_url = signedData.signedUrl;
  }
}

// ✅ REPLACE WITH: Ensure only transcription_text is included
// Legal documents require full text only, no URL references
if (!emergencyAudio.transcription_text) {
  logger.warn('Emergency audio exists but no transcription available');
}
```

---

### Phase 5: UI/UX Data Submission Flow

**File:** `public/transcription-status.html`

**Current Flow (4 steps):**
1. Record → 2. Upload → 3. Transcribe → 4. AI Analysis

**Enhanced Flow for Comprehensive Analysis:**

```javascript
// When user clicks "Generate AI Analysis"
async function generateComprehensiveAnalysis() {
  const transcription = document.getElementById('editableTranscript').value;

  if (!transcription || transcription.trim().length < 10) {
    showError('Please provide a personal statement (minimum 10 characters)');
    return;
  }

  showProgress('Generating comprehensive AI analysis...');

  try {
    // Step 1: Save transcription to ai_transcription table
    const saveResponse = await fetch('/api/incident-reports/save-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        incidentId: currentIncidentId,
        personalStatement: transcription
      })
    });

    if (!saveResponse.ok) throw new Error('Failed to save statement');

    // Step 2: Trigger comprehensive AI analysis
    // This will use ALL pages 1-12 data + transcription
    const analysisResponse = await fetch('/api/ai/analyze-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        incidentId: currentIncidentId,
        transcription: transcription
      })
    });

    if (!analysisResponse.ok) throw new Error('Failed to generate analysis');

    const analysisData = await analysisResponse.json();

    // Display results to user
    displayAnalysisResults(analysisData.analysis);

    // Show success message
    showSuccess('✅ Comprehensive AI analysis complete! Your legal document is ready.');

    // Enable PDF generation button
    document.getElementById('generatePdfBtn').disabled = false;

  } catch (error) {
    logger.error('Analysis generation error:', error);
    showError('Failed to generate analysis. Please try again.');
  }
}

// Display analysis results to user
function displayAnalysisResults(analysis) {
  // Page 13 Preview: User's statement (already visible in editor)
  // No changes needed

  // Page 14 Preview: Comprehensive narrative
  const narrativePreview = document.getElementById('narrativePreview');
  if (narrativePreview && analysis.combinedReport) {
    narrativePreview.innerHTML = `
      <h3>📄 Page 14: Comprehensive Incident Narrative</h3>
      <div class="narrative-box">
        ${analysis.combinedReport}
      </div>
      <p class="preview-note">This is the centre piece of your legal document</p>
    `;
  }

  // Page 15 Preview: Bullet points + next steps
  const bulletsPreview = document.getElementById('bulletsPreview');
  if (bulletsPreview && analysis.keyPoints) {
    const bulletList = analysis.keyPoints.map(point => `<li>${point}</li>`).join('');
    const stepsList = analysis.finalReview?.nextSteps
      ? analysis.finalReview.nextSteps.map((step, i) => `<li><strong>Step ${i+1}:</strong> ${step}</li>`).join('')
      : '';

    bulletsPreview.innerHTML = `
      <h3>📋 Page 15: Summary & Next Steps</h3>
      <div class="bullets-box">
        <h4>Key Points:</h4>
        <ul>${bulletList}</ul>

        <h4>Recommended Next Steps:</h4>
        <ol>${stepsList}</ol>
      </div>
      <p class="preview-note">Completeness Score: ${analysis.finalReview?.completenessScore || 'N/A'}/100</p>
    `;
  }
}
```

**UI Enhancements:**

```html
<!-- Add preview panels for Pages 14-15 -->
<div id="analysisPreviewSection" class="preview-section" style="display: none;">
  <h2>🤖 AI Analysis Preview</h2>

  <div id="narrativePreview" class="preview-panel"></div>
  <div id="bulletsPreview" class="preview-panel"></div>

  <button id="generatePdfBtn" class="btn-primary" disabled>
    📄 Generate Complete Legal Document (PDF)
  </button>
</div>

<style>
.preview-panel {
  background: #F5F1E8;
  border: 2px solid #4B5563;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
}

.narrative-box {
  background: white;
  padding: 15px;
  border-left: 4px solid #0E7490;
  font-family: 'Georgia', serif;
  line-height: 1.8;
  max-height: 400px;
  overflow-y: auto;
}

.bullets-box {
  background: white;
  padding: 15px;
}

.bullets-box ul, .bullets-box ol {
  margin-left: 20px;
  line-height: 1.6;
}

.preview-note {
  font-size: 0.9em;
  color: #666;
  margin-top: 10px;
  font-style: italic;
}
</style>
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─► Pages 1-12: Incident form data
                              │   └─> Stored in: incident_reports table (160+ fields)
                              │
                              ├─► Page 13: Personal statement (typed/voice/edited)
                              │   └─> Stored in: ai_transcription.transcript_text
                              │
                              └─► Page 18: Emergency audio (optional)
                                  └─> Stored in: ai_listening_transcripts.transcription_text

                              ↓ TRIGGER: "Generate AI Analysis" button

┌─────────────────────────────────────────────────────────────────┐
│              AI PROCESSING (ai.controller.js)                    │
│                                                                  │
│  1. Fetch ALL incident data (incident_reports + witnesses +     │
│     vehicles + user_signup)                                     │
│                                                                  │
│  2. Fetch transcription (ai_transcription.transcript_text)      │
│                                                                  │
│  3. Generate comprehensive analysis (GPT-4o, temp 0.3):         │
│     • Summary (2-3 sentences)                                   │
│     • Key points (bullet array)                                 │
│     • Fault analysis                                            │
│     • Quality review (JSONB)                                    │
│     • Combined report (HTML narrative) ← Page 14 CENTRE PIECE  │
│     • Final review (nextSteps array + completeness score)       │
│                                                                  │
│  4. Store in ai_analysis table (RLS enabled)                    │
└─────────────────────────────────────────────────────────────────┘

                              ↓ TRIGGER: "Generate PDF" button

┌─────────────────────────────────────────────────────────────────┐
│           DATA FETCHING (dataFetcher.js)                         │
│                                                                  │
│  Fetch from Supabase:                                           │
│  • user_signup → User personal info, vehicle, insurance         │
│  • incident_reports → ALL 160+ fields                           │
│  • incident_other_vehicles → Up to 5 vehicles                   │
│  • incident_witnesses → Up to 3 witnesses (from columns)        │
│  • ai_transcription → User's statement (Page 13)                │
│  • ai_analysis → Comprehensive analysis (Pages 14-15)           │
│  • ai_listening_transcripts → Emergency audio (Page 18)         │
│  • user_documents → Image URLs (signed, 12-month expiry)        │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│           PDF GENERATION (pdfGenerator.js)                       │
│                                                                  │
│  Map to PDF fields:                                             │
│                                                                  │
│  📄 PAGE 13: User's Direct Statement                            │
│     ai_summary_of_accident_data_transcription                   │
│     ← ai_transcription.transcript_text                          │
│                                                                  │
│  📄 PAGE 14: AI Comprehensive Narrative (CENTRE PIECE)          │
│     ai_comprehensive_narrative (NEW FIELD)                      │
│     ← ai_analysis.combined_report                               │
│     ← Uses ALL pages 1-12 + transcription                       │
│     ← 800-1200 words, legal closing statement quality           │
│                                                                  │
│  📄 PAGE 15: Bullet Points + Next Steps                         │
│     ai_key_points (NEW FIELD)                                   │
│     ← ai_analysis.key_points (formatted as "• Point\n• Point")  │
│                                                                  │
│     ai_next_steps (NEW FIELD)                                   │
│     ← ai_analysis.final_review.nextSteps                        │
│     ← (formatted as "1. Step\n2. Step")                         │
│                                                                  │
│  📄 PAGE 18: Emergency Audio Transcription                      │
│     emergency_audio_transcription                               │
│     ← ai_listening_transcripts.transcription_text               │
│     ← Word-for-word, unaltered                                  │
│     ← NO URLs (legal requirement)                               │
│                                                                  │
│     emergency_recording_timestamp                               │
│     ← ai_listening_transcripts.recorded_at (UK format)          │
│                                                                  │
│  Fill 207 total PDF fields using Adobe PDF Services             │
│  Compress and store in Supabase Storage                         │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│                  LEGAL DOCUMENT OUTPUT                           │
│                                                                  │
│  17-page PDF with:                                              │
│  • Pages 1-12: Incident details, images, witnesses              │
│  • Page 13: User's personal statement (verbatim)                │
│  • Page 14: AI comprehensive narrative (closing statement)      │
│  • Page 15: AI bullet points + recommended next steps           │
│  • Page 16-17: Additional evidence                              │
│  • Page 18: Emergency audio transcription (if applicable)       │
│                                                                  │
│  ✅ Full text only (NO URLs)                                    │
│  ✅ Factual based on user input                                 │
│  ✅ Professional legal document quality                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

**No Changes Required** - All tables already exist with correct structure:

### ai_transcription (Page 13)
```sql
CREATE TABLE ai_transcription (
  id UUID PRIMARY KEY,
  create_user_id UUID NOT NULL,
  transcript_text TEXT,              -- Page 13: User's statement
  narrative_text TEXT,
  voice_transcription TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### ai_analysis (Pages 14-15) ✅ PERFECT STRUCTURE
```sql
CREATE TABLE ai_analysis (
  id UUID PRIMARY KEY,
  create_user_id UUID NOT NULL,
  incident_id UUID,
  transcription_text TEXT NOT NULL,   -- Input

  -- Page 15 Data
  summary TEXT,                       -- 2-3 sentence summary
  key_points TEXT[],                  -- Bullet points array
  fault_analysis TEXT,

  quality_review JSONB,               -- Quality assessment

  -- Page 14 Data (CENTRE PIECE)
  combined_report TEXT,               -- HTML narrative using ALL data

  -- Page 15 Data (continued)
  completeness_score INTEGER,         -- 0-100
  final_review JSONB,                 -- { nextSteps: [], strengths: '', legalConsiderations: '' }

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### ai_listening_transcripts (Page 18)
```sql
CREATE TABLE ai_listening_transcripts (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL,
  transcription_text TEXT,            -- Page 18: Word-for-word audio transcription
  audio_storage_path TEXT,            -- For audit only (NOT in PDF)
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## Implementation Checklist

### Phase 1: PDF Template (Requires Adobe Acrobat Pro)

- [ ] **1.1** Open `pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf` in Adobe Acrobat Pro
- [ ] **1.2** Navigate to Page 14
- [ ] **1.3** Add new text field: `ai_comprehensive_narrative`
  - Type: Multi-line text
  - Size: Full page minus 20% header/footer
  - Font: 10pt Georgia (serif)
  - Border: None or subtle gray
- [ ] **1.4** Navigate to Page 15
- [ ] **1.5** Add new text field: `ai_key_points`
  - Type: Multi-line text
  - Size: 50% of page (top half)
  - Font: 10pt Arial
- [ ] **1.6** Add new text field: `ai_next_steps`
  - Type: Multi-line text
  - Size: 50% of page (bottom half)
  - Font: 10pt Arial
- [ ] **1.7** Navigate to Page 18
- [ ] **1.8** Remove field: `emergency_audio_url` (if exists)
- [ ] **1.9** Optionally add field: `emergency_audio_footnote` (small text at bottom)
- [ ] **1.10** Save template with version bump: `Car-Crash-Lawyer-AI-incident-report-v2.1.pdf`
- [ ] **1.11** Test field extraction:
  ```bash
  node -e "
  const { PDFDocument } = require('pdf-lib');
  const fs = require('fs');
  const pdfBytes = fs.readFileSync('pdf-templates/Car-Crash-Lawyer-AI-incident-report-v2.1.pdf');
  PDFDocument.load(pdfBytes).then(pdfDoc => {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const newFields = fields.filter(f => f.getName().includes('ai_comprehensive') || f.getName().includes('ai_key_points') || f.getName().includes('ai_next_steps'));
    console.log('New fields:', newFields.map(f => f.getName()));
  });
  "
  ```

### Phase 2: AI Controller Enhancement

- [ ] **2.1** Update `src/controllers/ai.controller.js`:
  - [ ] Replace `generateComprehensiveAnalysis` function (lines 102-276)
  - [ ] Add helper functions: `extractWeatherConditions`, `extractDamageDetails`, `formatOtherVehicles`, `formatWitnesses`
  - [ ] Update prompt to use ALL incident data (not just 7 fields)
  - [ ] Change temperature from 0.7 to 0.3
  - [ ] Increase max_tokens from 1500 to 3000
  - [ ] Add legal counsel system message
- [ ] **2.2** Test AI analysis with real data:
  ```bash
  curl -X POST http://localhost:5000/api/ai/analyze-statement \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "ee7cfcaf-5810-4c62-b99b-ab0f2291733e",
      "incidentId": "[incident-id]",
      "transcription": "I was driving along High Street when..."
    }'
  ```
- [ ] **2.3** Verify ai_analysis record created in database:
  ```sql
  SELECT id, create_user_id, summary,
         array_length(key_points, 1) as num_key_points,
         length(combined_report) as narrative_length,
         completeness_score,
         final_review->'nextSteps' as next_steps
  FROM ai_analysis
  WHERE create_user_id = 'ee7cfcaf-5810-4c62-b99b-ab0f2291733e'
  ORDER BY created_at DESC LIMIT 1;
  ```

### Phase 3: PDF Generator Updates

- [ ] **3.1** Update `lib/pdfGenerator.js`:
  - [ ] Replace Pages 13-15 mapping (lines 403-405) with new implementation
  - [ ] Add Page 14 narrative mapping using `data.aiAnalysis.combinedReport`
  - [ ] Add Page 15 bullet points formatting logic
  - [ ] Add Page 15 next steps formatting logic
  - [ ] Update Page 18 to remove URL field (line 478)
  - [ ] Add footnote logic for Page 18
  - [ ] Add logging for each page populated
- [ ] **3.2** Update field name references in pdfFieldMapper.js (if exists)
- [ ] **3.3** Test PDF generation:
  ```bash
  node test-form-filling.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e
  ```
- [ ] **3.4** Verify PDF output:
  - Open generated PDF in `test-output/` folder
  - Check Page 13: User transcription present
  - Check Page 14: Comprehensive narrative present (800-1200 words)
  - Check Page 15: Bullet points + next steps present
  - Check Page 18: Emergency audio transcription (if applicable)
  - Check NO URL fields anywhere

### Phase 4: Data Fetcher Updates

- [ ] **4.1** Update `lib/dataFetcher.js`:
  - [ ] Fix comments (lines 399-402) to match actual page allocation
  - [ ] Remove URL generation for emergency audio (lines 146-153)
  - [ ] Add warning log if emergency audio has no transcription
- [ ] **4.2** Test data fetching:
  ```bash
  node -e "
  const { fetchAllData } = require('./lib/dataFetcher');
  fetchAllData('ee7cfcaf-5810-4c62-b99b-ab0f2291733e').then(data => {
    console.log('AI Transcription:', !!data.aiTranscription);
    console.log('AI Analysis:', !!data.aiAnalysis);
    console.log('Emergency Audio:', !!data.emergencyAudio);
    if (data.aiAnalysis) {
      console.log('  - Summary:', data.aiAnalysis.summary?.substring(0, 50) + '...');
      console.log('  - Key Points:', data.aiAnalysis.keyPoints?.length);
      console.log('  - Combined Report:', data.aiAnalysis.combinedReport?.length + ' chars');
      console.log('  - Next Steps:', data.aiAnalysis.finalReview?.nextSteps?.length);
    }
  });
  "
  ```

### Phase 5: UI/UX Updates

- [ ] **5.1** Update `public/transcription-status.html`:
  - [ ] Add `generateComprehensiveAnalysis()` function
  - [ ] Add `displayAnalysisResults()` function
  - [ ] Add preview panels HTML for Pages 14-15
  - [ ] Add CSS styles for preview panels
  - [ ] Update "Generate AI Analysis" button to call new function
  - [ ] Add loading states during AI processing (20-45 seconds)
  - [ ] Enable PDF generation button only after analysis complete
- [ ] **5.2** Test UI flow:
  1. Navigate to transcription-status.html
  2. Enter/edit personal statement
  3. Click "Generate AI Analysis"
  4. Wait for processing (should see 4 steps in logs)
  5. Verify preview panels display correctly
  6. Click "Generate PDF" button
  7. Verify PDF contains all pages

### Phase 6: Verification & Testing

- [ ] **6.1** Create comprehensive test script: `verify-pages-13-18.js`
  ```javascript
  // Test all 4 pages with real user data
  // Verify field population
  // Verify NO URLs in PDF
  // Verify narrative quality (word count, structure)
  // Verify bullet points formatting
  // Generate test report
  ```
- [ ] **6.2** Run verification:
  ```bash
  node verify-pages-13-18.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e
  ```
- [ ] **6.3** Expected output:
  ```
  📋 PAGE 13: User Transcription
     ✅ POPULATED: 1,234 chars
     Preview: "I was driving along High Street when..."

  📄 PAGE 14: AI Comprehensive Narrative (CENTRE PIECE)
     ✅ POPULATED: 4,567 chars (982 words)
     Preview: "On the afternoon of 15th November 2025, at approximately 14:30..."
     Quality: Legal closing statement style ✓
     Word count: 982 (target: 800-1200) ✓

  📋 PAGE 15: Bullet Points + Next Steps
     ✅ POPULATED: Bullet points: 5 items
     ✅ POPULATED: Next steps: 7 items
     Preview bullets:
       • Driver proceeded through red light at junction
       • Impact occurred to passenger side of vehicle
       ...
     Preview steps:
       1. Seek immediate medical attention if not already done
       2. Obtain full medical records from treating physician
       ...

  🎤 PAGE 18: Emergency Audio Transcription
     ✅ POPULATED: 678 chars
     ✅ Timestamp: Wednesday, 15 November 2025, 14:32:15 GMT
     ✅ NO URLs (legal requirement met)
     Preview: "Emergency services, this is [Name]..."

  ✅ ALL CHECKS PASSED
  📊 Implementation Status: 100%
  ```

- [ ] **6.4** Quality checks:
  - [ ] Page 14 narrative reads like professional legal document
  - [ ] No fabricated information (only user-provided data)
  - [ ] All relevant incident details incorporated
  - [ ] Logical narrative flow
  - [ ] Third person, past tense consistently used
  - [ ] 800-1200 word count range
  - [ ] NO URLs anywhere in Pages 13-18

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All Phase 1-6 tasks complete
- [ ] Verification script passing 100%
- [ ] PDF template updated and tested
- [ ] Database records verified
- [ ] UI/UX tested end-to-end
- [ ] Code reviewed by senior engineer
- [ ] Documentation updated

### Deployment Steps

1. **Backup Current System**
   ```bash
   # Backup PDF template
   cp pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf \
      pdf-templates/backup/Car-Crash-Lawyer-AI-incident-report-main-backup-2025-11-16.pdf

   # Backup affected code files
   cp src/controllers/ai.controller.js src/controllers/ai.controller.js.backup
   cp lib/pdfGenerator.js lib/pdfGenerator.js.backup
   cp lib/dataFetcher.js lib/dataFetcher.js.backup
   ```

2. **Deploy PDF Template**
   ```bash
   # Upload new template to server
   cp pdf-templates/Car-Crash-Lawyer-AI-incident-report-v2.1.pdf \
      pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf
   ```

3. **Deploy Code Changes**
   ```bash
   git add src/controllers/ai.controller.js
   git add lib/pdfGenerator.js
   git add lib/dataFetcher.js
   git add public/transcription-status.html
   git commit -m "feat: Implement Pages 13-18 comprehensive AI analysis system

   - Page 13: User's direct statement (verbatim)
   - Page 14: AI comprehensive narrative using ALL incident data (CENTRE PIECE)
   - Page 15: AI bullet points + recommended next steps
   - Page 18: Emergency audio transcription (word-for-word, no URLs)

   Key changes:
   - Enhanced AI prompt to use 160+ incident fields (not just 7)
   - Temperature reduced to 0.3 for factual accuracy
   - New PDF fields for comprehensive narrative and structured outputs
   - Removed URL fields for legal document compliance
   - Added preview panels in UI

   Refs: ARCHITECTURAL_PLAN_PAGES_13-18.md"

   git push origin feat/audit-prep
   ```

4. **Staged Rollout**
   - **Stage 1:** Deploy to development environment
   - **Stage 2:** Test with 3-5 real users
   - **Stage 3:** Monitor for errors, collect feedback
   - **Stage 4:** Deploy to production if no issues

5. **Monitoring**
   - Check server logs for AI API errors
   - Monitor OpenAI API usage (increased tokens due to comprehensive data)
   - Track PDF generation success rates
   - Monitor user feedback on Page 14 narrative quality

### Rollback Plan

If issues occur:

```bash
# Restore PDF template
cp pdf-templates/backup/Car-Crash-Lawyer-AI-incident-report-main-backup-2025-11-16.pdf \
   pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf

# Restore code
cp src/controllers/ai.controller.js.backup src/controllers/ai.controller.js
cp lib/pdfGenerator.js.backup lib/pdfGenerator.js
cp lib/dataFetcher.js.backup lib/dataFetcher.js

# Restart server
npm start
```

---

## Cost Implications

### OpenAI API Usage Increase

**Current Usage (per analysis):**
- 4 API calls
- ~800 tokens input per call
- ~200-500 tokens output per call
- **Total:** ~3,200 input + ~1,200 output = **4,400 tokens**

**New Usage (per analysis):**
- 4 API calls (same)
- **Page 14 call now uses ALL incident data:**
  - Incident data: ~3,000 tokens (160+ fields formatted)
  - Witnesses: ~500 tokens (3 witnesses × ~170 tokens)
  - Vehicles: ~800 tokens (5 vehicles × ~160 tokens)
  - Transcription: ~500 tokens
  - **Total Page 14 input:** ~4,800 tokens
  - **Output:** ~1,500 tokens (800-1200 words)
- Other 3 calls: ~1,000 tokens total
- **Total:** ~5,800 input + ~2,700 output = **8,500 tokens**

**Cost Comparison:**

| Model | Current Cost | New Cost | Increase |
|-------|--------------|----------|----------|
| GPT-4o Input | $0.032 | $0.058 | +81% |
| GPT-4o Output | $0.012 | $0.027 | +125% |
| **Total per analysis** | **$0.044** | **$0.085** | **+93%** |

**Annual Impact (10,000 users):**
- Current: $440/year
- New: $850/year
- **Increase: $410/year**

**Justification:** Comprehensive legal document quality worth marginal cost increase.

---

## Success Metrics

### Technical Metrics

- [ ] **100% field population** - All 4 pages (13, 14, 15, 18) have data when available
- [ ] **0 URL fields** - Legal document compliance
- [ ] **800-1200 word count** - Page 14 narrative length
- [ ] **<45 seconds AI processing** - Total time for 4-step analysis
- [ ] **0 data loss** - All incident data incorporated in narrative

### Quality Metrics

- [ ] **Legal document tone** - Professional, factual, third-person
- [ ] **Factual accuracy** - No fabricated information
- [ ] **Logical flow** - Chronological narrative structure
- [ ] **Completeness score ≥80** - AI assessment of documentation quality
- [ ] **User satisfaction ≥4.5/5** - User feedback on Page 14 quality

### User Feedback Collection

Add to transcription-status.html after PDF generation:

```html
<div class="feedback-section">
  <h3>How would you rate the AI-generated incident narrative (Page 14)?</h3>
  <div class="rating-buttons">
    <button onclick="submitRating(5)">⭐⭐⭐⭐⭐ Excellent</button>
    <button onclick="submitRating(4)">⭐⭐⭐⭐ Good</button>
    <button onclick="submitRating(3)">⭐⭐⭐ Fair</button>
    <button onclick="submitRating(2)">⭐⭐ Poor</button>
    <button onclick="submitRating(1)">⭐ Very Poor</button>
  </div>
  <textarea id="feedbackText" placeholder="Optional: Any specific feedback on the AI analysis?"></textarea>
  <button onclick="submitFeedback()">Submit Feedback</button>
</div>
```

---

## Future Enhancements (Post-Launch)

1. **Multi-language support** - Translate Page 14 narrative to Welsh, Polish, etc.
2. **Tone customization** - Allow user to select narrative style (formal/conversational)
3. **Fact-checking** - Cross-reference with DVLA, insurance databases
4. **Legal review flag** - Highlight potential liability issues
5. **Comparative analysis** - "Similar cases resulted in..."
6. **PDF annotations** - Allow lawyers to add notes to narrative
7. **Version control** - Track narrative edits over time

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI hallucinates facts | Medium | High | Temperature 0.3, explicit "no fabrication" instruction, audit logging |
| PDF fields missing | Low | High | Pre-deployment field extraction test, fallback to existing fields |
| AI timeout (>120s) | Low | Medium | Already configured 120s timeout, monitor and optimize if needed |
| Cost overrun | Low | Low | Track OpenAI usage, alert at $100/month threshold |
| User confusion | Medium | Low | Clear UI labels, preview panels, help text |
| Data privacy breach | Low | Critical | RLS policies, audit logs, GDPR compliance already in place |

---

## Conclusion

This architectural plan provides a complete, production-ready implementation for Pages 13-18 of the Car Crash Lawyer AI legal document. The design prioritizes:

✅ **Legal document quality** - Closing statement style narrative
✅ **Factual accuracy** - Temperature 0.3, no fabrication
✅ **Comprehensive data** - ALL 160+ incident fields used
✅ **Clear traceability** - UI → Database → PDF mapping
✅ **Compliance** - Full text only, no URLs
✅ **User experience** - Preview panels, clear feedback

**Implementation Time Estimate:** 16-20 hours (2-3 days)
**Risk Level:** Low (existing infrastructure, well-defined requirements)
**Business Value:** High (centre piece of legal document)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-16
**Next Review:** After Phase 6 completion
**Prepared By:** Claude Code (Senior Software Engineer)
**Approved By:** [Pending User Review]
