# Page 5 - Impact Point Array Handling

**Date**: 2025-11-03
**Question**: How do 10 HTML checkboxes map to 1 database field and back to 10 PDF checkboxes?
**Answer**: PostgreSQL TEXT[] arrays!

---

## The Complete Flow

```
HTML (10 checkboxes) → JavaScript (Array) → Database (TEXT[]) → Backend (Array) → PDF (10 checkboxes)
```

---

## Step 1: HTML - Multiple Checkboxes, Same Name

**File**: `public/incident-form-page5-vehicle.html`

```html
<!-- All 10 checkboxes share the same NAME but have different VALUES -->
<div class="checkbox-grid">
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="front">
    <label>Front</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="front_driver">
    <label>Front Driver Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="front_passenger">
    <label>Front Passenger Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="driver_side">
    <label>Driver Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="passenger_side">
    <label>Passenger Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="rear_driver">
    <label>Rear Driver Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="rear_passenger">
    <label>Rear Passenger Side</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="rear">
    <label>Rear</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="roof">
    <label>Roof</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" name="impact_point" value="undercarriage">
    <label>Undercarriage</label>
  </div>
</div>
```

**Key Point**: All checkboxes have `name="impact_point"` but different `value` attributes.

---

## Step 2: JavaScript - Collect Checked Values into Array

**File**: `public/incident-form-page5-vehicle.html` (lines 1015-1017)

```javascript
// Auto-save function collects ALL checked impact points into an array
function autoSave() {
  // Select all checkboxes with name="impact_point" that are CHECKED
  const impactPoints = Array.from(
    document.querySelectorAll('input[name="impact_point"]:checked')
  ).map(cb => cb.value);

  // Example: User checks "front", "passenger_side", and "rear"
  // Result: impactPoints = ["front", "passenger_side", "rear"]

  const formData = {
    usual_vehicle: document.querySelector('input[name="usual_vehicle"]:checked')?.value,
    dvla_lookup_reg: document.getElementById('license-plate').value,
    dvla_vehicle_data: vehicleData,
    no_damage: document.getElementById('no-damage-checkbox').checked,
    impact_points: impactPoints,  // ← Array of selected values
    damage_to_your_vehicle: document.getElementById('damage-description').value,
    vehicle_driveable: document.querySelector('input[name="vehicle_driveable"]:checked')?.value
  };

  localStorage.setItem('page5_data', JSON.stringify(formData));
  console.log('Page 5 data saved:', formData);
}
```

**Example Output**:
```javascript
{
  impact_points: ["front", "passenger_side", "rear"]
}
```

---

## Step 3: Form Submission - Send Array to Backend

**File**: Form submission code (example)

```javascript
async function submitIncidentForm() {
  const formData = {
    // ... other fields
    impact_point: impactPoints  // Array sent to backend
  };

  const response = await fetch('/api/incident-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
}
```

**Request Body**:
```json
{
  "impact_point": ["front", "passenger_side", "rear"]
}
```

---

## Step 4: Database - Store as PostgreSQL Array

**SQL Schema**:
```sql
ALTER TABLE incident_reports
ADD COLUMN IF NOT EXISTS impact_point TEXT[];
```

**Insert Example**:
```sql
INSERT INTO incident_reports (create_user_id, impact_point)
VALUES (
  'user-uuid-here',
  ARRAY['front', 'passenger_side', 'rear']  -- PostgreSQL array syntax
);
```

**Database Storage**:
```
impact_point column:
+--------------------------------+
| ["front","passenger_side","rear"] |  ← Stored as TEXT[] array
+--------------------------------+
```

**Query Examples**:
```sql
-- Check if specific impact point exists
SELECT * FROM incident_reports
WHERE 'front' = ANY(impact_point);

-- Get all impact points for a user
SELECT impact_point FROM incident_reports
WHERE create_user_id = 'user-uuid';
-- Result: ["front", "passenger_side", "rear"]
```

---

## Step 5: Backend - Retrieve Array from Database

**File**: `src/controllers/incidentReportController.js` (example)

```javascript
async function getIncidentReport(userId) {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (error) throw error;

  // data.impact_point is already an array!
  console.log(data.impact_point);
  // Output: ["front", "passenger_side", "rear"]

  return data;
}
```

**Data Structure**:
```javascript
{
  create_user_id: "uuid",
  usual_vehicle: "yes",
  impact_point: ["front", "passenger_side", "rear"],  // ← Array!
  damage_to_your_vehicle: "Large dent on passenger door",
  vehicle_driveable: "yes"
}
```

---

## Step 6: PDF Mapping - Array to Individual Checkboxes

**File**: `src/services/adobePdfService.js` (or PDF mapping code)

```javascript
function mapPage5DataToPdf(data) {
  const pdfFields = {};

  // Get the impact_point array (or empty array if null)
  const impactPoints = data.impact_point || [];

  // Map EACH array value to its corresponding PDF checkbox
  // PDF has 10 separate checkbox fields
  pdfFields.impact_point_front = impactPoints.includes('front');
  pdfFields.impact_point_front_driver = impactPoints.includes('front_driver');
  pdfFields.impact_point_front_passenger = impactPoints.includes('front_passenger');
  pdfFields.impact_point_driver_side = impactPoints.includes('driver_side');
  pdfFields.impact_point_passenger_side = impactPoints.includes('passenger_side');
  pdfFields.impact_point_rear_driver = impactPoints.includes('rear_driver');
  pdfFields.impact_point_rear_passenger = impactPoints.includes('rear_passenger');
  pdfFields.impact_point_rear = impactPoints.includes('rear');
  pdfFields.impact_point_roof = impactPoints.includes('roof');
  pdfFields.impact_point_undercarriage = impactPoints.includes('undercarriage');

  return pdfFields;
}
```

**Example**:
```javascript
// Input data from database
data.impact_point = ["front", "passenger_side", "rear"]

// Output PDF fields
{
  impact_point_front: true,              // ✅ Checked (in array)
  impact_point_front_driver: false,      // ❌ Unchecked (not in array)
  impact_point_front_passenger: false,   // ❌ Unchecked
  impact_point_driver_side: false,       // ❌ Unchecked
  impact_point_passenger_side: true,     // ✅ Checked (in array)
  impact_point_rear_driver: false,       // ❌ Unchecked
  impact_point_rear_passenger: false,    // ❌ Unchecked
  impact_point_rear: true,               // ✅ Checked (in array)
  impact_point_roof: false,              // ❌ Unchecked
  impact_point_undercarriage: false      // ❌ Unchecked
}
```

---

## Step 7: PDF Template - 10 Separate Checkbox Fields

**In Adobe Acrobat Pro, create 10 checkbox form fields:**

| PDF Field Name | Type | Checked When |
|---------------|------|--------------|
| `impact_point_front` | CheckBox | `impact_point` array includes `'front'` |
| `impact_point_front_driver` | CheckBox | `impact_point` array includes `'front_driver'` |
| `impact_point_front_passenger` | CheckBox | `impact_point` array includes `'front_passenger'` |
| `impact_point_driver_side` | CheckBox | `impact_point` array includes `'driver_side'` |
| `impact_point_passenger_side` | CheckBox | `impact_point` array includes `'passenger_side'` |
| `impact_point_rear_driver` | CheckBox | `impact_point` array includes `'rear_driver'` |
| `impact_point_rear_passenger` | CheckBox | `impact_point` array includes `'rear_passenger'` |
| `impact_point_rear` | CheckBox | `impact_point` array includes `'rear'` |
| `impact_point_roof` | CheckBox | `impact_point` array includes `'roof'` |
| `impact_point_undercarriage` | CheckBox | `impact_point` array includes `'undercarriage'` |

**PDF Result**: ✅ 3 checkboxes marked (front, passenger_side, rear), 7 unmarked

---

## Complete Example Scenario

### User Actions (HTML Page)
```
User checks:
☑ Front
☐ Front Driver Side
☐ Front Passenger Side
☐ Driver Side
☑ Passenger Side
☐ Rear Driver Side
☐ Rear Passenger Side
☑ Rear
☐ Roof
☐ Undercarriage
```

### JavaScript Collection
```javascript
impactPoints = ["front", "passenger_side", "rear"]
```

### Database Storage (PostgreSQL)
```sql
impact_point = ARRAY['front', 'passenger_side', 'rear']
```

### Backend Retrieval
```javascript
data.impact_point = ["front", "passenger_side", "rear"]
```

### PDF Mapping Code
```javascript
pdfFields.impact_point_front = true             // "front" in array
pdfFields.impact_point_front_driver = false     // not in array
pdfFields.impact_point_front_passenger = false  // not in array
pdfFields.impact_point_driver_side = false      // not in array
pdfFields.impact_point_passenger_side = true    // "passenger_side" in array
pdfFields.impact_point_rear_driver = false      // not in array
pdfFields.impact_point_rear_passenger = false   // not in array
pdfFields.impact_point_rear = true              // "rear" in array
pdfFields.impact_point_roof = false             // not in array
pdfFields.impact_point_undercarriage = false    // not in array
```

### PDF Output (Adobe PDF)
```
☑ Front
☐ Front Driver Side
☐ Front Passenger Side
☐ Driver Side
☑ Passenger Side
☐ Rear Driver Side
☐ Rear Passenger Side
☑ Rear
☐ Roof
☐ Undercarriage

Describe damage to your vehicle:
Large dent on passenger door and rear bumper cracked
```

---

## Why This Pattern Works

### ✅ Advantages

1. **Database Efficiency**: One column instead of 10 boolean columns
2. **Flexible**: Easy to add new impact points (just add to array values)
3. **Queryable**: PostgreSQL array operators (`ANY`, `@>`, `&&`)
4. **Type-Safe**: Array ensures only valid impact point values
5. **PDF Compatible**: Maps cleanly to individual checkboxes

### ✅ PostgreSQL Array Features

```sql
-- Check if contains specific value
SELECT * FROM incident_reports WHERE 'front' = ANY(impact_point);

-- Check if contains ALL values
SELECT * FROM incident_reports WHERE impact_point @> ARRAY['front', 'rear'];

-- Check if contains ANY of multiple values
SELECT * FROM incident_reports WHERE impact_point && ARRAY['front', 'passenger_side'];

-- Get number of impact points
SELECT create_user_id, array_length(impact_point, 1) as impact_count
FROM incident_reports;
```

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Creating 10 Separate Columns
```sql
-- DON'T DO THIS ❌
ALTER TABLE incident_reports ADD COLUMN impact_point_front BOOLEAN;
ALTER TABLE incident_reports ADD COLUMN impact_point_rear BOOLEAN;
-- ... 8 more columns
```

**Problem**: Wastes space, harder to query, harder to maintain

### ✅ Solution: Use Array
```sql
-- DO THIS ✅
ALTER TABLE incident_reports ADD COLUMN impact_point TEXT[];
```

---

### ❌ Pitfall 2: Storing as JSON String
```sql
-- DON'T DO THIS ❌
ALTER TABLE incident_reports ADD COLUMN impact_point TEXT;
-- Stores: '["front","passenger_side","rear"]' as string
```

**Problem**: Can't query efficiently, have to parse JSON every time

### ✅ Solution: Use Native Array
```sql
-- DO THIS ✅
ALTER TABLE incident_reports ADD COLUMN impact_point TEXT[];
-- Stores: ARRAY['front','passenger_side','rear'] as native array
```

---

### ❌ Pitfall 3: Comma-Separated String
```sql
-- DON'T DO THIS ❌
ALTER TABLE incident_reports ADD COLUMN impact_point TEXT;
-- Stores: 'front,passenger_side,rear'
```

**Problem**: Can't query properly, string splitting is messy

### ✅ Solution: Use Array
```sql
-- DO THIS ✅
ALTER TABLE incident_reports ADD COLUMN impact_point TEXT[];
```

---

## Backend Code Examples

### Node.js - Supabase Insert
```javascript
const { data, error } = await supabase
  .from('incident_reports')
  .insert({
    create_user_id: userId,
    impact_point: ['front', 'passenger_side', 'rear'],  // JavaScript array
    damage_to_your_vehicle: 'Large dent on passenger door'
  });
```

### Node.js - Supabase Update
```javascript
const { data, error } = await supabase
  .from('incident_reports')
  .update({
    impact_point: ['front', 'driver_side']  // Updates the array
  })
  .eq('create_user_id', userId);
```

### Node.js - Query with Array Filter
```javascript
// Find all reports with "front" impact
const { data, error } = await supabase
  .from('incident_reports')
  .select('*')
  .contains('impact_point', ['front']);  // PostgreSQL array contains

// Find all reports with BOTH "front" AND "rear"
const { data, error } = await supabase
  .from('incident_reports')
  .select('*')
  .contains('impact_point', ['front', 'rear']);
```

---

## Testing Checklist

### HTML Page Test
- [ ] Check 1 impact point → Array has 1 value
- [ ] Check 5 impact points → Array has 5 values
- [ ] Check all 10 → Array has 10 values
- [ ] Uncheck all → Array is empty `[]`
- [ ] Auto-save persists checked values

### Database Test
```sql
-- Insert test data
INSERT INTO incident_reports (create_user_id, impact_point)
VALUES ('test-uuid', ARRAY['front', 'passenger_side', 'rear']);

-- Verify storage
SELECT impact_point FROM incident_reports WHERE create_user_id = 'test-uuid';
-- Expected: ["front","passenger_side","rear"]

-- Test array query
SELECT * FROM incident_reports WHERE 'front' = ANY(impact_point);
-- Expected: Returns the row
```

### PDF Test
```javascript
// Test with sample data
const testData = {
  impact_point: ['front', 'passenger_side', 'rear']
};

const pdfFields = mapPage5DataToPdf(testData);

console.log(pdfFields.impact_point_front);            // true
console.log(pdfFields.impact_point_passenger_side);   // true
console.log(pdfFields.impact_point_rear);             // true
console.log(pdfFields.impact_point_driver_side);      // false
```

---

## Summary

**The Magic**: PostgreSQL TEXT[] arrays!

| Stage | Format | Example |
|-------|--------|---------|
| HTML Checkboxes | Multiple inputs, same name | `<input name="impact_point" value="front">` × 10 |
| JavaScript Array | Array of strings | `["front", "passenger_side", "rear"]` |
| Database Column | PostgreSQL TEXT[] | `ARRAY['front','passenger_side','rear']` |
| Backend Code | JavaScript array | `data.impact_point = ["front", "passenger_side", "rear"]` |
| PDF Mapping | Boolean per checkbox | `impact_point_front: true`, `impact_point_rear: true` |
| PDF Template | Individual checkboxes | ☑ Front, ☑ Passenger Side, ☑ Rear |

**Your PDF is already set up correctly** with individual checkboxes - perfect! The backend code just needs to map the array to those checkboxes using `.includes()` checks.

---

**Last Updated**: 2025-11-03
