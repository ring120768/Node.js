# Witness & Vehicle PDF Generation - Testing Guide

**Created:** 2025-10-24
**Purpose:** Guide for testing the complete witness and vehicle PDF page generation feature

## Overview

This feature adds separate PDF pages for each witness and each other vehicle involved in an incident. The implementation follows "Option B" architecture where:
- Each witness gets their own PDF page (copied from template page 0)
- Each vehicle gets their own PDF page (copied from template page 1)
- Pages are appended to the 17-page incident report before form flattening

## Implementation Summary

### Files Modified

1. **lib/dataFetcher.js**
   - Added witness fetching from `incident_witnesses` table
   - Added vehicle fetching from `incident_other_vehicles` table
   - Returns witness/vehicle arrays in data object

2. **src/services/adobePdfFormFillerService.js**
   - Added `appendWitnessPages()` method (lines 419-466)
   - Added `appendVehiclePages()` method (lines 468-530)
   - Updated `fillPdfForm()` to call both methods before flattening

3. **pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf**
   - New template file with witness (page 0) and vehicle (page 1) layouts

### Database Tables Used

**incident_witnesses:**
- `witness_name` → "Witness Name"
- `witness_address` → "Witness Address"
- `witness_phone` → "Witness Mobile"
- `witness_email` → "Witness Email"
- `witness_statement` → "Witness Statement"

**incident_other_vehicles:**
- `driver_name` → "Additional Driver Name"
- `driver_address` → "Additional Driver Adress" (note template typo)
- `driver_phone` → "Additional Driver Mobile"
- `driver_email` → "Additional Driver email:"
- `vehicle_license_plate` → "Additional registration Number"
- `vehicle_make` → "Additional Make of Vehicle"
- `vehicle_model` → "Additional Model of Vehicle"
- `vehicle_color` → "Additional Vehicle Colour"
- `vehicle_year_of_manufacture` → "Additional Vehicle Year"
- `insurance_company` → "Additional Insurance Company"
- `policy_cover` → "Additional Policy Cover"
- `policy_holder` → "Additional Policy Holder"
- DVLA fields: MOT/Tax status, dates, fuel type, engine capacity

## Testing Procedures

### 1. Automated Test (Recommended)

Run the comprehensive test script:

```bash
# Find a user with incident data
node scripts/find-test-user.js

# Run test with found user ID
node test-witness-vehicle-pdf.js [user-uuid]
```

**What the test does:**
1. ✓ Verifies user exists
2. ✓ Finds incident ID
3. ✓ Adds test witness with realistic data
4. ✓ Adds test vehicle with DVLA data
5. ✓ Fetches all data via dataFetcher
6. ✓ Generates PDF with witness/vehicle pages
7. ✓ Saves to `test-output/` directory
8. ✓ Verifies page count matches expected
9. ✓ Cleans up test data

**Expected output:**
```
🧪 Testing Witness & Vehicle PDF Generation

Testing with user ID: xxx-xxx-xxx

1️⃣ Checking user exists...
✅ User found: John Smith (john@example.com)

2️⃣ Checking for incident...
✅ Incident found: xxx-xxx-xxx

3️⃣ Adding test witness...
✅ Witness added: John Test Witness

4️⃣ Adding test vehicle...
✅ Vehicle added: AB12CDE (Ford Focus)

5️⃣ Fetching all data for PDF generation...
Data summary:
  • User: John Smith
  • Incidents: 1
  • Images: 5
  • Witnesses: 1
  • Vehicles: 1

6️⃣ Generating PDF with witnesses and vehicles...
📋 Adding 1 witness page(s)...
🚗 Adding 1 vehicle page(s)...

✅ PDF generated successfully!
📄 PDF saved to: test-output/test-witness-vehicle-2025-10-24T10-30-15.pdf
📊 PDF size: 847.32 KB

7️⃣ Verifying PDF structure...
  • Total pages: 19
  • Expected: 19 (17 base + 1 witness + 1 vehicle)
✅ Page count matches expected!

8️⃣ Cleaning up test data...
✅ Test witness deleted
✅ Test vehicle deleted

🎉 All tests passed!
```

### 2. Manual Frontend Testing

Test via the report-complete.html page:

**Step 1: Add Witnesses**
1. Open `http://localhost:5000/report-complete.html?userId=[your-user-id]`
2. Click "Add Witness" button
3. Fill in witness form:
   - Name: "Sarah Johnson"
   - Phone: "+447700900123"
   - Email: "sarah@example.com"
   - Address: "123 High Street, London, SW1A 1AA"
   - Statement: "I witnessed the collision at the junction..."
4. Click "Save Witness"
5. Verify witness appears in list below form
6. Repeat to add 2-3 witnesses

**Step 2: Add Vehicles**
1. Click "Add Other Vehicle" button
2. Enter license plate: "AB12CDE"
3. Click "🔍 Lookup" to test DVLA integration
4. Fill in additional fields:
   - Driver Name: "Michael Brown"
   - Driver Phone: "+447700900456"
   - Insurance Company: "Direct Line"
   - Policy Holder: "Michael Brown"
5. Click "Save Vehicle"
6. Verify vehicle appears in list below form
7. Repeat to add 1-2 more vehicles

**Step 3: Generate PDF**
1. Click "Generate PDF Report" button
2. Wait for PDF generation (should take 3-5 seconds)
3. Download PDF when ready

**Step 4: Verify PDF**
1. Open downloaded PDF
2. Navigate to end of document
3. Verify witness pages appear (one page per witness)
4. Verify vehicle pages appear after witnesses (one page per vehicle)
5. Check that all fields are filled correctly
6. Verify page order: Main 17 pages → Witness pages → Vehicle pages

### 3. API Testing

Test the endpoints directly:

```bash
# Get witnesses for incident
curl http://localhost:5000/api/witnesses/[incident-id]

# Add witness
curl -X POST http://localhost:5000/api/witnesses \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "xxx-xxx-xxx",
    "create_user_id": "yyy-yyy-yyy",
    "witness_name": "Test Witness",
    "witness_phone": "+447700900123",
    "witness_email": "test@example.com",
    "witness_address": "123 Test St",
    "witness_statement": "I saw everything happen."
  }'

# Get vehicles for incident
curl http://localhost:5000/api/other-vehicles/[incident-id]

# DVLA Lookup
curl -X POST http://localhost:5000/api/other-vehicles/dvla-lookup \
  -H "Content-Type: application/json" \
  -d '{"vehicle_license_plate": "AB12CDE"}'

# Add vehicle
curl -X POST http://localhost:5000/api/other-vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "xxx-xxx-xxx",
    "create_user_id": "yyy-yyy-yyy",
    "driver_name": "Test Driver",
    "vehicle_license_plate": "AB12CDE",
    "vehicle_make": "Ford",
    "vehicle_model": "Focus"
  }'
```

## Verification Checklist

### ✅ Data Fetching
- [ ] `fetchAllData()` returns witnesses array
- [ ] `fetchAllData()` returns vehicles array
- [ ] Metadata includes correct counts
- [ ] Soft-deleted witnesses/vehicles are excluded

### ✅ PDF Generation
- [ ] `appendWitnessPages()` is called when witnesses exist
- [ ] `appendVehiclePages()` is called when vehicles exist
- [ ] Template PDF loads successfully
- [ ] Pages are copied correctly (page 0 for witnesses, page 1 for vehicles)
- [ ] Fields are filled with correct data
- [ ] User ID appears on each page
- [ ] No errors if template missing (graceful degradation)

### ✅ PDF Output
- [ ] Total page count = 17 + witness count + vehicle count
- [ ] Witness pages appear after main 17 pages
- [ ] Vehicle pages appear after witness pages
- [ ] All witness fields are filled correctly
- [ ] All vehicle fields are filled correctly
- [ ] DVLA data appears when available
- [ ] Form is flattened (read-only)

### ✅ Frontend
- [ ] Witness form validates required fields
- [ ] Vehicle form validates required fields
- [ ] DVLA lookup button works
- [ ] DVLA data populates vehicle details
- [ ] Witnesses display in list with delete buttons
- [ ] Vehicles display in list with delete buttons
- [ ] Delete confirms before removing
- [ ] Counts update when adding/removing

## Known Issues / Edge Cases

### 1. Template Missing
**Issue:** Template PDF not found at expected path
**Behavior:** Logs warning, continues PDF generation without witness/vehicle pages
**Fix:** Ensure `pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf` exists

### 2. No Witnesses or Vehicles
**Issue:** User generates PDF without adding witnesses/vehicles
**Behavior:** Only 17-page base report is generated
**Expected:** This is correct behavior - pages only added when data exists

### 3. DVLA Lookup Fails
**Issue:** DVLA API returns error or vehicle not found
**Behavior:** Shows error message but allows manual entry
**Expected:** Users can still add vehicles without DVLA data

### 4. Field Name Typo in Template
**Issue:** Template has "Additional Driver Adress" (missing 'd')
**Workaround:** Code uses exact template field name
**Fix:** Update template PDF when possible

### 5. Large Number of Witnesses/Vehicles
**Issue:** 10+ witnesses or vehicles could create very large PDF
**Mitigation:** No artificial limit imposed, but test with realistic scenarios
**Recommendation:** Monitor PDF generation time and file size

## Performance Metrics

**Expected Performance:**
- PDF with 1 witness, 1 vehicle: ~850 KB, ~3 seconds
- PDF with 3 witnesses, 2 vehicles: ~1.2 MB, ~4 seconds
- PDF with 5 witnesses, 3 vehicles: ~1.5 MB, ~5 seconds

**Benchmarks:**
- Template loading: ~50ms per type (witness/vehicle)
- Page copying: ~100ms per page
- Field filling: ~50ms per page
- Form flattening: ~500ms (entire document)

## Troubleshooting

### PDF Generation Fails

**Symptom:** Error during PDF generation
**Debug steps:**
1. Check logs for specific error message
2. Verify template PDF exists and is readable
3. Test with dataFetcher separately
4. Try generating without witnesses/vehicles first
5. Check field mapping matches template

**Common errors:**
- "Template not found" → Check file path
- "Invalid field name" → Verify PDF form field names
- "Buffer too large" → Check for memory limits

### Fields Not Filled

**Symptom:** PDF pages appear but fields are empty
**Debug steps:**
1. Verify database has correct data
2. Check field name mapping in code
3. Test with simple values (no special characters)
4. Verify template has fillable form fields

### Wrong Page Order

**Symptom:** Pages appear in unexpected order
**Expected order:** Main 17 pages → Witnesses → Vehicles
**Debug:** Check that pages are appended before `form.flatten()`

## Future Enhancements

**Potential improvements:**
1. Add page numbers to witness/vehicle pages
2. Add "Page X of Y" footer
3. Support for multiple witness statements (multi-line text wrapping)
4. Vehicle diagram upload and insertion
5. Witness signature capture
6. Export witnesses/vehicles to separate CSV/JSON
7. Bulk import witnesses/vehicles from spreadsheet
8. Template customization via admin panel

## Related Documentation

- `TYPEFORM_SUPABASE_FIELD_MAPPING.md` - Database schema reference
- `ADOBE_FORM_FILLING_GUIDE.md` - PDF field mapping guide
- Database schema: `supabase/migrations/` (witnesses and vehicles tables)
- Frontend forms: `public/report-complete.html` (lines 462-620)
- API routes: `src/routes/witnesses.routes.js`, `src/routes/vehicles.routes.js`
- Controllers: `src/controllers/witnesses.controller.js`, `src/controllers/vehicles.controller.js`
- Services: `src/services/dvlaService.js`

## Support

**If you encounter issues:**
1. Check this testing guide
2. Review implementation commit: e79107d
3. Check logs in console during PDF generation
4. Run `node test-witness-vehicle-pdf.js` for diagnostics
5. Verify database contains expected data
6. Ensure template PDF is accessible

---

**Last Updated:** 2025-10-24
**Implementation Commit:** e79107d
**Status:** ✅ Ready for testing
