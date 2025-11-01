# Adobe PDF Field Creation Guide

**Purpose:** Manual field creation in Adobe Acrobat Pro using MASTER_PDF_FIELD_LIST.csv
**Your Workflow:** Create fields → Upload PDF → I verify field names → Test/Iterate

---

## Quick Answers to Your Concerns

### 1. Checkbox Mapping Bugs ✅ SOLVED

**Your Solution:** Manually check and add missed checkboxes in Adobe Acrobat

**How to do it:**
1. Open `MASTER_PDF_FIELD_LIST.csv`
2. Filter by `Field_Type = Checkbox`
3. You'll see:
   - Page 2: 11 medical symptom checkboxes
   - Page 4: 11 weather condition checkboxes
   - Page 5: 4 junction type checkboxes
   - Page 6: 5 special condition checkboxes
4. Create each checkbox in Adobe Acrobat with EXACT field names from CSV
5. I'll verify all 31 checkboxes present when you upload PDF

**Verification:** I'll run `extract-pdf-fields.js` and compare against the CSV list.

---

### 2. Multi-Vehicle Truncation ✅ SOLVED

**Your Solution:** Create duplicate pages for additional vehicles

**Strategy:**

**Pages 9-10 (Main):** "Other Vehicle 1" - Always shows first vehicle
**Page 18 (Overflow):** "Additional Vehicles" - Table format for vehicles 2, 3, 4, etc.

**Page 18 Layout Suggestion:**

```
┌────────────────────────────────────────────────────────────────┐
│                    ADDITIONAL VEHICLES INVOLVED                 │
├─────────┬────────────┬─────────────┬──────────┬────────────────┤
│ License │ Make/Model │ Driver Name │ Phone    │ Insurance      │
├─────────┼────────────┼─────────────┼──────────┼────────────────┤
│ [Text]  │ [Text]     │ [Text]      │ [Text]   │ [Text]         │
│ [Text]  │ [Text]     │ [Text]      │ [Text]   │ [Text]         │
│ [Text]  │ [Text]     │ [Text]      │ [Text]   │ [Text]         │
│ [Text]  │ [Text]     │ [Text]      │ [Text]   │ [Text]         │
│ [Text]  │ [Text]     │ [Text]      │ [Text]   │ [Text]         │
└─────────┴────────────┴─────────────┴──────────┴────────────────┘
```

**Field Names for Page 18:**

```csv
Page,PDF_Field_Name,Field_Type,Notes
18,vehicle2_license_plate,Text,2nd vehicle license plate
18,vehicle2_make_model,Text,2nd vehicle make/model (combined)
18,vehicle2_driver_name,Text,2nd vehicle driver name
18,vehicle2_phone,Text,2nd vehicle driver phone
18,vehicle2_insurance,Text,2nd vehicle insurance company
18,vehicle3_license_plate,Text,3rd vehicle license plate
18,vehicle3_make_model,Text,3rd vehicle make/model (combined)
18,vehicle3_driver_name,Text,3rd vehicle driver name
18,vehicle3_phone,Text,3rd vehicle driver phone
18,vehicle3_insurance,Text,3rd vehicle insurance company
(repeat for vehicles 4, 5)
```

**In Code:** I'll check `incident_other_vehicles` count. If > 1, populate Page 18 and add note to Page 9: "See Page 18 for additional vehicles"

**Same Strategy for Witnesses:** Create Page 19 overflow table if needed.

---

### 3. Image Embedding Failures ✅ REFERENCE EXISTING CODE

**Good News:** I already solved this for `user_signup` images!

**Reference File:** `src/services/imageProcessorV2.js`

**What it does:**
1. Downloads image from Supabase Storage
2. Handles expired signed URLs (generates fresh ones)
3. Converts HEIC → JPEG
4. Compresses large images
5. Embeds in PDF using pdf-lib

**Your Part:** Create 11 image placeholder fields in Adobe Acrobat (Pages 13-15)

**Field Names:** Use exact names from MASTER_PDF_FIELD_LIST.csv:
- `scene_overview_1`, `scene_overview_2`
- `other_vehicle_photo_1`, `other_vehicle_photo_2`
- `your_damage_1`, `your_damage_2`, `your_damage_3`
- `what3words_location`
- `general_docs_1`, `general_docs_2`

**My Part:** I'll use existing image processing code to:
1. Download images from database URLs
2. Convert/compress if needed
3. Embed into your PDF fields

**NULL Handling for Images:**
- If image URL is NULL → Show placeholder text "Image not provided"
- If download fails → Show placeholder text "Image unavailable"
- Never show error or blank space

---

### 4. Field Name Mismatches ✅ SOLVED BY CSV

**Your Solution:** Cut/paste exact field names from CSV into Adobe Acrobat

**Step-by-Step Process:**

1. Open MASTER_PDF_FIELD_LIST.csv in Excel/Numbers
2. Go to Page 1 rows
3. Copy `PDF_Field_Name` (e.g. `accident_date`)
4. In Adobe Acrobat Pro:
   - Tools → Prepare Form
   - Create text field
   - Paste name EXACTLY as copied
5. Repeat for all 80+ fields

**Why this works:**
- CSV contains authoritative field names
- Copy/paste eliminates typos
- I'll verify uploaded PDF matches CSV exactly

**Verification Script:**
```bash
node scripts/extract-pdf-fields.js "/path/to/your-uploaded.pdf"
# Outputs: field-list.json

# Then I compare:
# CSV field names vs actual PDF field names
# Any mismatches flagged immediately
```

---

### 5. Date Format Wrong ✅ ITERATE SOLUTION

**Your Solution:** "Solved by iterations"

**Strategy:**

**In Adobe Acrobat:**
- Create date fields as plain TEXT (not "Date" type)
- Field names: `accident_date`, `signature_date`

**In My Code:**
```javascript
// Format database date for UK display
function formatDateForPDF(isoDate) {
  if (!isoDate) return ''; // Handle NULL

  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`; // Always DD/MM/YYYY
}

// Usage:
pdfField.setText(formatDateForPDF(data.when_did_the_accident_happen));
// Input: '2025-11-01' → Output: '01/11/2025' ✅
```

**Testing:**
1. I generate test PDF with dates
2. You visually verify: "Does it show 01/11/2025?"
3. If wrong format → I fix code → regenerate
4. Iterate until correct

**Edge Cases I'll Test:**
- Leap years: 29/02/2024
- New Year: 31/12/2024 → 01/01/2025
- End of month: 30/04/2025 → 01/05/2025

---

### 6. NULL Showing as "null" ✅ SOLVED IN CODE

**Your Concern:** "Really not sure how we resolve this but if it can be done we shall find a way!"

**Solution:** I handle it in the code (you don't need to do anything in PDF)

**The Problem:**
```javascript
// BUGGY CODE
pdfField.setText(data.other_damage_prior);
// If NULL → shows literal "null" in PDF 😱
```

**The Fix:**
```javascript
// CORRECT CODE
function setFieldSafely(pdfField, value) {
  // Convert NULL/undefined to empty string
  const safeValue = value ?? ''; // Nullish coalescing

  // Also handle other falsy values
  if (value === null || value === undefined) {
    pdfField.setText('');
  } else {
    pdfField.setText(String(value));
  }
}

// Usage:
setFieldSafely(pdfField, data.other_damage_prior);
// If NULL → shows '' (blank) ✅
// If 'Some damage' → shows 'Some damage' ✅
```

**Testing:**
1. Create test incident with MANY NULL fields (sparse data)
2. Generate PDF
3. Search PDF text for "null", "undefined", "NaN"
4. If found → Fix code → regenerate
5. Iterate until zero instances

**Your Part:** Nothing! Just create the fields normally in Adobe Acrobat.

---

## Adobe Acrobat Pro Field Creation Steps

### Step 1: Open Template PDF

1. Open blank 17-page PDF template in Adobe Acrobat Pro
2. Tools → Prepare Form
3. Click "Start" (if prompted to detect fields, click "Cancel" - we'll create manually)

---

### Step 2: Create Fields Page-by-Page

**Use MASTER_PDF_FIELD_LIST.csv as your checklist**

#### Page 1 Example: Accident Date Field

1. Open MASTER_PDF_FIELD_LIST.csv
2. Find row: `Page 1, accident_date, Date, ...`
3. Copy field name: `accident_date`
4. In Adobe Acrobat:
   - Click "Add Text Field" tool
   - Draw rectangle where date should appear
   - Name field: Paste `accident_date`
   - Field type: Text (not Date - we'll format in code)
   - Click "Close"

#### Page 2 Example: Checkbox Field

1. CSV row: `Page 2, medical_chest_pain, Checkbox, ...`
2. Copy field name: `medical_chest_pain`
3. In Adobe Acrobat:
   - Click "Add Checkbox" tool
   - Draw small square where checkbox should appear
   - Name field: Paste `medical_chest_pain`
   - Export value: Leave as "Yes" (default)
   - Click "Close"

#### Page 8 Example: Large Textarea

1. CSV row: `Page 8, detailed_account, Textarea, ...`
2. Copy field name: `detailed_account`
3. In Adobe Acrobat:
   - Click "Add Text Field" tool
   - Draw LARGE rectangle (whole page if needed)
   - Name field: Paste `detailed_account`
   - Properties → Options tab:
     - ✅ Check "Multi-line"
     - ✅ Check "Scroll long text"
     - Font size: Auto (or 10pt)
   - Click "Close"

---

### Step 3: Field Properties for Each Type

#### Text Fields (e.g. `accident_location`)
- Type: Text
- Alignment: Left
- Font: Helvetica or Arial
- Font Size: Auto (or 12pt)
- Border: Thin black line (optional)
- Background: White or light gray

#### Checkboxes (e.g. `medical_chest_pain`)
- Type: Checkbox
- Check Style: Check (✓)
- Export Value: "Yes"
- Unchecked Value: "Off"
- Border: Thin black square
- Size: 12pt x 12pt

#### Radio Buttons (e.g. `airbags_deployed`)
- Type: Radio Button
- Group Name: Same for all options (e.g. `airbags_deployed`)
- Export Values: "Yes", "No", "Unknown"
- Only ONE can be selected at a time

#### Dropdown (e.g. `road_type`)
- Type: Dropdown
- Items: Motorway, A Road, B Road, Urban, Rural
- Sort items: No (keep logical order)
- Allow custom text: No

#### Textarea (e.g. `detailed_account`)
- Type: Text
- Multi-line: Yes ✅
- Scroll long text: Yes ✅
- Font size: 10pt (not Auto - prevents tiny text)
- Alignment: Left
- Very large field (500pt x 600pt minimum)

#### Date Fields (e.g. `accident_date`)
- Type: Text (not "Date" type!)
- We'll format in code
- Placeholder text: "DD/MM/YYYY" (optional)

#### Image Fields (e.g. `scene_overview_1`)
- Type: Button (yes, button!)
- Appearance: Icon only
- Layout: Icon only
- Lock icon: Yes
- This creates placeholder for image embedding

---

### Step 4: Page 16 (AI Narrative) - CRITICAL

**Large Text Field:**
- Field name: `ai_narrative_text`
- Multi-line: Yes ✅
- Scroll: Yes ✅
- Size: Entire page (minus margins)
- Font: 10pt (readable for 2500 words)
- Alignment: Left
- Background: Very light gray (optional, makes it clear it's AI-generated)

**Model Identifier:**
- Field name: `ai_model_used`
- Size: Small (200pt x 20pt)
- Font: 8pt (small, metadata)
- Alignment: Left
- Position: Bottom of page or header

---

### Step 5: Save and Export

1. File → Save As
2. Save as: `Car-Crash-Lawyer-AI-incident-report-FILLABLE.pdf`
3. Location: `/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/`

---

## Verification Checklist (Before Uploading to Me)

**Use this to self-check your PDF:**

### Field Count Check
- [ ] Page 1: 9 fields
- [ ] Page 2: 17 fields (6 text + 11 checkboxes)
- [ ] Page 3: 6 fields
- [ ] Page 4: 11 checkboxes
- [ ] Page 5: 5 fields (4 checkboxes + 1 text)
- [ ] Page 6: 6 fields (5 checkboxes + 1 text)
- [ ] Page 8: 1 large textarea
- [ ] Pages 9-10: 11 fields
- [ ] Pages 11-12: 11 fields
- [ ] Pages 13-15: 11 image placeholders
- [ ] Page 16: 2 fields (1 large textarea)
- [ ] Page 17: 3 fields
- [ ] **TOTAL: 80+ fields**

### Field Name Check
- [ ] All field names exactly match MASTER_PDF_FIELD_LIST.csv
- [ ] No typos (e.g. `accident_date` not `accidentDate` or `accident-date`)
- [ ] No spaces in field names
- [ ] All lowercase with underscores

### Field Type Check
- [ ] All checkboxes are type "Checkbox" (not button or text)
- [ ] All textareas have "Multi-line" enabled
- [ ] All image fields are type "Button" with icon
- [ ] Date fields are type "Text" (not "Date")

### Visual Check
- [ ] Fields aligned properly on page
- [ ] Text fields large enough for content
- [ ] Textareas very large (detailed_account, ai_narrative_text)
- [ ] Checkboxes visible and clickable
- [ ] No overlapping fields

---

## Upload and Verification Process

### When You're Ready

1. **Upload PDF to Dropbox:**
   - Save to: `/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/`
   - Filename: `Car-Crash-Lawyer-AI-incident-report-FILLABLE.pdf`

2. **Tell me path:**
   - Message: "PDF ready at [full path]"

3. **I'll run verification:**
   ```bash
   node scripts/extract-pdf-fields.js "/full/path/to/pdf"
   ```

4. **I'll check:**
   - ✅ Total field count (should be 80+)
   - ✅ All field names match CSV exactly
   - ✅ All field types correct
   - ✅ No duplicate field names
   - ✅ No missing fields from CSV

5. **I'll report:**
   - "✅ All 82 fields present and correct" OR
   - "⚠️ Missing fields: accident_time, medical_chest_pain" OR
   - "⚠️ Typo: 'accident_date' spelled as 'accidentdate'"

6. **You fix issues:**
   - Open PDF in Adobe Acrobat
   - Fix reported issues
   - Save and re-upload

7. **Iterate until ✅ Perfect**

---

## Multi-Vehicle/Witness Strategy (Page 18-19)

### Page 18: Additional Vehicles

**Create 5 vehicle entries (handles up to 6 total vehicles):**

**Table Header:**
- Static text: "ADDITIONAL VEHICLES INVOLVED"

**Vehicle 2 Fields:**
```
vehicle2_license_plate    (Text, 100pt x 20pt)
vehicle2_make_model       (Text, 150pt x 20pt)
vehicle2_driver_name      (Text, 150pt x 20pt)
vehicle2_phone           (Text, 120pt x 20pt)
vehicle2_insurance       (Text, 150pt x 20pt)
```

**Repeat for vehicles 3, 4, 5, 6**

**Layout Example:**
```
Page 18: Additional Vehicles Involved

┌────────────────────────────────────────────────────────┐
│ Vehicle 2                                               │
├───────────────┬────────────┬──────────────┬────────────┤
│ License Plate │ Make/Model │ Driver Name  │ Insurance  │
│ [Text Field]  │ [Text]     │ [Text]       │ [Text]     │
└───────────────┴────────────┴──────────────┴────────────┘

┌────────────────────────────────────────────────────────┐
│ Vehicle 3                                               │
├───────────────┬────────────┬──────────────┬────────────┤
│ License Plate │ Make/Model │ Driver Name  │ Insurance  │
│ [Text Field]  │ [Text]     │ [Text]       │ [Text]     │
└───────────────┴────────────┴──────────────┴────────────┘

... (repeat for vehicles 4, 5, 6)
```

### Page 19: Additional Witnesses (Optional)

**Same pattern as vehicles**

**Witness 2 Fields:**
```
witness2_name      (Text, 200pt x 20pt)
witness2_phone     (Text, 120pt x 20pt)
witness2_address   (Textarea, 300pt x 60pt)
witness2_statement (Textarea, 400pt x 100pt)
```

**Repeat for witnesses 3, 4, 5**

---

## Quick Reference: Field Type Guidelines

| Field Type | When to Use | Adobe Field Type | Properties |
|------------|-------------|------------------|------------|
| Text | Single-line text (names, phone, etc.) | Text | Single-line, Auto font size |
| Textarea | Multi-line text (addresses, narratives) | Text | Multi-line ✅, Scroll ✅, Fixed font |
| Checkbox | Yes/No or option selection | Checkbox | Export value: "Yes" |
| Radio | Mutually exclusive options | Radio Button | Same group name |
| Dropdown | Pick from list | Dropdown | Pre-defined items |
| Date | Date fields | Text | We format in code as DD/MM/YYYY |
| Time | Time fields | Text | We format in code as HH:MM |
| Image | Photo placeholders | Button | Icon only, locked |

---

## Common Mistakes to Avoid

### ❌ Don't Do This

1. **Field names with spaces:** `accident date` ← Wrong
   - ✅ Use: `accident_date`

2. **CamelCase names:** `accidentDate` ← Wrong
   - ✅ Use: `accident_date`

3. **Date type for dates:** Field type "Date" ← Wrong
   - ✅ Use: Field type "Text", we format in code

4. **Tiny textareas:** 100pt x 50pt for detailed_account ← Wrong
   - ✅ Use: 500pt x 600pt (entire page if needed)

5. **Auto font size for textareas:** Causes tiny unreadable text ← Wrong
   - ✅ Use: Fixed 10pt font

6. **Text fields for images:** Won't work ← Wrong
   - ✅ Use: Button type with icon

7. **Duplicate field names:** Two fields both named `damage_description` ← Wrong
   - ✅ Use: Unique names (damage_description, other_damage)

---

## Next Steps

1. ✅ Open MASTER_PDF_FIELD_LIST.csv
2. ✅ Open your PDF template in Adobe Acrobat Pro
3. ✅ Create fields page by page using CSV as guide
4. ✅ Save as FILLABLE PDF
5. ✅ Upload to Dropbox
6. ✅ Tell me path
7. ✅ I verify field names
8. ✅ You fix any issues
9. ✅ Iterate until perfect
10. ✅ Then we test with real data!

---

**Questions to Ask Me:**

- "How do I create a specific field type in Adobe Acrobat?"
- "Should I use Text or Textarea for [field]?"
- "How large should I make the [field] field?"
- "What's the difference between Checkbox and Radio Button?"

**I'm here to help with any Adobe Acrobat questions!**

---

**Created:** 2025-11-01
**For:** Manual PDF field creation in Adobe Acrobat Pro
**Reference:** MASTER_PDF_FIELD_LIST.csv (80+ fields)
