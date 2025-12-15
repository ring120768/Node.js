# User Signup Fields Added to PDF Pages 1-3

**Date**: 2025-11-01
**Purpose**: Add personal information, vehicle details, and insurance data to PDF report pages 1-3

---

## Summary

Added **24 new fields** from the `user_signup` table to the PDF master field list.

**Total fields**: 146 (was 125 incident report fields, now 24 signup + 125 incident = 149 minus 3 duplicates = 146)

**Page structure**:
- **Pages 1-3**: Personal information, vehicle, insurance (NEW)
- **Pages 4-22**: Incident report details (renumbered from original 1-19)

---

## Fields Added by Page

### Page 1: Personal Information (10 fields)

| PDF Field Name | Database Column | Table | Type | Required | Notes |
|----------------|-----------------|-------|------|----------|-------|
| `user_first_name` | `name` | user_signup | Text | Yes | User's first name |
| `user_last_name` | `surname` | user_signup | Text | Yes | User's surname |
| `user_dob` | `date_of_birth` | user_signup | Date | Yes | **NEW FIELD** - Format: DD/MM/YYYY (stored as YYYY-MM-DD in DB) |
| `user_email` | `email` | user_signup | Text | Yes | Email address |
| `user_mobile` | `mobile` | user_signup | Text | Yes | UK mobile number (+44) |
| `user_address_line1` | `street_address` | user_signup | Text | Yes | Street address line 1 |
| `user_address_line2` | `street_address_optional` | user_signup | Text | No | Street address line 2 (optional) |
| `user_city` | `town` | user_signup | Text | Yes | City/Town |
| `user_postcode` | `postcode` | user_signup | Text | Yes | UK postcode |
| `user_country` | `country` | user_signup | Text | Yes | Country (default: United Kingdom) |

### Page 2: Vehicle & Insurance (10 fields)

| PDF Field Name | Database Column | Table | Type | Required | Notes |
|----------------|-----------------|-------|------|----------|-------|
| `user_driving_license` | `driving_license_number` | user_signup | Text | Yes | UK driving license number |
| `user_car_registration` | `car_registration_number` | user_signup | Text | Yes | UK vehicle registration |
| `user_vehicle_make` | `make_of_car` | incident_reports | Text | No | Vehicle make (from DVLA or user entry) |
| `user_vehicle_model` | `model_of_car` | incident_reports | Text | No | Vehicle model |
| `user_vehicle_colour` | `vehicle_colour` | incident_reports | Text | No | Vehicle colour |
| `user_insurance_company` | `insurance_company` | user_signup | Text | Yes | Insurance company name |
| `user_policy_number` | `policy_number` | user_signup | Text | Yes | Insurance policy number |
| `user_policy_holder` | `policy_holder` | user_signup | Text | Yes | Policy holder name (if different) |
| `user_cover_type` | `cover_type` | user_signup | Text | Yes | Coverage type (e.g., Fully Comprehensive) |

**Note**: Vehicle make/model/colour are stored in `incident_reports` table, populated from DVLA lookup or user entry during incident form submission.

### Page 3: Emergency & Recovery (4 fields)

| PDF Field Name | Database Column | Table | Type | Required | Notes |
|----------------|-----------------|-------|------|----------|-------|
| `user_emergency_contact` | `emergency_contact` | user_signup | Text | No | Pipe-delimited: "FirstName LastName \| Phone \| Email \| Company" |
| `user_recovery_company` | `recovery_company` | user_signup | Text | No | Recovery/breakdown company |
| `user_recovery_number` | `recovery_breakdown_number` | user_signup | Text | No | Recovery breakdown number |
| `user_recovery_email` | `recovery_breakdown_email` | user_signup | Text | No | Recovery company email |

---

## Database Mapping Notes

### Form Field → Database Column Conversions

Several form fields have different names in the database:

| Form Field (signup-form.html) | Database Column (user_signup) |
|-------------------------------|------------------------------|
| `first_name` | `name` |
| `last_name` | `surname` |
| `mobile_number` | `mobile` |
| `address_line_1` | `street_address` |
| `address_line_2` | `street_address_optional` |
| `city` | `town` |

**Source**: `src/controllers/signup.controller.js` lines 137-160

### Date Format Conversion

**DOB Field** (`date_of_birth`):
- **Frontend form**: DD/MM/YYYY (e.g., 15/03/1990)
- **Database storage**: YYYY-MM-DD (e.g., 1990-03-15)
- **PDF display**: DD/MM/YYYY (convert back when filling PDF)

**Conversion code** (signup.controller.js line 143):
```javascript
date_of_birth: convertDateFormat(formData.date_of_birth), // DD/MM/YYYY → YYYY-MM-DD
```

**PDF filling code** (to be implemented):
```javascript
function formatDOBForPDF(dbDate) {
  // Input: "1990-03-15" (from DB)
  // Output: "15/03/1990" (for PDF)
  if (!dbDate) return '';
  const [year, month, day] = dbDate.split('-');
  return `${day}/${month}/${year}`;
}
```

### Emergency Contact Parsing

The `emergency_contact` field is stored as a pipe-delimited string:

**Database format**:
```
"John Smith | +447700900123 | john@example.com | ABC Insurance"
```

**PDF display**: Parse and format as multi-line text or separate fields.

**Parsing code** (to be implemented):
```javascript
function parseEmergencyContact(contactString) {
  if (!contactString) return { name: '', phone: '', email: '', company: '' };
  const parts = contactString.split(' | ').map(s => s.trim());
  return {
    name: parts[0] || '',
    phone: parts[1] || '',
    email: parts[2] || '',
    company: parts[3] || ''
  };
}
```

---

## Page Renumbering

All incident report fields were renumbered to accommodate the new pages 1-3:

| Original Page | New Page | Content |
|--------------|----------|---------|
| 1 | 4 | Accident details |
| 2 | 5 | Medical assessment |
| 3 | 6 | Vehicle damage |
| 4 | 7 | Weather conditions |
| 5 | 8 | Junction information |
| 6 | 9 | Special conditions |
| 8 | 11 | Detailed account narrative |
| 9-10 | 12-13 | Other vehicle details |
| 11-12 | 14-15 | Police & witnesses |
| 13-15 | 16-18 | Photo placeholders |
| 16 | 19 | AI narrative |
| 17 | 20 | Declaration & signature |
| 18 | 21 | Overflow vehicles (2-5) |
| 19 | 22 | Overflow witnesses (2-4) |

---

## Next Steps

### 1. User Creates PDF Fields in Adobe Acrobat Pro

Using the updated `MASTER_PDF_FIELD_LIST.csv`:
- Copy field names exactly from CSV (avoid typos)
- Follow field type specifications (Text, Date, Checkbox, etc.)
- Place fields on correct pages (1-22)

**Guide**: See `ADOBE_PDF_FIELD_CREATION_GUIDE.md` for detailed instructions.

### 2. Verify Field Names

After creating fields:
```bash
node scripts/extract-pdf-fields.js "/path/to/uploaded.pdf"
```

Compare extracted names vs CSV to catch typos/mismatches.

### 3. Implement PDF Filling Logic

Update `adobePdfFormFillerService.js` to:
- Fetch data from both `user_signup` and `incident_reports` tables
- Convert date format for DOB field (YYYY-MM-DD → DD/MM/YYYY)
- Parse emergency contact pipe-delimited string
- Fill all 146 fields in correct order

### 4. Test with Real Data

```bash
node test-form-filling.js [user-uuid]
```

Verify:
- All personal info appears correctly
- DOB displays in DD/MM/YYYY format
- Address fields populate properly
- Vehicle/insurance details match signup data

---

## Important Notes

### DOB Field - New Discovery

**User's request**: "we have at least one new field here and that is DOB"

**Found in**:
- Form: `public/signup-form.html` line 642 (`id="date_of_birth"`)
- Controller: `src/controllers/signup.controller.js` line 143
- Database: `user_signup.date_of_birth` (YYYY-MM-DD format)

**Validation**: User must be 16+ years old (checked in signup form validation)

### Vehicle Information Cross-Table

Vehicle make/model/colour fields:
- **Source 1**: User signup form (basic entry)
- **Source 2**: DVLA lookup during incident report (authoritative)
- **Storage**: `incident_reports` table (not `user_signup`)

**Rationale**: DVLA data is more accurate and includes additional details.

### Field Count Breakdown

| Section | Fields | Pages |
|---------|--------|-------|
| User personal info | 10 | 1 |
| Vehicle & insurance | 10 | 2 |
| Emergency & recovery | 4 | 3 |
| Accident details | 9 | 4 |
| Medical assessment | 17 | 5 |
| Vehicle damage | 6 | 6 |
| Weather conditions | 11 | 7 |
| Junction info | 5 | 8 |
| Special conditions | 6 | 9 |
| Detailed narrative | 1 | 11 |
| Other vehicle details | 7 | 12-13 |
| Police & witnesses | 9 | 14-15 |
| Photos | 11 | 16-18 |
| AI narrative | 2 | 19 |
| Declaration | 3 | 20 |
| Overflow vehicles | 20 | 21 |
| Overflow witnesses | 12 | 22 |
| **TOTAL** | **146** | **22** |

---

**Last Updated**: 2025-11-01
**Author**: Claude Code
**Status**: Ready for PDF field creation in Adobe Acrobat Pro
