# UX Design Principles - Car Crash Lawyer AI

**Date**: 2025-11-03
**Context**: Users are accident victims in stressful situations
**Goal**: Gather accurate information quickly while minimizing cognitive load

---

## Core Design Philosophy

### 1. Checkboxes Over Radio Buttons ✅

**Why Checkboxes Preferred**:
- ✅ **Visibility**: Larger, easier to see (especially for stressed/teary-eyed users)
- ✅ **Speed**: Quick to tap/click (large touch targets)
- ✅ **Effectiveness**: Clear visual feedback (checked state obvious)
- ✅ **Accessibility**: Better for mobile users with shaky hands
- ✅ **Multi-select**: Allows capturing multiple conditions (e.g., weather, road conditions, damage points)

**Why Radio Buttons Avoided**:
- ❌ **Difficult to see**: Small circular targets, especially on mobile
- ❌ **Cognitive load**: Requires reading all options before selecting
- ❌ **Touch accuracy**: Harder to tap precisely when stressed

**Implementation Pattern**:
```html
<!-- ✅ PREFERRED: Checkboxes -->
<div class="checkbox-grid">
  <div class="checkbox-option">
    <input type="checkbox" id="weather-rain" name="weather_raining">
    <label for="weather-rain">Raining</label>
  </div>
  <div class="checkbox-option">
    <input type="checkbox" id="weather-fog" name="weather_fog">
    <label for="weather-fog">Fog/Mist</label>
  </div>
</div>

<!-- ❌ AVOID: Radio buttons (hard to see) -->
<div class="radio-group">
  <input type="radio" name="option" value="yes">
  <label>Yes</label>
</div>
```

**PDF Field Type**: Use CheckBox fields in PDF, not RadioButton groups

---

### 2. Drop-Down Sections for Text Input 📝

**Why Drop-Down Sections Preferred**:
- ✅ **Speed**: User can skip irrelevant sections
- ✅ **Accuracy**: Contextual text input (user knows what they're describing)
- ✅ **Organization**: Logical grouping reduces overwhelm
- ✅ **Progressive disclosure**: Only show fields when needed

**Implementation Pattern**:
```html
<!-- Collapsible section with conditional display -->
<div class="form-section">
  <div class="section-header" onclick="toggleSection('damage-details')">
    <h3>Damage Details</h3>
    <span class="toggle-icon">▼</span>
  </div>

  <div id="damage-details" class="section-content" style="display: none;">
    <!-- Checkboxes for quick selection -->
    <div class="checkbox-grid">
      <input type="checkbox" name="no_damage">
      <label>No visible damage</label>
    </div>

    <!-- Text area for detailed description -->
    <div class="form-group">
      <label>Describe damage in detail:</label>
      <textarea name="damage_description" rows="4"
                placeholder="e.g., Large dent on driver door..."></textarea>
    </div>
  </div>
</div>
```

**Benefits**:
- User can quickly check "No damage" and collapse section
- OR expand and provide detailed narrative
- Reduces scrolling for irrelevant sections

---

### 3. Conditional Field Display

**Pattern**: Show/hide sections based on checkbox state

**Example 1: Recovery Details** (Page 5)
```html
<!-- Main question: Was vehicle driveable? -->
<input type="checkbox" id="not-driveable" name="vehicle_not_driveable"
       onchange="toggleRecoverySection()">
<label>No, it needed to be towed</label>

<!-- Conditional section: Only show if towed -->
<div id="recovery-details" style="display: none;">
  <input type="text" name="recovery_company" placeholder="Recovery company">
  <input type="tel" name="recovery_phone" placeholder="Phone">
  <textarea name="recovery_notes" rows="3"></textarea>
</div>

<script>
function toggleRecoverySection() {
  const notDriveable = document.getElementById('not-driveable').checked;
  document.getElementById('recovery-details').style.display =
    notDriveable ? 'block' : 'none';
}
</script>
```

**Benefits**:
- Reduces clutter
- User only sees relevant fields
- Faster completion time

---

## Page 5 Design Review (Based on UX Principles)

### Current Implementation Analysis

**Section 1: Usual Vehicle** (Lines 559-583)
```html
<!-- CURRENT: Radio buttons ❌ -->
<input type="radio" name="usual_vehicle" value="yes">
<input type="radio" name="usual_vehicle" value="no">
```

**⚠️ ISSUE**: Uses radio buttons (not preferred)

**💡 RECOMMENDATION**: Consider checkbox pattern:
```html
<!-- SUGGESTED: Checkbox (easier to see) ✅ -->
<input type="checkbox" id="usual-vehicle" name="usual_vehicle" value="yes">
<label for="usual-vehicle">This was my usual vehicle</label>

<!-- Alternative: Two checkboxes with mutual exclusivity via JS -->
<input type="checkbox" id="usual-yes" name="usual_vehicle_yes"
       onchange="uncheckOther('usual-no')">
<label>Yes, my usual vehicle</label>

<input type="checkbox" id="usual-no" name="usual_vehicle_no"
       onchange="uncheckOther('usual-yes')">
<label>No, a different vehicle</label>
```

---

**Section 2: Damage Details** (Lines 684-788)
```html
<!-- ✅ GOOD: Uses checkboxes for impact points -->
<input type="checkbox" name="impact_point" value="front">
<input type="checkbox" name="impact_point" value="rear">
<!-- ... 10 checkboxes total -->

<!-- ✅ GOOD: Drop-down text area for description -->
<textarea name="damage_description" rows="4"></textarea>
```

**✅ ASSESSMENT**: Follows design principles perfectly!

---

**Section 3: Vehicle Driveable** (Lines 773-786)
```html
<!-- CURRENT: Radio buttons ❌ -->
<input type="radio" name="vehicle_driveable" value="yes">
<input type="radio" name="vehicle_driveable" value="no">
<input type="radio" name="vehicle_driveable" value="unsure">
```

**⚠️ ISSUE**: Uses radio buttons (not preferred)

**💡 RECOMMENDATION**: Convert to checkboxes:
```html
<!-- SUGGESTED: Checkboxes with mutual exclusivity ✅ -->
<div class="checkbox-group" data-exclusive="vehicle-driveable">
  <div class="checkbox-option">
    <input type="checkbox" id="drove-away" name="vehicle_driveable" value="yes"
           onchange="exclusiveCheck(this, 'vehicle-driveable')">
    <label for="drove-away">Yes, I drove it away</label>
  </div>

  <div class="checkbox-option">
    <input type="checkbox" id="needed-tow" name="vehicle_driveable" value="no"
           onchange="exclusiveCheck(this, 'vehicle-driveable'); toggleRecovery()">
    <label for="needed-tow">No, it needed to be towed</label>
  </div>

  <div class="checkbox-option">
    <input type="checkbox" id="unsure" name="vehicle_driveable" value="unsure"
           onchange="exclusiveCheck(this, 'vehicle-driveable')">
    <label for="unsure">Unsure, did not attempt to drive</label>
  </div>
</div>

<script>
// Mutual exclusivity: Only one checkbox in group can be checked
function exclusiveCheck(checkbox, groupName) {
  if (checkbox.checked) {
    document.querySelectorAll(`[data-exclusive="${groupName}"] input[type="checkbox"]`)
      .forEach(cb => {
        if (cb !== checkbox) cb.checked = false;
      });
  }
}
</script>
```

**Benefits**:
- Larger, easier to see
- Better for mobile (bigger touch targets)
- Still enforces single selection via JavaScript
- Visually consistent with other checkboxes on page

---

**Section 4: Recovery Details** (Lines 790-862)
```html
<!-- ✅ GOOD: Conditional display -->
<div id="recovery-details-section" style="display: none;">
  <input type="text" name="recovery_company">
  <input type="tel" name="recovery_phone">
  <textarea name="recovery_notes" rows="3"></textarea>
</div>
```

**✅ ASSESSMENT**: Perfect use of conditional fields!

---

## PDF Template Design Alignment

### PDF Field Types Should Match HTML UX

**For Single-Choice Fields** (like usual_vehicle, vehicle_driveable):

**Option 1: Multiple CheckBox Fields** (RECOMMENDED)
```
PDF Template:
☐ Yes, my usual vehicle       (CheckBox: usual_vehicle_yes)
☐ No, a different vehicle     (CheckBox: usual_vehicle_no)

☐ Yes, I drove it away        (CheckBox: vehicle_driveable_yes)
☐ No, it needed to be towed   (CheckBox: vehicle_driveable_no)
☐ Unsure, did not attempt     (CheckBox: vehicle_driveable_unsure)
```

**Mapping Logic**:
```javascript
// Database: vehicle_driveable = "yes"/"no"/"unsure"
pdfFields.vehicle_driveable_yes = (data.vehicle_driveable === "yes");
pdfFields.vehicle_driveable_no = (data.vehicle_driveable === "no");
pdfFields.vehicle_driveable_unsure = (data.vehicle_driveable === "unsure");
```

**Option 2: RadioButton Group** (NOT RECOMMENDED)
```
PDF Template:
⦿ Yes  ○ No                   (RadioButton: usual_vehicle)
```
❌ Harder to see, inconsistent with HTML UX

---

### Multi-Select Fields (like impact_point)

**Use: Multiple CheckBox Fields** (ALREADY CORRECT)
```
PDF Template:
☐ Front                       (CheckBox: vehicle_damage_front)
☐ Rear                        (CheckBox: vehicle_damage_rear)
☐ Driver Side                 (CheckBox: vehicle_damage_driver_side)
... (10 total)
```

**Mapping Logic**:
```javascript
// Database: impact_point = ["front", "rear", "driver_side"]
data.impact_point.forEach(point => {
  pdfFields[`vehicle_damage_${point}`] = true;
});
```

---

## Design Principles Summary

| Element | Preference | Reason | Example |
|---------|-----------|--------|---------|
| **Input Type** | Checkboxes ✅ | Visibility, speed, ease | Weather conditions, damage points |
| **Input Type** | Radio Buttons ❌ | Hard to see, slow | Avoid if possible |
| **Input Type** | Dropdowns (select) | Acceptable for long lists | Speed limit (20, 30, 40, 50...) |
| **Text Input** | Drop-down sections ✅ | Speed, accuracy, organization | Damage description, recovery notes |
| **Conditional Fields** | Show/hide based on state ✅ | Reduces clutter | Recovery details if not driveable |
| **PDF Fields** | CheckBox ✅ | Match HTML UX | Consistent experience |
| **PDF Fields** | RadioButton ❌ | Inconsistent with HTML | Avoid |

---

## Implementation Checklist for Future Pages

When analyzing or creating new form pages:

- [ ] ✅ Use checkboxes for all multi-choice questions
- [ ] ✅ Use checkboxes even for single-choice (with JS mutual exclusivity)
- [ ] ❌ Avoid radio buttons
- [ ] ✅ Group related text inputs in collapsible sections
- [ ] ✅ Show/hide conditional fields based on checkbox state
- [ ] ✅ Use large touch targets (44x44px minimum)
- [ ] ✅ Clear visual feedback (checked state obvious)
- [ ] ✅ PDF fields match HTML UX (CheckBox, not RadioButton)

---

## Accessibility & Stress-Optimized Design

**Remember**: Users are stressed, possibly injured, may have:
- Shaky hands
- Blurred vision (tears)
- Reduced cognitive capacity
- Mobile devices only

**Design for**:
- Maximum visibility
- Minimum cognitive load
- Fast completion
- Forgiving interactions (large targets)
- Clear progress indicators

---

**Last Updated**: 2025-11-03
**Applies To**: All incident form pages (1-12)
**Review**: Update when UX testing reveals new insights
