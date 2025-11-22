# Page 5 & 6 Separation - Vehicle Details & Images

## Overview

Successfully separated vehicle details (page 5) from vehicle images (page 6) as requested by user.

**Date:** 2025-10-28
**Reason:** User feedback: "images need to be on a seperate page"

---

## Changes Made

### 1. Updated Page 5 (`incident-form-page5-vehicle.html`)

**Removed:**
- ❌ Vehicle images upload section (6 upload boxes)
- ❌ Image upload JavaScript handlers
- ❌ Image upload CSS styles
- ❌ Image validation logic from form validation

**Retained:**
- ✅ "Were you driving your usual vehicle?" radio buttons
- ✅ License plate number input with DVLA lookup
- ✅ Auto-populated vehicle details (make, model, colour, year, fuel)
- ✅ MOT/Tax/Insurance status checks (beta)

**Updated:**
- Navigation: Next button now links to `/incident-form-page6-vehicle-images.html`
- Form validation: No longer checks for required images
- Auto-save: Removed `uploaded_images` from saved data
- Progress: Still shows "Page 5 of 10: 50% Complete"

---

### 2. Created Page 6 (`incident-form-page6-vehicle-images.html`)

**New Page Features:**
- 📸 Dedicated page for vehicle image uploads
- 6 upload boxes: front, rear, driver side, passenger side, dashboard/VIN, additional
- Mobile-friendly immediate upload to `/api/images/temp-upload`
- Image preview with remove button
- Progress: "Page 6 of 10: 60% Complete"

**Functionality:**
- Upload on file selection (prevents mobile ERR_UPLOAD_FILE_CHANGED)
- Store paths in `uploadedImages` object
- Auto-save to localStorage every 5 seconds
- Validate form: requires 4 images (front, rear, driver-side, passenger-side)
- Navigation: Back to page 5, Next to page 7

---

## User Flow

```
Page 5: Vehicle Details
  ├─ Were you driving your usual vehicle? (radio)
  ├─ License plate number input
  ├─ DVLA API lookup button
  ├─ Auto-populated vehicle details
  └─ MOT/Tax/Insurance status (beta)
       ↓ Next
Page 6: Vehicle Images
  ├─ Front view image
  ├─ Rear view image
  ├─ Driver side image
  ├─ Passenger side image
  ├─ Dashboard/VIN image
  └─ Additional view image
       ↓ Next
Page 7: (To be created)
```

---

## Data Storage

### localStorage Keys

**Page 5 Data (`page5_data`):**
```javascript
{
  usual_vehicle: "yes" | "no",
  license_plate: "AB12CDE",
  vehicle_data: {
    make: "FORD",
    model: "FIESTA",
    colour: "BLUE",
    yearOfManufacture: "2018",
    fuelType: "PETROL"
  }
}
```

**Page 6 Data (`page6_data`):**
```javascript
{
  uploaded_images: {
    "front": "/temp/session-id/front-123.jpg",
    "rear": "/temp/session-id/rear-456.jpg",
    "driver-side": "/temp/session-id/driver-side-789.jpg",
    "passenger-side": "/temp/session-id/passenger-side-012.jpg",
    "dashboard": "/temp/session-id/dashboard-345.jpg",
    "additional": "/temp/session-id/additional-678.jpg"
  }
}
```

---

## API Endpoints Used

### Page 5
- `GET /api/dvla/lookup?registration={plate}` - DVLA vehicle lookup
- `GET /api/vehicle/status?registration={plate}` - MOT/Tax/Insurance checks (beta)

### Page 6
- `POST /api/images/temp-upload` - Immediate image upload
  - Body: `multipart/form-data`
  - Fields: `image` (file), `type` (string)
  - Response: `{ success: true, path: "/temp/..." }`

---

## Validation Rules

### Page 5 (Enable Next Button)
- ✅ "Usual vehicle" radio selected
- ✅ License plate entered
- ✅ DVLA lookup successful (vehicle details populated)

### Page 6 (Enable Next Button)
- ✅ Front view image uploaded
- ✅ Rear view image uploaded
- ✅ Driver side image uploaded
- ✅ Passenger side image uploaded
- Dashboard and additional images are optional

---

## Design Consistency

Both pages maintain the same design system:
- Progress banner with logo and tagline
- 50% / 60% progress indicators
- Matching color scheme (blue gradient)
- Mobile-responsive layout
- Same button styles (Back/Next)
- Consistent form section styling

---

## Key Differences from Original Page 5

**Before (Single Page):**
- Vehicle details + images on one page
- Required all images before proceeding
- Longer scroll on mobile

**After (Two Pages):**
- Page 5: Vehicle details only
- Page 6: Images only
- Cleaner, focused user experience
- Easier to navigate on mobile
- Logical separation of concerns

---

## Testing Checklist

**Page 5:**
- [ ] Radio buttons work correctly
- [ ] License plate input validates format
- [ ] DVLA lookup fetches vehicle details
- [ ] Vehicle details display correctly
- [ ] MOT/Tax/Insurance checks run (beta)
- [ ] Form validation enables Next button
- [ ] Auto-save works on field changes
- [ ] Saved data loads on page refresh
- [ ] Back button returns to page 4
- [ ] Next button navigates to page 6

**Page 6:**
- [ ] Upload boxes respond to file selection
- [ ] Camera capture works on mobile
- [ ] Image preview displays correctly
- [ ] Remove button deletes uploaded image
- [ ] Immediate upload to `/api/images/temp-upload`
- [ ] Form validation enables Next button (4 required images)
- [ ] Auto-save works every 5 seconds
- [ ] Saved data loads on page refresh (if possible)
- [ ] Back button returns to page 5
- [ ] Next button navigates to page 7 (when created)

---

## Files Modified

1. `/public/incident-form-page5-vehicle.html` - Removed images section
2. `/public/incident-form-page6-vehicle-images.html` - Created new page

---

## Environment Variables

No changes needed - DVLA API key already configured:
```bash
DVLA_API_KEY=7i76VHmDog2SkOftinOTPauFFH0oWTbZ4btBFW9q
```

---

## Next Steps

1. **Create Page 7** - Continue incident report form
2. **Test image upload endpoint** - Verify `/api/images/temp-upload` works
3. **Test DVLA lookup** - Verify API integration with real license plates
4. **Test full flow** - Page 4 → Page 5 → Page 6 → Page 7

---

**Status:** ✅ COMPLETE
**Tested:** Not yet tested (awaiting user verification)
**Ready for:** User acceptance testing

---

## Notes

- Vehicle images are stored temporarily in `/temp/session-id/` directory
- Images move to permanent storage on final form submission
- Temp files auto-expire after 24 hours (cron job cleanup)
- Mobile-friendly immediate upload prevents ERR_UPLOAD_FILE_CHANGED
- Page 6 uses same upload pattern as signup flow (Pages 2-9)

---

**Last Updated:** 2025-10-28 23:30:00
**Author:** Claude Code
**Version:** 1.0
