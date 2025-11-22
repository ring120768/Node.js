# PDF Accuracy Verification Plan

**Critical Mission:** Ensure 100% of collected data flows accurately into the final PDF
**Risk:** Hard work on forms/database wasted if PDF mapping is incomplete or incorrect

---

## Critical Risks to PDF Accuracy

### 🔴 HIGH RISK: Data Loss

#### Risk 1: Checkbox Array Mapping Errors

**The Problem:**
- Database: 64 individual BOOLEAN columns (`medical_chest_pain: true`)
- PDF: 7 TEXT[] array fields (`medical_symptoms: ['chest_pain', 'breathlessness']`)
- **Risk:** Mapping function bugs could silently drop checkbox selections

**Example Failure:**
```javascript
// BUGGY CODE
function mapMedicalSymptoms(data) {
  const symptoms = [];
  if (data.medical_chest_pain) symptoms.push('chest_pain');
  if (data.medical_breathlessness) symptoms.push('breathlessness');
  // OOPS: Forgot other 12 symptoms!
  return symptoms; // Only 2 out of 14 symptoms mapped!
}
```

**Impact:** User checked "Severe headache" but PDF shows no symptoms → Legal case weakened

**Mitigation:**
1. ✅ Create comprehensive mapping table (database column → PDF array value)
2. ✅ Write unit tests for each mapping function
3. ✅ Automated test: Loop through all 64 checkboxes, verify each maps correctly
4. ✅ Visual verification: Generate test PDF with ALL checkboxes selected

---

#### Risk 2: Multi-Vehicle/Witness Data Truncation

**The Problem:**
- Database: Supports unlimited vehicles/witnesses (one-to-many tables)
- PDF: Single "Other Vehicle" section, single "Witness Details" textarea
- **Risk:** 2nd and 3rd vehicles/witnesses completely lost

**Example Failure:**
```javascript
// BUGGY CODE
const otherVehicle = vehicles[0]; // Only first vehicle!
pdfField.setText(otherVehicle.driver_name);
// Vehicles 2, 3, 4 completely ignored!
```

**Impact:** 3-car pile-up recorded as 2-car accident → Insurance claim denied

**Mitigation:**
1. ✅ Show first vehicle in main section
2. ✅ If multiple vehicles: Add "Additional Vehicles Involved: 2 more (see Page 18)"
3. ✅ Create overflow page with table of all vehicles
4. ✅ Test with 1, 2, 3, 5 vehicles to verify all captured

---

#### Risk 3: Image Download/Embed Failures

**The Problem:**
- Database: 11 image URL fields (temporary Supabase Storage URLs)
- PDF: 11 image placeholders (need embedded binary data)
- **Risk:** Images fail to download, corrupted, wrong format, expired URLs

**Example Failures:**
- Signed URL expired (1-hour window)
- Image format not supported by pdf-lib (HEIC from iPhone)
- Network timeout during download
- Image too large (>10MB) causes PDF corruption

**Impact:** Critical accident scene photos missing from legal document

**Mitigation:**
1. ✅ Download images at PDF generation time (fresh signed URLs)
2. ✅ Convert HEIC → JPEG before embedding
3. ✅ Compress images to <2MB each
4. ✅ Fallback: Show "Image unavailable - see original file" placeholder
5. ✅ Log all image processing failures for manual review

---

### 🟡 MEDIUM RISK: Data Corruption

#### Risk 4: Field Name Mismatches

**The Problem:**
- Database column: `when_did_the_accident_happen` (DATE)
- PDF field name: `accident_date` (different!)
- **Risk:** Silent failure where field stays blank because names don't match

**Example Failure:**
```javascript
// BUGGY CODE
pdfField.getTextField('accident_date').setText(data.when_did_the_accident_happen);
// Error: "Field 'accident_date' not found in PDF" → Caught
// OR WORSE: No error, field just stays blank → Silent failure
```

**Impact:** PDF shows no accident date → Document looks incomplete/unprofessional

**Mitigation:**
1. ✅ Create explicit field mapping table:
   ```javascript
   const FIELD_MAP = {
     'accident_date': 'when_did_the_accident_happen',
     'accident_time': 'what_time_did_the_accident_happen',
     // ... all 98 fields
   };
   ```
2. ✅ Validation test: Loop through all 98 PDF fields, verify database column exists
3. ✅ Throw error if mapping missing (fail loudly, not silently)

---

#### Risk 5: Date/Time Format Mismatches

**The Problem:**
- Database: `2025-11-01` (ISO format)
- PDF (UK user): Expects `01/11/2025` (DD/MM/YYYY)
- **Risk:** Wrong format shows in PDF, or worse: US format (MM/DD/YYYY)

**Example Failures:**
- Shows `2025-11-01` in PDF (technical format, not user-friendly)
- Shows `11/01/2025` (US format) → User reads as 11th January, not 1st November!
- Time shows `14:30:00` instead of `14:30` or `2:30 PM`

**Impact:** Confusion in legal document, date appears wrong

**Mitigation:**
1. ✅ Always format dates as `DD/MM/YYYY`
2. ✅ Always format times as `HH:MM` (24-hour for UK)
3. ✅ Test with edge cases: leap years, BST/GMT transitions, midnight
4. ✅ Visual verification: Generate test PDF, manually check date rendering

---

#### Risk 6: NULL/Undefined Showing as Text

**The Problem:**
- Database: Optional field is NULL
- PDF: Shows literal text "null" or "undefined"

**Example Failure:**
```javascript
// BUGGY CODE
pdfField.setText(data.other_damage_prior); // If NULL, shows "null" as text!
```

**Impact:** PDF looks broken, unprofessional ("Other damage: null")

**Mitigation:**
1. ✅ Always default NULL/undefined to empty string:
   ```javascript
   pdfField.setText(data.other_damage_prior || '');
   ```
2. ✅ Test with real sparse data (user skipped optional fields)

---

### 🟢 LOW RISK: Formatting Issues

#### Risk 7: Character Encoding Problems

**The Problem:**
- UK names with accents: "Señor García"
- Currency symbols: £1,250.50
- **Risk:** Shows as "Se�or Garc�a" or "�1,250.50"

**Mitigation:**
1. ✅ Use UTF-8 encoding throughout
2. ✅ Test with real UK names (O'Brien, Müller, Joséphine)
3. ✅ Test with £ symbol in all currency fields

---

#### Risk 8: Text Overflow/Truncation

**The Problem:**
- PDF field: 500 character limit
- Database: 2500 word AI narrative
- **Risk:** Text cut off mid-sentence

**Mitigation:**
1. ✅ Use multiline text fields for long content
2. ✅ Auto-size font or overflow to multiple pages
3. ✅ Test with maximum-length narratives (2500 words)

---

## Comprehensive Verification Strategy

### Phase 1: Field Mapping Validation (DAY 1)

**Goal:** Verify every database column has a PDF field and vice versa

**Tasks:**
1. ✅ Extract all PDF field names from actual PDF template
   ```bash
   node scripts/extract-pdf-fields.js
   ```
2. ✅ Create master mapping table:
   ```javascript
   const COMPLETE_FIELD_MAP = {
     // Page 1 (9 fields)
     'accident_date': 'when_did_the_accident_happen',
     'accident_time': 'what_time_did_the_accident_happen',
     // ... all 98 fields with explicit mappings
   };
   ```
3. ✅ Automated validation script:
   ```javascript
   // Verify all PDF fields have database mappings
   for (const pdfField of pdfFieldNames) {
     if (!COMPLETE_FIELD_MAP[pdfField]) {
       throw new Error(`PDF field "${pdfField}" has no database mapping!`);
     }
   }

   // Verify all database columns are used
   for (const dbColumn of requiredColumns) {
     const mapped = Object.values(COMPLETE_FIELD_MAP).includes(dbColumn);
     if (!mapped) {
       console.warn(`Database column "${dbColumn}" not used in PDF`);
     }
   }
   ```

**Success Criteria:**
- ✅ 98 PDF fields → 98 database columns (100% mapping coverage)
- ✅ Zero unmapped fields
- ✅ Zero "field not found" errors

---

### Phase 2: Checkbox Mapping Tests (DAY 2)

**Goal:** Ensure all 64 checkboxes map correctly to 7 array fields

**Tasks:**
1. ✅ Create test data with ALL checkboxes selected:
   ```javascript
   const testData = {
     // Medical symptoms (14 checkboxes)
     medical_chest_pain: true,
     medical_breathlessness: true,
     medical_abdominal_bruising: true,
     // ... all 14 set to true

     // Weather conditions (13 checkboxes)
     weather_clear_and_dry: true,
     weather_overcast: true,
     // ... all 13 set to true

     // ... all 64 checkboxes set to true
   };
   ```

2. ✅ Run mapping functions:
   ```javascript
   const medicalSymptoms = mapMedicalSymptoms(testData);
   assert(medicalSymptoms.length === 14, 'Should map all 14 symptoms');
   assert(medicalSymptoms.includes('chest_pain'), 'Should include chest_pain');
   // ... verify all 14 values present
   ```

3. ✅ Generate test PDF with all checkboxes selected

4. ✅ Visual verification: Open PDF, confirm all checkboxes ticked

**Success Criteria:**
- ✅ All 64 database BOOLEAN columns → correct array values
- ✅ Test PDF shows all checkboxes selected
- ✅ Unit tests pass for all 6 mapping functions

---

### Phase 3: Multi-Record Handling (DAY 3)

**Goal:** Ensure multiple vehicles/witnesses don't get lost

**Test Cases:**
1. **Single vehicle/witness** - Baseline test
2. **2 vehicles** - Should show both (main section + overflow)
3. **3 witnesses** - Should concatenate all in textarea
4. **5 vehicles + 5 witnesses** - Stress test

**Tasks:**
1. ✅ Create test incident with 3 vehicles:
   ```javascript
   const testIncident = {
     incident_id: 'test-123',
     vehicles: [
       { driver_name: 'John Smith', license_plate: 'ABC123', ... },
       { driver_name: 'Jane Doe', license_plate: 'XYZ789', ... },
       { driver_name: 'Bob Wilson', license_plate: 'DEF456', ... }
     ]
   };
   ```

2. ✅ Generate PDF

3. ✅ Verify:
   - First vehicle in main "Other Vehicle" section (Pages 9-10)
   - Note says "Additional Vehicles: 2 more (see Page 18)"
   - Page 18 shows table with vehicles 2 and 3

**Success Criteria:**
- ✅ Zero data loss (all vehicles/witnesses appear somewhere in PDF)
- ✅ Clear indication when overflow occurs
- ✅ Professional formatting (not "dumped" text)

---

### Phase 4: Image Embedding Tests (DAY 4-5)

**Goal:** Ensure all 11 images embed correctly

**Test Cases:**
1. **All images present** - Happy path
2. **Missing images** - Some NULL URLs
3. **Expired URLs** - Signed URLs older than 1 hour
4. **Large images** - 10MB+ photos
5. **HEIC format** - iPhone photos
6. **Corrupted files** - Incomplete downloads

**Tasks:**
1. ✅ Create test incident with 11 real images
2. ✅ Download and embed all images
3. ✅ Test with missing image (NULL URL):
   ```javascript
   const images = {
     scene_overview_1: 'https://storage.supabase.co/...',
     scene_overview_2: null, // Missing
     vehicle_damage_1: 'https://storage.supabase.co/...',
     // ...
   };
   ```
4. ✅ Verify fallback placeholder shows for missing images
5. ✅ Test HEIC → JPEG conversion
6. ✅ Test image compression (10MB → 2MB)

**Success Criteria:**
- ✅ All available images embed successfully
- ✅ Missing images show professional placeholder (not blank/error)
- ✅ HEIC images converted and embedded
- ✅ Large images compressed without quality loss
- ✅ Zero PDF corruption from image processing

---

### Phase 5: Date/Time/Format Tests (DAY 6)

**Goal:** Ensure UK formatting throughout

**Test Cases:**
1. **Dates:** `2025-11-01` → `01/11/2025` ✅
2. **Times:** `14:30:00` → `14:30` ✅
3. **Currency:** `1250.50` → `£1,250.50` ✅
4. **Phone:** `+447411005390` → `+44 7411 005390` (optional spacing)
5. **Postcode:** `SW1A1AA` → `SW1A 1AA` (optional spacing)

**Tasks:**
1. ✅ Create test data with all format types
2. ✅ Generate PDF
3. ✅ Visual verification of each formatted field
4. ✅ Test edge cases:
   - Leap year date (29/02/2024)
   - Midnight (00:00)
   - £0.00 (zero amount)
   - International phone (+1-555-123-4567)

**Success Criteria:**
- ✅ 100% UK-formatted dates (DD/MM/YYYY)
- ✅ 100% 24-hour times (HH:MM)
- ✅ Currency symbol always £
- ✅ No US-format dates (MM/DD/YYYY)

---

### Phase 6: NULL/Sparse Data Tests (DAY 7)

**Goal:** Ensure optional fields handled gracefully

**Test Case:**
- User completes only REQUIRED fields
- All optional fields are NULL

**Tasks:**
1. ✅ Create minimal test data:
   ```javascript
   const minimalData = {
     // Required fields only
     when_did_the_accident_happen: '2025-11-01',
     what_time_did_the_accident_happen: '14:30',
     where_exactly_did_this_happen: 'M1 Junction 15',

     // All optional fields NULL
     medical_attention: null,
     weather_conditions: null,
     witness_contact_information: null,
     // ... 60+ optional fields as NULL
   };
   ```

2. ✅ Generate PDF

3. ✅ Verify:
   - No "null" text appears
   - No "undefined" text appears
   - Blank fields are truly blank (not error messages)

**Success Criteria:**
- ✅ Zero literal "null" or "undefined" strings in PDF
- ✅ Optional fields blank but professional-looking
- ✅ No JavaScript errors from NULL handling

---

### Phase 7: Character Encoding Tests (DAY 8)

**Goal:** Ensure special characters render correctly

**Test Data:**
```javascript
const specialCharacters = {
  driver_name: "Señor José García-O'Brien",
  address: "123 Müller Straße, £150,000 property",
  narrative: "The driver said: \"I didn't see him!\" Cost: £1,250.50",
  // Test all UK/European characters
};
```

**Tasks:**
1. ✅ Generate PDF with special characters
2. ✅ Verify all characters render correctly:
   - ñ, é, ç, ü, ö, ä (European accents)
   - £ (pound symbol)
   - ' (apostrophe in O'Brien)
   - " " (quotes)
   - – — (dashes)

**Success Criteria:**
- ✅ All special characters visible
- ✅ No � (replacement character) anywhere
- ✅ Currency symbols correct

---

### Phase 8: Full Integration Test (DAY 9-10)

**Goal:** Generate PDF from real production data

**Tasks:**
1. ✅ Select 5 real user incidents from database
2. ✅ Generate PDFs for each
3. ✅ Manual review of all 5 PDFs:
   - Check every page (17 pages × 5 PDFs = 85 pages)
   - Verify all fields populated
   - Verify images embedded
   - Verify formatting correct
   - Look for any anomalies

4. ✅ Compare PDF data vs database query results:
   ```sql
   SELECT * FROM incident_reports WHERE id = 'real-uuid';
   SELECT * FROM incident_other_vehicles WHERE incident_id = 'real-uuid';
   SELECT * FROM incident_witnesses WHERE incident_id = 'real-uuid';
   ```

5. ✅ Field-by-field comparison (98 fields × 5 incidents = 490 verifications)

**Success Criteria:**
- ✅ 100% of database fields appear in PDF
- ✅ Zero formatting errors
- ✅ Zero data corruption
- ✅ All images embedded
- ✅ Legal team approves PDF quality

---

## Automated Test Suite

### Create: `test-pdf-accuracy.js`

```javascript
const { PDFDocument } = require('pdf-lib');
const { generatePDF } = require('./src/services/adobePdfFormFillerService');
const supabase = require('./src/config/supabaseClient');

/**
 * Comprehensive PDF accuracy test suite
 * Tests all critical data flows from database → PDF
 */

describe('PDF Accuracy Tests', () => {

  // Test 1: Field Mapping Coverage
  test('All PDF fields have database mappings', async () => {
    const pdfFields = await extractPdfFieldNames();
    const dbColumns = getRequiredDatabaseColumns();

    for (const field of pdfFields) {
      const mapping = FIELD_MAP[field];
      expect(mapping).toBeDefined();
      expect(dbColumns).toContain(mapping);
    }
  });

  // Test 2: Checkbox Array Mapping
  test('All 64 checkboxes map to arrays correctly', async () => {
    const testData = createAllCheckboxesSelectedData();

    const medicalSymptoms = mapMedicalSymptoms(testData);
    expect(medicalSymptoms).toHaveLength(14);
    expect(medicalSymptoms).toContain('chest_pain');
    expect(medicalSymptoms).toContain('breathlessness');
    // ... all 14 symptoms

    const weatherConditions = mapWeatherConditions(testData);
    expect(weatherConditions).toHaveLength(13);
    // ... verify all weather conditions

    // ... test all 6 mapping functions
  });

  // Test 3: Multi-Vehicle Handling
  test('Multiple vehicles all appear in PDF', async () => {
    const testData = createThreeVehicleIncident();
    const pdfBytes = await generatePDF(testData);
    const pdf = await PDFDocument.load(pdfBytes);

    const text = await extractPdfText(pdf);

    // Verify all 3 vehicles mentioned
    expect(text).toContain('ABC123'); // Vehicle 1 license plate
    expect(text).toContain('XYZ789'); // Vehicle 2 license plate
    expect(text).toContain('DEF456'); // Vehicle 3 license plate

    // Verify overflow notation
    expect(text).toContain('Additional Vehicles: 2 more');
  });

  // Test 4: NULL Handling
  test('NULL fields show as blank, not "null" text', async () => {
    const sparseData = createMinimalRequiredFieldsData();
    const pdfBytes = await generatePDF(sparseData);
    const pdf = await PDFDocument.load(pdfBytes);

    const text = await extractPdfText(pdf);

    // Should NOT contain literal null/undefined
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('NaN');
  });

  // Test 5: Date Formatting
  test('Dates formatted as DD/MM/YYYY (UK format)', async () => {
    const testData = {
      when_did_the_accident_happen: '2025-11-01' // ISO format
    };

    const pdfBytes = await generatePDF(testData);
    const pdf = await PDFDocument.load(pdfBytes);
    const text = await extractPdfText(pdf);

    // Should show UK format
    expect(text).toContain('01/11/2025');

    // Should NOT show US format or ISO format
    expect(text).not.toContain('11/01/2025');
    expect(text).not.toContain('2025-11-01');
  });

  // Test 6: Character Encoding
  test('Special characters render correctly', async () => {
    const testData = {
      other_drivers_name: "Señor José García-O'Brien",
      damage_caused_by_accident: "Cost: £1,250.50"
    };

    const pdfBytes = await generatePDF(testData);
    const pdf = await PDFDocument.load(pdfBytes);
    const text = await extractPdfText(pdf);

    // Verify special characters present
    expect(text).toContain('ñ');
    expect(text).toContain('é');
    expect(text).toContain('£');

    // Should NOT show replacement character
    expect(text).not.toContain('�');
  });

  // Test 7: Image Embedding
  test('All available images embedded in PDF', async () => {
    const testData = createIncidentWith11Images();
    const pdfBytes = await generatePDF(testData);
    const pdf = await PDFDocument.load(pdfBytes);

    // Count embedded images
    const images = pdf.getPages().flatMap(page => page.getImages());
    expect(images.length).toBeGreaterThanOrEqual(11);
  });

  // Test 8: Real Data Integration
  test('Real production data generates valid PDF', async () => {
    // Fetch real incident from database
    const { data: incident } = await supabase
      .from('incident_reports')
      .select('*')
      .limit(1)
      .single();

    // Generate PDF
    const pdfBytes = await generatePDF(incident);

    // Verify PDF is valid
    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000); // Non-trivial size

    // Load and verify structure
    const pdf = await PDFDocument.load(pdfBytes);
    expect(pdf.getPageCount()).toBe(17); // Should be 17 pages
  });
});
```

---

## Manual Verification Checklist

**Use this for visual inspection of test PDFs:**

### Page 1: Incident Overview
- [ ] Accident date formatted as DD/MM/YYYY
- [ ] Accident time formatted as HH:MM
- [ ] Location text populated
- [ ] Speed and license plate visible
- [ ] Vehicle make/model correct
- [ ] Road type and speed limit selected

### Page 2: Medical Assessment
- [ ] All selected symptoms show as checked
- [ ] Medical questions have text answers
- [ ] No checkboxes missing
- [ ] "None of these" exclusive with other symptoms

### Page 3: Vehicle Damage
- [ ] Damage description populated
- [ ] Airbag deployment status correct
- [ ] Seatbelt usage correct
- [ ] Prior damage text shown (or blank if none)

### Pages 4-7: Weather & Road
- [ ] All selected weather conditions checked
- [ ] Road surface conditions checked
- [ ] Junction type correct
- [ ] Special conditions present
- [ ] No duplicate selections

### Page 8: Narrative
- [ ] Full detailed account visible
- [ ] No text cut off
- [ ] Font readable (auto-sized if needed)

### Pages 9-10: Other Vehicle
- [ ] First vehicle details complete
- [ ] If multiple vehicles: Overflow note present
- [ ] License plate, make, model visible
- [ ] Insurance info populated

### Pages 11-12: Police & Witnesses
- [ ] Police attendance status correct
- [ ] Reference number visible (if attended)
- [ ] Officer details shown
- [ ] Witness information complete
- [ ] If multiple witnesses: All concatenated

### Pages 13-15: Photos
- [ ] Scene overview images embedded
- [ ] Vehicle damage images embedded
- [ ] Other vehicle images embedded
- [ ] Missing images show placeholder
- [ ] Image quality acceptable
- [ ] No corrupted/blank images

### Page 16: AI Narrative
- [ ] AI model identifier shown
- [ ] Full narrative text visible (2000-2500 words)
- [ ] No overflow/cut-off
- [ ] Readable font size

### Page 17: Declaration
- [ ] User name populated from profile
- [ ] Current date shown
- [ ] Declaration text readable

---

## Success Metrics

### Definition of "100% Accurate PDF"

1. ✅ **Zero Data Loss**
   - Every non-NULL database field appears in PDF
   - Multi-record data (vehicles/witnesses) all present
   - No silent failures or blank fields

2. ✅ **Zero Format Errors**
   - All dates: DD/MM/YYYY
   - All times: HH:MM (24-hour)
   - All currency: £X,XXX.XX
   - All checkboxes: Correctly checked/unchecked
   - No "null", "undefined", "NaN" text

3. ✅ **Zero Character Corruption**
   - All special characters render (£, é, ñ, etc.)
   - No � replacement characters
   - Quotes and apostrophes correct

4. ✅ **Zero Image Failures**
   - All available images embedded
   - Missing images show professional placeholder
   - No corrupted/blank image areas

5. ✅ **Professional Quality**
   - Legal team approval
   - Client-ready formatting
   - Consistent fonts and spacing
   - UK-appropriate presentation

---

## Timeline

**Total:** 10 working days for bulletproof accuracy

| Phase | Days | Focus |
|-------|------|-------|
| Phase 1: Field Mapping | 1 | Verify 98 fields map correctly |
| Phase 2: Checkbox Arrays | 1 | Test 64 checkboxes → 7 arrays |
| Phase 3: Multi-Records | 1 | Test vehicles/witnesses |
| Phase 4: Images | 2 | Download, convert, embed 11 images |
| Phase 5: Formatting | 1 | UK dates, times, currency |
| Phase 6: NULL Handling | 1 | Sparse data tests |
| Phase 7: Encoding | 1 | Special characters |
| Phase 8: Integration | 2 | Real data, manual review |

---

## Deliverables

1. ✅ **Automated Test Suite** - `test-pdf-accuracy.js` (490+ assertions)
2. ✅ **Field Mapping Table** - Explicit database → PDF mappings (98 fields)
3. ✅ **Mapping Functions** - 6 checkbox array converters
4. ✅ **Test PDFs** - 10+ samples with different data patterns
5. ✅ **Verification Report** - Manual checklist results for 5 real incidents
6. ✅ **Legal Team Approval** - Sign-off on PDF quality

---

**Priority:** ⚠️ **CRITICAL** - Protects investment in forms/database work
**Owner:** Claude Code
**Review:** User (Ringo)
**Timeline:** Start immediately, complete in 10 days
