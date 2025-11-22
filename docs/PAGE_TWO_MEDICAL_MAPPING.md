# PAGE TWO: MEDICAL FIELDS - Complete Mapping

**Date:** 2025-01-03
**Status:** Ready for Review
**Total Fields:** 19

---

## Field-by-Field Mapping

| # | UI Field (User Sees) | Database Column | PDF Field | Type | Notes |
|---|---------------------|-----------------|-----------|------|-------|
| 1 | medical_attention Yes | `medical_attention_needed` | `medical_attention` | BOOLEAN | Checkbox (Yes/No combined) |
| 2 | medical_attention No | (same as above) | (same) | BOOLEAN | Same boolean field |
| 3 | details_of_any_injuries | `medical_injury_details` | `please_provide_details_of_any_injuries` | TEXT | Free text description |
| 4 | severity of injuries (dropdown) | `medical_injury_severity` | `severity_of_injuries` | TEXT | Dropdown: minor/moderate/severe |
| 5 | ambulance yes | `medical_ambulance_called` | `ambulance_called` | BOOLEAN | Checkbox (Yes/No combined) |
| 6 | ambulance No | (same as above) | (same) | BOOLEAN | Same boolean field |
| 7 | medical chest pain | `medical_symptom_chest_pain` | `medical_chest_pain` | BOOLEAN | Symptom checkbox |
| 8 | medical uncontrolled bleeding | `medical_symptom_uncontrolled_bleeding` | `medical_uncontrolled_bleeding` | BOOLEAN | Symptom checkbox |
| 9 | medical breathlessness | `medical_symptom_breathlessness` | `medical_breathlessness` | BOOLEAN | Symptom checkbox |
| 10 | medical limb weakness | `medical_symptom_limb_weakness` | `medical_limb_weakness` | BOOLEAN | Symptom checkbox |
| 11 | medical dizziness | `medical_symptom_dizziness` | (MISSING FROM PDF) | BOOLEAN | ⚠️ NOT IN PDF - needs adding |
| 12 | medical loss of consciousness | `medical_symptom_loss_of_consciousness` | `medical_loss_of_consciousness` | BOOLEAN | Symptom checkbox |
| 13 | medical severe head ache | `medical_symptom_severe_headache` | `medical_severe_headache` | BOOLEAN | Symptom checkbox |
| 14 | medical change in vision | `medical_symptom_change_in_vision` | `medical_change_in_vision` | BOOLEAN | Symptom checkbox |
| 15 | medical abdominal pain | `medical_symptom_abdominal_pain` | `medical_abdominal_pain` | BOOLEAN | Symptom checkbox |
| 16 | medical limb pain | `medical_symptom_limb_pain` | `medical_limb_pain` | BOOLEAN | Symptom checkbox |
| 17 | medical any other concerns | `medical_symptom_other_concerns` | (MISSING FROM PDF) | BOOLEAN | ⚠️ NOT IN PDF - needs adding |
| 18 | medical none of these | `medical_symptom_none` | `medical_none_of_these` | BOOLEAN | Symptom checkbox |
| 19 | please provide details | (same as #3) | (same as #3) | TEXT | Duplicate of details_of_any_injuries? |

---

## Additional Fields Found in PDF (Not in User's CSV)

These exist in the PDF but user didn't encounter them:
- `medical_how_are_you_feeling` (TextField)
- `medical_attention_from_who` (TextField)
- `hospital_or_medical_center` (TextField)
- `treatment_recieved` (TextField) - typo in PDF field name
- `further_medical_attention` (TextField)
- `medical_abdominal_bruising` (CheckBox)

**Question:** Should these be added to the UI forms?

---

## ⚠️ Issues Identified

### 1. Missing from PDF
- **medical_symptom_dizziness** - User can select this but it won't appear in PDF
- **medical_symptom_other_concerns** - User can select this but it won't appear in PDF

### 2. Potential Duplicate
- Field #19 "please provide details" seems duplicate of #3 "details_of_any_injuries"
- Both map to same database column and PDF field

### 3. PDF Typo
- PDF field: `treatment_recieved` (should be "received")
- Database column: `medical_treatment_received` (correct spelling)

---

## Database Schema for Page Two

```sql
-- Medical Fields (Page Two)
medical_attention_needed BOOLEAN DEFAULT FALSE,
medical_injury_details TEXT,
medical_injury_severity TEXT,
medical_ambulance_called BOOLEAN DEFAULT FALSE,

-- Medical Symptoms (Checkboxes)
medical_symptom_chest_pain BOOLEAN DEFAULT FALSE,
medical_symptom_uncontrolled_bleeding BOOLEAN DEFAULT FALSE,
medical_symptom_breathlessness BOOLEAN DEFAULT FALSE,
medical_symptom_limb_weakness BOOLEAN DEFAULT FALSE,
medical_symptom_dizziness BOOLEAN DEFAULT FALSE,
medical_symptom_loss_of_consciousness BOOLEAN DEFAULT FALSE,
medical_symptom_severe_headache BOOLEAN DEFAULT FALSE,
medical_symptom_change_in_vision BOOLEAN DEFAULT FALSE,
medical_symptom_abdominal_pain BOOLEAN DEFAULT FALSE,
medical_symptom_limb_pain BOOLEAN DEFAULT FALSE,
medical_symptom_other_concerns BOOLEAN DEFAULT FALSE,
medical_symptom_none BOOLEAN DEFAULT FALSE,

-- Additional fields from PDF (should we include?)
medical_how_are_you_feeling TEXT,
medical_attention_from_who TEXT,
hospital_or_medical_center TEXT,
medical_treatment_received TEXT,
further_medical_attention TEXT,
medical_symptom_abdominal_bruising BOOLEAN DEFAULT FALSE,
```

---

## PDF Mapping Code

```javascript
// src/services/adobePdfService.js - Page Two Medical
const pdfData = {
  // Medical attention
  medical_attention: data.medical_attention_needed ? 'Yes' : 'No',
  ambulance_called: data.medical_ambulance_called ? 'Yes' : 'No',

  // Text fields
  please_provide_details_of_any_injuries: data.medical_injury_details || '',
  severity_of_injuries: data.medical_injury_severity || '',

  // Symptoms (all checkboxes)
  medical_chest_pain: data.medical_symptom_chest_pain ? 'Yes' : 'No',
  medical_uncontrolled_bleeding: data.medical_symptom_uncontrolled_bleeding ? 'Yes' : 'No',
  medical_breathlessness: data.medical_symptom_breathlessness ? 'Yes' : 'No',
  medical_limb_weakness: data.medical_symptom_limb_weakness ? 'Yes' : 'No',
  // medical_dizziness: MISSING FROM PDF!
  medical_loss_of_consciousness: data.medical_symptom_loss_of_consciousness ? 'Yes' : 'No',
  medical_severe_headache: data.medical_symptom_severe_headache ? 'Yes' : 'No',
  medical_change_in_vision: data.medical_symptom_change_in_vision ? 'Yes' : 'No',
  medical_abdominal_pain: data.medical_symptom_abdominal_pain ? 'Yes' : 'No',
  medical_limb_pain: data.medical_symptom_limb_pain ? 'Yes' : 'No',
  // medical_other_concerns: MISSING FROM PDF!
  medical_none_of_these: data.medical_symptom_none ? 'Yes' : 'No',

  // Additional fields
  medical_how_are_you_feeling: data.medical_how_are_you_feeling || '',
  medical_attention_from_who: data.medical_attention_from_who || '',
  hospital_or_medical_center: data.hospital_or_medical_center || '',
  treatment_recieved: data.medical_treatment_received || '',  // Note PDF typo
  further_medical_attention: data.further_medical_attention || '',
  medical_abdominal_bruising: data.medical_symptom_abdominal_bruising ? 'Yes' : 'No',
};
```

---

## Action Items Before Implementation

1. **Verify with user:**
   - Is field #19 a duplicate of #3?
   - Should I add the 6 PDF fields that aren't in the UI?

2. **Fix PDF Template:**
   - Add `medical_dizziness` checkbox
   - Add `medical_other_concerns` checkbox (or confirm not needed)
   - Fix typo: `treatment_recieved` → `treatment_received`

3. **Confirm HTML form fields:**
   - Check `incident-form-page2.html` for exact field names

---

## Next Steps

Once confirmed:
1. ✅ Create migration adding these columns to `incident_reports`
2. ✅ Update incident controller to save these fields
3. ✅ Update PDF fill service with mapping above
4. ✅ Test end-to-end flow
5. ✅ Move to Page Three

---

**Ready to proceed?** Please confirm the action items above.
