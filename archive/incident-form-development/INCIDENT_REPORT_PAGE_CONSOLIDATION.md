# Incident Report Form: Page Consolidation Strategy

**Date**: 2025-10-28
**Purpose**: Document how 40+ Typeform screens are consolidated into 10 web form pages
**Status**: Planning Phase

---

## Overview

**Typeform Structure**: 40+ individual screens (one question per screen)
**Web Form Structure**: 9 multi-field pages (grouped by context)

**Benefits of Consolidation**:
- ✅ **Faster completion** - Fewer page transitions (40 clicks → 10 clicks)
- ✅ **Better context** - Related fields visible together
- ✅ **Mobile-friendly** - Immediate image upload (no ERR_UPLOAD_FILE_CHANGED)
- ✅ **Progress visibility** - Clear visual progress (Page 2 of 10)
- ✅ **Validation feedback** - Real-time field validation before proceeding

---

## Page-by-Page Breakdown

### Page 1: Legal Advisory
**Typeform Screens**: 1 screen
**Web Form Fields**: Legal advisory + acknowledgment checkbox only

**Purpose**: Critical legal guidance before starting the incident report

**User Experience**: Clean, focused page with advisory content only. No form fields to fill. User reads the legal guidance, acknowledges understanding, and continues. Feels calm and guided, not rushed or overwhelming.

---

#### Legal Advisory Statement (Informational - Must Read & Acknowledge)

**🚨 CRITICAL: DO NOT ADMIT LIABILITY 🚨**

**Visual Design**:
- Red/amber warning banner at top of page
- Large bold heading
- Clean, scannable bullet points
- "I Understand" checkbox required to proceed

**Advisory Content**:

> **DO NOT say any of the following:**
> - ❌ "I'm sorry, it was my fault"
> - ❌ "I wasn't paying attention"
> - ❌ "I didn't see you"
> - ❌ "My brakes failed"
> - ❌ Any statement accepting blame

> **What TO DO at the scene:**
> - ✅ Exchange details only (name, registration, insurance)
> - ✅ Take photos of all vehicles and scene
> - ✅ Get witness contact details
> - ✅ Note road/weather conditions
> - ✅ Call police if anyone injured or vehicles blocking road

> **What TO SAY (if asked):**
> - ✅ "I need to speak with my insurance company first"
> - ✅ "I'm gathering all the facts before making any statements"
> - ✅ "Let's exchange details and let insurance handle this"

> **Why this matters:**
> - 📋 Anything you say CAN be used against you
> - 📋 Fault determination is complex - let experts decide
> - 📋 Admitting fault may void your insurance coverage
> - 📋 You may not know all the facts at the scene

> **Remember:**
> Being polite ≠ Admitting fault. You can be courteous while protecting your legal rights.

**Required Checkbox**:
☑️ "I understand that I must not admit liability at the scene or in this report. I will only state the facts."

**Button**: "I Understand — Continue to Report" (disabled until checkbox checked)

**Navigation**: Proceeds to Page 2 (Safety Check & Basic Information)

---

### Page 2: Safety Check & Basic Information
**Typeform Screens**: 2-3 screens
**Web Form Fields**: 3 fields

**Purpose**: Immediate safety assessment + establish basic context

**Fields**:
1. ☑️ "Are you safe right now?" (Multiple choice)
   - Options:
     - ✅ Yes, I'm safe and ready to complete this report
     - 🚑 I'm injured and need medical attention
     - ⚠️ I'm in immediate danger
     - 📞 Emergency services have been called
   - **Logic**: If injured/danger → redirect to 999 emergency page with "DO NOT ADMIT LIABILITY" reminder

2. ☑️ "Date of Accident" (Date picker)
   - Format: DD/MM/YYYY
   - Default: Today's date
   - Label: "When did the accident occur?"

3. ☑️ "Time of Accident" (Time picker)
   - Format: HH:MM
   - Default: Current time
   - Label: "Approximate time of accident"

**Typeform Mapping**:
- Original Screens: Safety Check (1) + Date (1) + Time (1)
- Consolidated: Safety triage + basic incident timeline

**Why This Approach**:
- **Safety first** - After reading legal advisory, confirm user is safe to proceed
- **Not overwhelming** - Simple yes/no safety check plus two basic fields
- **Quick to complete** - 30 seconds if user is safe
- **Sets the stage** - Date/time establish context for the full report

**Completion Time**: 30-60 seconds

---

### Page 3: Accident Location & Description
**Typeform Screens**: 2-3 screens
**Web Form Fields**: 3 fields

**Purpose**: Where and what happened

**Fields**:
1. ☑️ "Exact Location of Accident" (Text area)
   - Placeholder: "Street name, nearest landmark, junction details"
   - Integration: What3Words auto-populated (from GPS if available)

2. ☑️ "Detailed Account of What Happened" (Large text area)
   - Character limit: 5000
   - Guidance: "Include direction of travel, what you were doing, point of impact, what other vehicles were doing, any evasive actions"
   - **Most important field** - users need space and time for this

3. ☐ "Additional Notes" (Text area - optional)
   - For anything that doesn't fit elsewhere

**Typeform Mapping**:
- Original Screens: Accident Location (1) + Detailed Description (1) + Additional Notes (1)
- Consolidated: All narrative fields on one page

**Why Combined**:
- All text-heavy fields together (similar input method)
- Users can write continuously without interruption
- Location + description are closely related context

---

### Page 4: Weather & Road Conditions
**Typeform Screens**: 5-8 screens
**Web Form Fields**: 11 fields (checkboxes + dropdowns)

**Purpose**: Environmental factors at time of accident

**Section A: Weather Conditions** (Checkboxes - multiple selection)
- ☐ Clear
- ☐ Cloudy
- ☐ Raining
- ☐ Heavy Rain
- ☐ Drizzle
- ☐ Fog
- ☐ Snow
- ☐ Ice
- ☐ Windy
- ☐ Hail
- ☐ Thunder/Lightning
- ☐ Other Conditions

**Section B: Road Conditions**
1. Road Surface (Dropdown)
   - Options: Dry / Wet / Icy / Snow-covered / Loose surface

2. Road Type (Dropdown)
   - Options: Motorway / A-road / B-road / Urban street / Residential

3. Speed Limit (Number)
4. Your Estimated Speed (Number)
5. Traffic Conditions (Dropdown)
   - Options: Heavy / Moderate / Light / No traffic

6. Visibility (Dropdown)
   - Options: Good / Poor / Very poor / Severely restricted

7. Road Markings Visible? (Yes/No)

**Section C: Special Conditions** (Checkboxes)
- ☐ Traffic Lights
- ☐ Pedestrian Crossing
- ☐ Roundabout
- ☐ Junction
- ☐ School Zone

**Typeform Mapping**:
- Original Screens: Weather (12 screens - one per checkbox) + Road Surface (1) + Road Type (1) + Speed Limit (1) + Your Speed (1) + Traffic (1) + Visibility (1) + Road Markings (1) + Special Conditions (5 screens - one per checkbox)
- Consolidated: All environment-related fields on one page

**Why Combined**:
- All checkboxes can be selected quickly (under 2 minutes)
- Environmental conditions are mentally grouped together
- Visual scanning is faster than 25 individual page transitions

**Consolidation Impact**:
- **Before**: 25 page transitions (weather + road + special conditions)
- **After**: 1 page with organized sections
- **Time Saved**: ~3-4 minutes

---

### Page 5: Medical Information & Symptoms
**Typeform Screens**: 6-7 screens
**Web Form Fields**: 18 fields

**Purpose**: Injuries and medical treatment

**Section A: Medical Attention**
1. ☑️ "Do you need Medical Attention?" (Yes/No)
2. "Details of Injuries" (Text area - conditional)
   - Shows if Yes to medical attention
3. "Severity of Injuries" (Dropdown)
   - Options: Minor / Moderate / Severe / Critical
4. "Hospital or Medical Center Name" (Text - optional)
5. "Ambulance Called?" (Yes/No)
6. "Treatment Received" (Text area - optional)

**Section B: Symptoms** (Checkboxes - multiple selection)
- ☐ Headache
- ☐ Dizziness
- ☐ Nausea
- ☐ Back Pain
- ☐ Neck Pain
- ☐ Chest Pain
- ☐ Abdominal Pain
- ☐ Difficulty Breathing
- ☐ Bleeding
- ☐ Loss of Consciousness
- ☐ Other Symptoms

**Typeform Mapping**:
- Original Screens: Medical Attention (1) + Injury Details (1) + Severity (1) + Hospital (1) + Ambulance (1) + Treatment (1) + 11 Symptoms (11 screens - one per checkbox)
- Consolidated: All medical information on one page

**Why Combined**:
- Medical info is a single logical context
- Checkboxes allow quick multiple selections
- Conditional fields (injury details) only show when needed

**Consolidation Impact**:
- **Before**: 17 page transitions
- **After**: 1 page with conditional visibility
- **Time Saved**: ~2-3 minutes

---

### Page 6: Your Vehicle Details & Damage
**Typeform Screens**: 7 screens
**Web Form Fields**: 7 fields

**Purpose**: Information about your vehicle

**Fields**:
1. ☑️ "Your Vehicle Make" (Text)
   - Pre-filled from signup if available
2. ☑️ "Your Vehicle Model" (Text)
   - Pre-filled from signup if available
3. ☑️ "Your Vehicle Registration" (Text)
   - Pre-filled from signup if available
4. ☑️ "Your Vehicle Colour" (Text)
   - Pre-filled from signup if available
5. ☑️ "Damage to Your Vehicle" (Text area)
   - Detailed description of all damage
6. ☑️ "Was Your Vehicle Drivable After?" (Yes/No)
7. ☐ "Estimated Repair Cost (if known)" (Currency input - optional)

**Typeform Mapping**:
- Original Screens: Make (1) + Model (1) + Registration (1) + Colour (1) + Damage (1) + Drivable (1) + Repair Cost (1)
- Consolidated: All your vehicle info on one page

**Why Combined**:
- All fields relate to the user's own vehicle
- Many fields pre-filled (faster completion)
- Damage description is the most important field here

**Consolidation Impact**:
- **Before**: 7 page transitions
- **After**: 1 page with pre-filled data
- **Time Saved**: ~1-2 minutes

---

### Page 6: Other Driver & Vehicle Information
**Typeform Screens**: 12 screens
**Web Form Fields**: 12 fields

**Purpose**: Information about the other party involved

**Section A: Other Driver**
1. ☑️ "Other Driver Name" (Text)
2. ☑️ "Other Driver Address" (Text area)
3. ☐ "Other Driver Phone" (Phone number - optional)
4. ☐ "Other Driver Email" (Email - optional)

**Section B: Other Vehicle**
5. ☑️ "Other Vehicle Make" (Text)
6. ☑️ "Other Vehicle Model" (Text)
7. ☑️ "Other Vehicle Registration" (Text - **Most critical field**)
8. ☑️ "Other Vehicle Colour" (Text)

**Section C: Other Driver Insurance**
9. ☐ "Other Driver Insurance Company" (Text - optional)
10. ☐ "Other Driver Insurance Policy Number" (Text - optional)

**Section D: Other Vehicle Damage**
11. ☑️ "Damage to Other Vehicle" (Text area)
12. ☑️ "Other Driver Admitted Fault?" (Yes/No)

**Typeform Mapping**:
- Original Screens: Driver Name (1) + Address (1) + Phone (1) + Email (1) + Make (1) + Model (1) + Registration (1) + Colour (1) + Insurance Company (1) + Policy (1) + Damage (1) + Admitted Fault (1)
- Consolidated: All other party information on one page

**Why Combined**:
- All fields relate to the other party
- Users can reference physical documents (license, insurance) once
- Logical flow: Driver → Vehicle → Insurance → Damage

**Consolidation Impact**:
- **Before**: 12 page transitions
- **After**: 1 page with clear sections
- **Time Saved**: ~2-3 minutes

---

### Page 8: Police & Witness Information
**Typeform Screens**: 9 screens
**Web Form Fields**: 9 fields

**Purpose**: Official records and witness statements

**Section A: Police Information**
1. ☑️ "Were Police Called?" (Yes/No)
2. "Police Attended?" (Yes/No - conditional)
   - Shows if police were called
3. "Police Station Name" (Text - conditional)
4. "Police Officer Name" (Text - conditional)
5. "Police Officer Badge Number" (Text - conditional)
6. "Police Report Number" (Text - conditional)
   - Crime reference or incident number
7. "Were You Breathalyzed?" (Yes/No - conditional)

**Section B: Witness Information**
8. ☑️ "Were There Any Witnesses?" (Yes/No)
9. "Witness Details" (Large text area - conditional)
   - Guidance: "For each witness, include: Name, Phone, Email, What they saw"
   - Format:
     ```
     Witness 1:
     Name: [Name]
     Phone: [Phone]
     Email: [Email]
     What they saw: [Description]
     ```

**Typeform Mapping**:
- Original Screens: Police Called (1) + Police Attended (1) + Station (1) + Officer Name (1) + Badge (1) + Report Number (1) + Breathalyzed (1) + Witnesses Present (1) + Witness Details (1)
- Consolidated: All official information on one page

**Why Combined**:
- Police and witnesses are both "third-party verification"
- Conditional fields reduce clutter (only show if relevant)
- Users can check physical documents (police report, witness notes) once

**Consolidation Impact**:
- **Before**: 9 page transitions
- **After**: 1 page with conditional sections
- **Time Saved**: ~1-2 minutes

---

### Page 8: Evidence Photos (Scene & Vehicles)
**Typeform Screens**: 11 screens
**Web Form Fields**: 11 file upload fields

**Purpose**: Visual evidence of accident

**Section A: Accident Scene Photos** (3 uploads)
1. 📷 "Accident Scene Photo 1" (Overall view)
2. 📷 "Accident Scene Photo 2" (Different angle - optional)
3. 📷 "Accident Scene Photo 3" (Additional details - optional)

**Section B: Your Vehicle Damage** (3 uploads)
4. 📷 "Your Vehicle Damage Photo 1" (Close-up - **Recommended**)
5. 📷 "Your Vehicle Damage Photo 2" (Different angle - optional)
6. 📷 "Your Vehicle Damage Photo 3" (Interior/additional - optional)

**Section C: Other Vehicle** (1 upload)
7. 📷 "Other Vehicle Damage Photo" (If possible - optional)

**Section D: Documents** (4 uploads)
8. 📄 "Police Report Document" (PDF/image - optional)
9. 📄 "Insurance Documents" (PDF/image - optional)
10. 📄 "Medical Documents" (Receipts, prescriptions - optional)
11. 📄 "Other Supporting Documents" (Any other evidence - optional)

**Technical Implementation**:
- **Immediate upload** when file selected (mobile-friendly)
- POST to `/api/images/temp-upload` → returns temp path
- On page submit → backend moves temp → permanent storage
- Progress indicator for each upload
- Preview thumbnails for images

**Typeform Mapping**:
- Original Screens: 11 screens (one per upload)
- Consolidated: All uploads on one page with organized sections

**Why Combined**:
- Users can select multiple files at once (faster on mobile)
- All photos visible together (easier to verify coverage)
- Immediate upload prevents file handle expiry on mobile
- Visual preview helps users verify they've captured everything

**Consolidation Impact**:
- **Before**: 11 page transitions + 11 separate uploads
- **After**: 1 page with immediate multi-upload
- **Time Saved**: ~3-4 minutes
- **Mobile improvement**: No ERR_UPLOAD_FILE_CHANGED errors

---

### Page 9: Final Review & Legal Declaration
**Typeform Screens**: 3 screens
**Web Form Fields**: 3 fields + review summary

**Purpose**: Confirm accuracy and legal acknowledgment

**Section A: Review Summary** (Auto-generated, not editable)
- ✓ Safety status
- ✓ Accident date/time/location
- ✓ Your vehicle: [Make] [Model] [Registration]
- ✓ Other vehicle: [Make] [Model] [Registration]
- ✓ Photos uploaded: X scene, Y your vehicle, Z other vehicle, W documents
- ✓ Police report: Yes/No
- ✓ Witnesses: Yes/No
- ✓ Medical attention: Yes/No

**Section B: Final Questions**
1. ☑️ "Were You Issued a Fixed Penalty Notice?" (Yes/No)
2. ☑️ "Do You Accept Responsibility for the Accident?" (Yes/No)

**Section C: Legal Declaration** (Required checkbox)
3. ☑️ "I confirm that the information provided is true and accurate to the best of my knowledge. I understand that providing false information may affect my legal claim."

**Submit Button**: "Submit Incident Report"

**Typeform Mapping**:
- Original Screens: Fixed Penalty (1) + Accept Responsibility (1) + Completion/Declaration (1)
- Consolidated: Final review + legal acknowledgment on one page

**Why Combined**:
- Review summary gives user confidence before submitting
- Legal declaration is final commitment
- All final actions on one page (no confusion about submission)

**Consolidation Impact**:
- **Before**: 3 separate screens
- **After**: 1 comprehensive final page with summary
- **Benefit**: User can verify everything before submitting

---

## Overall Consolidation Summary

| Page | Typeform Screens | Web Form Fields | Time Estimate | Critical Fields |
|------|------------------|-----------------|---------------|-----------------|
| 1. Safety & Initial Check | 1-3 | 3 | 30 sec | Are you safe?, Date, Time |
| 2. Location & Description | 2-3 | 3 | 3-5 min | Location, Detailed account |
| 3. Weather & Road | 25+ | 11 | 2-3 min | Weather checkboxes, Road conditions |
| 4. Medical & Symptoms | 17 | 18 | 2-3 min | Medical attention, Symptoms |
| 5. Your Vehicle | 7 | 7 | 1-2 min | Registration, Damage description |
| 6. Other Party | 12 | 12 | 2-3 min | Other registration, Insurance |
| 7. Police & Witnesses | 9 | 9 | 1-2 min | Police report, Witness details |
| 8. Photos & Documents | 11 | 11 | 2-4 min | Scene photos, Damage photos |
| 9. Review & Declaration | 3 | 3 + summary | 1-2 min | Legal declaration |
| **TOTAL** | **40+ screens** | **77 fields** | **15-25 min** | **131+ database fields** |

**Efficiency Gains**:
- ✅ **40 page clicks → 9 page clicks** (77% reduction)
- ✅ **Estimated time**: 15-25 minutes (same as Typeform, but better UX)
- ✅ **Mobile-friendly**: Immediate image upload prevents errors
- ✅ **Context grouping**: Related fields visible together
- ✅ **Progress tracking**: Clear visual indicator (Page X of 9)
- ✅ **Real-time validation**: Errors shown before proceeding
- ✅ **Better accessibility**: Form can be navigated back/forward

---

## Technical Implementation Notes

### Page Validation Strategy
Each page validates before allowing navigation to next page:

```javascript
function validatePage1() {
  const safe = document.getElementById('are_you_safe').value;
  const date = document.getElementById('accident_date').value;
  const time = document.getElementById('accident_time').value;

  if (!safe || !date || !time) {
    showError('Please complete all required fields');
    return false;
  }

  // If unsafe, redirect to emergency page
  if (safe === 'injured' || safe === 'danger') {
    window.location.href = '/emergency.html';
    return false;
  }

  return true;
}
```

### Immediate Image Upload (Mobile-Friendly)
```javascript
// Upload immediately when file selected
document.getElementById('scene_photo_1').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const response = await fetch('/api/images/temp-upload', {
    method: 'POST',
    body: formData
  });

  const { temp_path } = await response.json();

  // Store temp path for final submission
  tempUploads.scene_photo_1 = temp_path;

  // Show preview thumbnail
  showPreview('scene_photo_1', temp_path);
});
```

### Final Submission
```javascript
async function submitIncidentReport() {
  const formData = {
    // Page 1
    are_you_safe: document.getElementById('are_you_safe').value,
    accident_date: document.getElementById('accident_date').value,
    accident_time: document.getElementById('accident_time').value,

    // Page 2
    accident_location: document.getElementById('accident_location').value,
    incident_description: document.getElementById('incident_description').value,

    // ... all other fields ...

    // Images (temp paths from immediate uploads)
    temp_images: tempUploads
  };

  const response = await fetch('/api/incident-reports/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  if (response.ok) {
    window.location.href = '/incident-submitted.html';
  }
}
```

---

## Database Mapping

All 131+ fields map directly to `incident_reports` table columns. The consolidation only changes the **presentation** (UI), not the **data structure** (database).

**No database changes required** - all existing webhook fields are preserved.

---

## Migration Approach

**Phase 1: Build Web Form** (parallel to existing Typeform)
- Create 9-page incident form in `/public/incident-form.html`
- Reuse signup form patterns (page navigation, validation)
- Test with real user data

**Phase 2: Add API Endpoint**
- Create `/api/incident-reports/submit` controller
- Validate incoming data
- Process temp images → permanent storage
- Insert into `incident_reports` table
- Generate confirmation email

**Phase 3: Testing**
- Test all 9 pages with various scenarios
- Verify mobile image upload works
- Check validation on each page
- Confirm database inserts match Typeform structure

**Phase 4: Gradual Rollout**
- Keep Typeform as fallback
- Add toggle in dashboard: "New Incident Report (Beta)"
- Monitor for issues
- Collect user feedback

**Phase 5: Full Replacement**
- Make web form the default
- Remove Typeform integration (keep webhook for existing submissions)
- Update documentation

---

## User Experience Comparison

| Feature | Typeform (Current) | Web Form (Proposed) |
|---------|-------------------|---------------------|
| Total Screens | 40+ | 9 pages |
| Page Transitions | 40 clicks | 9 clicks |
| Mobile Upload | File handle expires | Immediate upload |
| Progress Tracking | % complete (vague) | Page 3 of 9 (clear) |
| Back Navigation | Limited | Full back/forward |
| Field Grouping | One per screen | Logical grouping |
| Validation Feedback | End of form | Real-time per page |
| Error Recovery | Start over | Fix page and continue |
| Accessibility | Limited keyboard nav | Full keyboard support |
| Pre-filled Data | URL parameters only | Session-aware pre-fill |

---

**Status**: ✅ Planning Complete
**Next Step**: Build Page 1 (Safety & Initial Check)
**Approval Required**: User to confirm this consolidation strategy before implementation

---

**Last Updated**: 2025-10-28
**Created By**: Claude Code
**Related Documents**:
- `TYPEFORM_QUESTIONS_REFERENCE.md` - Complete Typeform field reference
- `SIGNUP_PAGE1_IMPROVEMENTS.md` - Similar UX patterns used in signup
- `CLAUDE.md` - Project architecture and standards
