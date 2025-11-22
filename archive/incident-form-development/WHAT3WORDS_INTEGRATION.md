# What3Words Integration - Page 4 Update

**Date**: 2025-10-28
**Status**: ✅ Integrated with existing backend API

---

## Integration Summary

Page 4's What3Words implementation now uses the **existing backend API infrastructure** from `incident.html` and the 999 call flow.

**User Feedback**: "what3words is already in incident.html and various other call 999 incarnations"

**Action Taken**: Replaced placeholder with full API integration using existing endpoints.

---

## Backend API (Already Exists)

**Controller**: `src/controllers/location.controller.js`

**Available Endpoints**:

### 1. Convert Coordinates to What3Words (GET)
```
GET /api/what3words/convert?lat={lat}&lng={lng}
```

**Response**:
```json
{
  "success": true,
  "words": "filled.count.soap",
  "coordinates": { "lat": 51.5074, "lng": -0.1278 },
  "nearestPlace": "London",
  "country": "GB",
  "language": "en",
  "requestId": "uuid"
}
```

### 2. Convert Coordinates to What3Words (POST)
```
POST /api/location/what3words
Body: { "latitude": 51.5074, "longitude": -0.1278 }
```

**Used by**: Page 4 incident form (GET version)
**Also used by**: incident.html, call 999 flows

### 3. What3Words Autosuggest
```
GET /api/location/autosuggest?input={partial_words}
```

**Future Enhancement**: Could add autocomplete to text input field

### 4. Upload What3Words Screenshot
```
POST /api/location/upload-image
```

**Used by**: incident.html for capturing What3Words display
**Not yet used by**: Page 4 (could add screenshot capture later)

---

## Page 4 Implementation

**File**: `/Users/ianring/Node.js/public/incident-form-page4-preview.html`

**Flow**:
1. User lands on Page 4
2. JavaScript requests geolocation permission
3. Browser provides latitude/longitude
4. Call existing API: `GET /api/what3words/convert?lat={lat}&lng={lng}`
5. API returns What3Words address (e.g., `///filled.count.soap`)
6. Auto-populate text input field
7. Display success state in map container with refresh button
8. User can refresh location or manually edit text field

**Features**:
- ✅ Auto-detect user location on page load
- ✅ Convert to What3Words using existing API
- ✅ Display success state with What3Words address
- ✅ Show nearest place and timestamp
- ✅ Refresh button to update location
- ✅ Fallback to manual entry if geolocation fails
- ✅ Graceful error handling with user-friendly messages
- ✅ Auto-save What3Words to session storage

**States**:
1. **Loading**: "Getting Your Location..." (purple gradient)
2. **Success**: Display What3Words with refresh button (red background, matches incident.html style)
3. **Error**: Manual entry prompt with link to What3Words app (gray gradient)

---

## Visual Design

**Success State** (matches incident.html):
```
┌─────────────────────────────────┐
│          ✅ Location Found!     │
│                                 │
│      ///filled.count.soap       │
│                                 │
│   London • 14:32:15             │
│                                 │
│   [ 🔄 Refresh Location ]       │
└─────────────────────────────────┘
```

**Colors**: Red background (#dc2626) - consistent with existing implementation

---

## API Configuration

**Environment Variable Required**:
```bash
WHAT3WORDS_API_KEY=your_api_key_here
```

**Already configured in**: `src/config/index.js`

**Fallback Behavior**: If API key not configured, gracefully shows error message and allows manual entry

---

## Consistency with Existing Flows

**incident.html** (existing):
- Uses same API endpoint (`/api/what3words/convert`)
- Same red color scheme (#dc2626)
- Screenshot capture functionality
- Upload to Supabase storage

**Page 4** (new):
- Uses same API endpoint ✅
- Uses same red color scheme ✅
- No screenshot capture (could add later)
- Stores What3Words in session storage ✅

**Shared Pattern**:
```javascript
// Both use this exact pattern:
const response = await fetch(
  `/api/what3words/convert?lat=${lat}&lng=${lng}`,
  { credentials: 'include' }
);
const data = await response.json();
if (data.success && data.words) {
  // Display ///words
}
```

---

## Session Storage

**Key**: `incident_page4`

**What3Words Data**:
```json
{
  "accident_location": "Junction of High Street...",
  "what3words": "filled.count.soap",
  "conditions": ["dry_clear", "daylight"],
  "road_type": "roundabout",
  "speed_limit": "30",
  ...
}
```

**Note**: What3Words stored as plain text (e.g., `"filled.count.soap"`), NOT with slashes.
Display adds `///` prefix for user interface only.

---

## Error Handling

**Scenarios Handled**:
1. ❌ Geolocation permission denied → Show manual entry prompt
2. ❌ Geolocation not supported → Show browser compatibility message
3. ❌ API timeout/error → Fallback to manual entry
4. ❌ Invalid coordinates → Show error message
5. ❌ API key not configured → Graceful degradation

**User Impact**: User can ALWAYS proceed by manual entry using text field

---

## Future Enhancements (Optional)

### 1. Screenshot Capture (like incident.html)
Add screenshot functionality to capture What3Words display:
```javascript
async function captureWhat3Words() {
  const element = document.getElementById('what3words-map');
  const canvas = await html2canvas(element);
  const blob = await new Promise(resolve => canvas.toBlob(resolve));
  // Upload using /api/location/upload-image
}
```

### 2. Autosuggest in Text Field
If user types manually, show What3Words suggestions:
```javascript
what3wordsInput.addEventListener('input', async (e) => {
  const response = await fetch(`/api/location/autosuggest?input=${e.target.value}`);
  const data = await response.json();
  // Show dropdown with suggestions
});
```

### 3. Interactive Map
Add Leaflet.js map (like incident.html) allowing user to drag marker:
```javascript
const map = L.map('what3words-map');
L.marker([lat, lng], { draggable: true })
  .on('dragend', async (e) => {
    const { lat, lng } = e.target.getLatLng();
    // Convert new position to What3Words
  });
```

---

## Testing Checklist

- [ ] Load Page 4 in browser
- [ ] Allow geolocation permission
- [ ] Verify What3Words appears in map container
- [ ] Verify text input auto-populated with `///filled.count.soap` format
- [ ] Click "Refresh Location" button
- [ ] Verify location updates
- [ ] Deny geolocation permission (new session)
- [ ] Verify fallback to manual entry
- [ ] Manually type What3Words in text field
- [ ] Verify saves to session storage
- [ ] Navigate back and forward
- [ ] Verify What3Words persists

---

## Files Modified

1. **`public/incident-form-page4-preview.html`**
   - Replaced placeholder What3Words map with full API integration
   - Added geolocation request
   - Added success/error state displays
   - Added refresh location button
   - Integrated with session storage

2. **Controllers (NO CHANGES NEEDED)**
   - `src/controllers/location.controller.js` - Already exists
   - All endpoints already implemented

3. **Routes (NO CHANGES NEEDED)**
   - `src/routes/location.routes.js` - Already configured
   - Endpoints already mounted in `src/app.js`

---

## API Usage Pattern

**Existing Files Using What3Words API**:
- ✅ `public/incident.html` (999 call flow)
- ✅ `public/findme.html`
- ✅ `public/safety-check.html`
- ✅ `public/report.html`
- ✅ **`public/incident-form-page4-preview.html`** (NEW)

**Consistent Pattern Across All**:
```javascript
navigator.geolocation.getCurrentPosition(async (position) => {
  const { latitude, longitude } = position.coords;
  const response = await fetch(
    `/api/what3words/convert?lat=${latitude}&lng=${longitude}`,
    { credentials: 'include' }
  );
  const data = await response.json();
  // Display data.words
});
```

---

## Summary

✅ **Integration Complete**: Page 4 now uses existing What3Words backend API
✅ **Consistent UX**: Matches visual design from incident.html (red background, same layout)
✅ **Graceful Fallback**: Always allows manual entry if geolocation fails
✅ **Session Persistence**: What3Words saved and restored across navigation
✅ **No Backend Changes**: Leverages existing infrastructure

**Benefit**: User gets precise `///three.word.location` for emergency services without additional development.

**Next**: Test with real device to verify geolocation permission flow works correctly.

---

**Last Updated**: 2025-10-28
**Status**: ✅ READY FOR TESTING
