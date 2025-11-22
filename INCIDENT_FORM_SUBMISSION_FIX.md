# Incident Form Submission Fix

**Date:** 2025-11-05
**Issue:** Manual UI test showed images uploading but no data saved to incident_reports table

## Root Cause

Page 12 submit button was NOT calling the backend API to save form data. It was:
1. ✅ Gathering data from sessionStorage
2. ✅ Storing it for transcription page
3. ❌ **BUT NOT POSTING TO BACKEND**
4. ✅ Redirecting to transcription-status.html

The data stayed in browser sessionStorage and never reached the database.

## Fix Applied

**File:** `public/incident-form-page12-final-medical-check.html`

**Changes:**
- Made submit button handler `async`
- Added POST request to `/api/incident-form/submit`
- Added loading state ("Submitting Report...")
- Added success feedback ("✅ Report Saved!")
- Added error handling with user alerts
- Store incident ID from response

**Before:**
```javascript
submitBtn.addEventListener('click', () => {
  autoSave();
  const allData = {};
  // ... gather data from sessionStorage
  sessionStorage.setItem('complete_incident_data', JSON.stringify(allData));
  window.location.href = '/transcription-status.html'; // ❌ No API call!
});
```

**After:**
```javascript
submitBtn.addEventListener('click', async () => {
  autoSave();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Report...';

  try {
    const formData = {};
    for (let i = 1; i <= 12; i++) {
      formData[`page${i}`] = JSON.parse(sessionStorage.getItem(`incident_page${i}`));
    }

    // ✅ POST to backend API
    const response = await fetch('/api/incident-form/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);

    sessionStorage.setItem('submitted_incident_id', result.incidentId);
    submitBtn.textContent = '✅ Report Saved!';

    setTimeout(() => {
      window.location.href = '/transcription-status.html';
    }, 1000);

  } catch (error) {
    alert(`Failed to submit report: ${error.message}`);
    submitBtn.disabled = false;
    submitBtn.textContent = '📝 Submit Incident Report';
  }
});
```

## What Gets Saved

### Incident Reports Table
The backend endpoint `/api/incident-form/submit` saves data from all 12 pages to `incident_reports`:

**Page 1:** Date, time, location (basic incident info)
**Page 2:** Medical attention, injuries, symptoms (13 symptom checkboxes)
**Page 3:** Weather (12), road conditions (6), road types (7), speed, traffic, visibility
**Page 4:** Location, what3words, junction type, visibility factors (5), special conditions (12)
**Page 4a:** Location photos finalized and linked
**Page 5:** Your vehicle (DVLA lookup data, impact points, damage description)
**Page 6:** Vehicle damage photos finalized and linked
**Page 7:** Other driver details, vehicle, insurance, damage
**Page 8:** Other vehicle photos finalized (first 2 URLs stored in incident_reports)
**Page 9:** Witnesses flag (witness details → incident_witnesses table)
**Page 10:** Police attendance, breath tests, airbags, seatbelts
**Page 12:** Final medical check (fine/shaken/pain/emergency)

### Witness Table
- Witnesses saved to `incident_witnesses` table (separate records)
- Supports primary witness + additional witnesses from sessionStorage

### Photo Finalization
- Page 4: Map screenshot (html2canvas) → user_documents
- Page 4a: Scene photos (3) → user_documents
- Page 6: Vehicle damage photos (5) → user_documents
- Page 8: Other vehicle photos (5) → user_documents + incident_reports URLs (first 2)

## Testing Instructions

1. **Clear Browser Data:**
   ```javascript
   sessionStorage.clear();
   localStorage.clear();
   ```

2. **Start Fresh Test:**
   - Navigate to incident-form-page1.html
   - Complete all 12 pages
   - Upload images where required
   - Click "Submit Incident Report" on Page 12

3. **Expected Behavior:**
   - Button shows "Submitting Report..."
   - Brief pause for API call
   - Button shows "✅ Report Saved!"
   - Redirect to transcription-status.html after 1 second

4. **Verify Database:**
   ```sql
   -- Check incident was created
   SELECT id, create_user_id, incident_date, submission_source
   FROM incident_reports
   ORDER BY created_at DESC
   LIMIT 1;

   -- Check witnesses if added
   SELECT * FROM incident_witnesses
   WHERE incident_report_id = [incident_id];

   -- Check photos were finalized
   SELECT document_type, field_name, status
   FROM user_documents
   WHERE create_user_id = [user_id]
   ORDER BY created_at DESC
   LIMIT 14;
   ```

5. **Check Console Logs:**
   - Frontend: "Submitting complete incident report: {...}"
   - Frontend: "✅ Incident report submitted successfully: {incidentId: ...}"
   - Backend: "Incident form submission started"
   - Backend: "Incident report created: {incidentId: ...}"

## Future Enhancements

### 1. Normalized Other Vehicles Table
Currently Page 7 (other driver/vehicle) data is saved to `incident_reports` table for backward compatibility.

**Future:** Also save to `incident_other_vehicles` table:
```javascript
// In submitIncidentForm() after line 265
if (formData.page7?.other_vehicle_registration) {
  const otherVehicle = {
    incident_report_id: incident.id,
    create_user_id: userId,
    vehicle_index: 1,
    driver_name: page7.other_full_name,
    vehicle_license_plate: page7.other_vehicle_registration,
    insurance_company: page7.other_drivers_insurance_company,
    policy_number: page7.other_drivers_policy_number,
    // ... all other Page 7 fields
  };

  await supabase.from('incident_other_vehicles').insert([otherVehicle]);
}
```

### 2. Progress Indicator
Add visual progress indicator during submission:
- Show percentage: "Saving data... 50%"
- Show steps: "Saving incident details → Finalizing photos → Complete"

### 3. Offline Support
Store form data to IndexedDB with background sync when connection restored.

### 4. Validation Summary
Before submission, show summary of completed pages:
- ✅ Page 1: Medical Info
- ✅ Page 2: Accident Details
- ⚠️ Page 9: No witnesses added
- ✅ Page 12: Final Check

## Known Limitations

1. **No Retry Logic:** If submission fails (network error), user must manually retry
2. **No Progress Save:** Partial submissions not supported (all-or-nothing)
3. **No Conflict Resolution:** If user submits twice, creates duplicate records
4. **Session Dependency:** Data lost if user clears sessionStorage before submission

## Rollback Instructions

If issues occur, revert to previous version:

```bash
git checkout HEAD~1 -- public/incident-form-page12-final-medical-check.html
```

Previous behavior: Data stored in sessionStorage only, no database save.

---

**Status:** ✅ Ready for Testing
**Next Steps:** User manual testing → Verify database entries → Production deployment
