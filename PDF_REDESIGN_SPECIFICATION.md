# Car Crash Lawyer AI - PDF Report Redesign Specification

## Document Control

| Property | Value |
|----------|-------|
| **Document Version** | 1.0 |
| **Created Date** | 2025-10-31 |
| **Status** | ✅ Ready for Implementation |
| **Tool Required** | Adobe Acrobat Pro DC or Adobe PDF Services API |
| **Total Pages** | 17 pages |
| **Total Form Fields** | 99 fields |

---

## Executive Summary

This specification provides a complete blueprint for redesigning the Car Crash Lawyer AI incident report PDF using the established color scheme, professional layout, and accessibility-first design principles.

**Key Features**:
- ✅ WCAG 2.1 AA compliant color scheme
- ✅ Professional legal document appearance
- ✅ Calming colors for stressed accident victims
- ✅ Clear visual hierarchy and section organization
- ✅ Mobile-friendly field sizing (44x44px minimum touch targets)
- ✅ Branded header and footer on all pages

---

## Design System

### Color Palette (from CLAUDE.md)

#### Primary Brand Colors
```
Deep Teal:       #0E7490  → Headers, section titles, accents
Deep Teal Dark:  #0c6179  → Header gradient end
Warm Beige:      #E8DCC4  → Page background
Dark Gray:       #4B5563  → Borders, dividers, section lines
```

#### Form Element Colors
```
Steel Gray:      #CFD2D7  → Text input backgrounds
Cream Gray:      #F5F1E8  → Section containers, checkbox backgrounds
Silver:          #C0C0C0  → Unused buttons (PDF-specific)
```

#### Text Colors
```
Text Dark:       #333333  → Primary text, labels, headings
Text Muted:      #666666  → Help text, descriptions
White:           #FFFFFF  → Text on dark backgrounds
```

#### Status Colors
```
Success Green:   #10b981  → Checked checkboxes (✓)
Danger Red:      #ef4444  → Required field indicators (*)
Warning Orange:  #f59e0b  → Optional warnings
```

### Typography

#### Font Stack
```
Primary: Arial, Helvetica, sans-serif
Monospace: Courier New, monospace (for dates, times)
```

#### Font Sizes
```
Page Title:      24pt, Bold, Deep Teal (#0E7490)
Section Heading: 16pt, Bold, Text Dark (#333333)
Field Labels:    11pt, Regular, Text Dark (#333333)
Help Text:       9pt, Italic, Text Muted (#666666)
Field Content:   11pt, Regular, Text Dark (#333333)
Footer Text:     8pt, Regular, Text Muted (#666666)
```

### Spacing & Layout

#### Page Margins
```
Top:    60pt (includes header)
Bottom: 50pt (includes footer)
Left:   50pt
Right:  50pt
```

#### Element Spacing
```
Section Padding:     20pt (top/bottom)
Field Vertical Gap:  12pt
Checkbox Grid Gap:   8pt
Label-to-Field Gap:  4pt
```

#### Field Dimensions
```
Text Input:     Width: 100% of column, Height: 30pt
Textarea:       Width: 100%, Height: 80pt (3-4 lines)
Checkbox:       Width: 16pt, Height: 16pt (with 44x44pt touch target)
Date Input:     Width: 150pt, Height: 30pt
Time Input:     Width: 100pt, Height: 30pt
Dropdown:       Width: 100%, Height: 30pt
```

---

## Page Templates

### Header Template (All Pages)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [LOGO]                    CAR CRASH LAWYER AI                [PAGE X/17]│
│ 50x50pt                   INCIDENT REPORT                     9pt       │
│                           Deep Teal #0E7490                             │
│                           16pt Bold                                     │
├─────────────────────────────────────────────────────────────────────────┤
```

**Header Specifications**:
- Background: Warm Beige (#E8DCC4)
- Height: 80pt
- Logo: `public/images/logo.png` (50x50pt, top-left, 10pt padding)
- Title: "CAR CRASH LAWYER AI" (centered, 16pt bold, Deep Teal)
- Subtitle: "INCIDENT REPORT" (centered, 11pt, Text Muted)
- Page Number: "Page X of 17" (top-right, 9pt, Text Muted)

### Footer Template (All Pages)

```
├─────────────────────────────────────────────────────────────────────────┤
│ Car Crash Lawyer AI • Confidential Legal Document • Generated [DATE]   │
│ For legal use only - Do not distribute without authorization           │
│                                                                         │
│                    [LOGO: car-crash-lawyer-ai-450.webp]                │
│                              100x28pt                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Footer Specifications**:
- Background: Warm Beige (#E8DCC4)
- Height: 70pt
- Text: 8pt, Text Muted (#666666), centered
- Logo: `public/images/car-crash-lawyer-ai-450.webp` (100x28pt, centered)
- Border Top: 1pt solid Dark Gray (#4B5563)

### Section Container Template

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ SECTION TITLE (e.g., "INCIDENT DETAILS")                   │ ← 16pt Bold
├───────────────────────────────────────────────────────────────┤
│ [Background: Cream Gray #F5F1E8]                             │
│                                                               │
│ Field Label: *                         [____________________] │ ← 11pt
│ Help text if needed                                           │ ← 9pt Italic
│                                                               │
│ Field Label 2:                         [____________________] │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Section Specifications**:
- Background: Cream Gray (#F5F1E8)
- Border: 1pt solid Dark Gray (#4B5563)
- Border Radius: 4pt
- Padding: 20pt
- Margin Bottom: 15pt

---

## Page-by-Page Layout

### Page 1: Incident Overview & Location

**Section 1: Basic Incident Information** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ INCIDENT DETAILS                                            │
├───────────────────────────────────────────────────────────────┤
│ Date of Accident: *             [___/___/_____] (DD/MM/YYYY)  │
│                                  150pt width                   │
│                                                               │
│ Time of Accident: *             [__:__] [AM/PM]              │
│                                  100pt width                   │
│                                                               │
│ Your Speed (mph):               [_____] mph                   │
│                                  80pt width                    │
│                                                               │
│ Was this your usual vehicle?    ☐ Yes  ☐ No                  │
│                                                               │
│ Your Vehicle Registration: *    [__________]                  │
│ (e.g., AB12 CDE)                200pt width                   │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Location Information** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ ACCIDENT LOCATION                                           │
├───────────────────────────────────────────────────────────────┤
│ Full Address: *                                               │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 2-line textarea, 80pt height                                 │
│                                                               │
│ what3words Location:            [_____._____._____ ]          │
│ 3 words separated by dots       250pt width                   │
│                                                               │
│ Nearest Landmark:               [__________________________]  │
│                                 300pt width                    │
│                                                               │
│ Speed Limit at Location:        [____] mph                    │
│                                  80pt width                    │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 2: Medical Assessment

**Section 1: Immediate Medical Status** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ MEDICAL ATTENTION                                           │
├───────────────────────────────────────────────────────────────┤
│ Did you need medical attention? *    ☐ Yes  ☐ No             │
│                                                               │
│ Was an ambulance called? *           ☐ Yes  ☐ No  ☐ N/A      │
│                                                               │
│ Hospital Name (if attended):         [____________________]  │
│                                      300pt width              │
│                                                               │
│ Injury Severity: *                                            │
│   ☐ None                                                      │
│   ☐ Minor (cuts, bruises)                                     │
│   ☐ Moderate (sprains, deeper cuts)                           │
│   ☐ Severe (fractures, significant injuries)                  │
│   ☐ Life-threatening                                          │
│                                                               │
│ Treatment Received:                  [____________________]  │
│ (e.g., first aid, hospital care)    300pt width              │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Symptoms Checklist** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ SYMPTOMS EXPERIENCED (Check all that apply)                │
├───────────────────────────────────────────────────────────────┤
│ ☐ No symptoms                                                 │
│                                                               │
│ ☐ Severe headache          ☐ Dizziness                        │
│ ☐ Loss of consciousness    ☐ Chest pain                       │
│ ☐ Breathlessness           ☐ Abdominal pain                   │
│ ☐ Abdominal bruising       ☐ Limb pain/mobility issues        │
│ ☐ Limb weakness            ☐ Change in vision                 │
│ ☐ Uncontrolled bleeding    ☐ Life-threatening symptoms        │
│                                                               │
│ Note: 2-column checkbox grid, 8pt gap, 44x44pt touch targets │
└───────────────────────────────────────────────────────────────┘
```

**Section 3: Additional Medical Details** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ Detailed Description of Injuries:                            │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 4-line textarea, 120pt height                                │
│                                                               │
│ Overall Feeling After Incident:                              │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 2-line textarea, 60pt height                                 │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 3: Vehicle Damage Assessment

**Section 1: Damage Overview** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ YOUR VEHICLE DAMAGE                                         │
├───────────────────────────────────────────────────────────────┤
│ ☐ No damage                                                   │
│ ☐ No visible damage (may have internal damage)               │
│                                                               │
│ Point of Impact on Your Vehicle: *                            │
│   ☐ Front      ☐ Front-Left   ☐ Front-Right                  │
│   ☐ Rear       ☐ Rear-Left    ☐ Rear-Right                   │
│   ☐ Side-Left  ☐ Side-Right   ☐ Roof/Top                     │
│   ☐ Undercarriage              ☐ Multiple areas               │
│                                                               │
│ Damage Description: *                                         │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 5-line textarea, 150pt height                                │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Safety Features** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ SAFETY FEATURES STATUS                                      │
├───────────────────────────────────────────────────────────────┤
│ Were seatbelts worn? *           ☐ Yes  ☐ No                 │
│                                                               │
│ Did airbags deploy? *            ☐ Yes  ☐ No  ☐ Not equipped │
│                                                               │
│ Is vehicle driveable? *          ☐ Yes  ☐ No  ☐ Unknown      │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 4: Weather & Road Conditions

**Section 1: Weather Conditions** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ WEATHER CONDITIONS (Check all that apply)                  │
├───────────────────────────────────────────────────────────────┤
│ ☐ Clear               ☐ Cloudy            ☐ Bright sunlight  │
│ ☐ Raining             ☐ Drizzle           ☐ Heavy rain        │
│ ☐ Fog                 ☐ Snow              ☐ Ice               │
│ ☐ Hail                ☐ Windy             ☐ Thunder/Lightning │
│ ☐ Other: [_______________________]                            │
│                                                               │
│ Note: 3-column grid, 8pt gap, each checkbox 16pt square     │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Road Surface Conditions** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ ROAD SURFACE (Check all that apply)                        │
├───────────────────────────────────────────────────────────────┤
│ ☐ Dry                 ☐ Wet               ☐ Icy              │
│ ☐ Snow covered        ☐ Loose surface     ☐ Other            │
│                                                               │
│ Note: 3-column grid                                           │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 5: Road Type & Traffic Conditions

**Section 1: Road Classification** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ ROAD TYPE (Check all that apply)                           │
├───────────────────────────────────────────────────────────────┤
│ ☐ Motorway            ☐ A Road            ☐ B Road           │
│ ☐ Urban street        ☐ Rural road        ☐ Car park         │
│ ☐ Other: [_______________________]                            │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Traffic Density** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ TRAFFIC CONDITIONS                                          │
├───────────────────────────────────────────────────────────────┤
│ ☐ No traffic          ☐ Light             ☐ Moderate         │
│ ☐ Heavy                                                       │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 6: Visibility Conditions

**Section 1: Overall Visibility** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ VISIBILITY LEVEL                                            │
├───────────────────────────────────────────────────────────────┤
│ ☐ Good (clear view)                                           │
│ ☐ Poor (limited visibility)                                   │
│ ☐ Very poor (severely limited)                                │
│ ☐ Severely restricted (dangerous conditions)                  │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Road Markings** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ ROAD MARKINGS VISIBILITY                                    │
├───────────────────────────────────────────────────────────────┤
│ ☐ Yes (clearly visible)                                       │
│ ☐ Partially visible                                           │
│ ☐ No (not visible)                                            │
└───────────────────────────────────────────────────────────────┘
```

**Section 3: Additional Visibility Factors** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ VISIBILITY FACTORS (Check all that apply)                  │
├───────────────────────────────────────────────────────────────┤
│ Describe any factors affecting visibility:                   │
│ (e.g., sun glare, headlight glare, rain, darkness)           │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 2-line textarea                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 7: Junction & Infrastructure Details

**Section 1: Junction Information** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ JUNCTION DETAILS (if applicable)                           │
├───────────────────────────────────────────────────────────────┤
│ Junction Type:                                                │
│ [▼ Select type _______________]                               │
│ (Dropdown: T-junction, Crossroads, Roundabout, etc.)         │
│                                                               │
│ Junction Control:                                             │
│ [▼ Select control _____________]                              │
│ (Dropdown: Traffic lights, Give way, Stop sign, etc.)        │
│                                                               │
│ Traffic Light Status (if applicable):                         │
│ [▼ Select status ______________]                              │
│ (Dropdown: Green, Amber, Red, Not applicable)                │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Special Conditions** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ SPECIAL ROAD CONDITIONS                                     │
├───────────────────────────────────────────────────────────────┤
│ Special Conditions:                                           │
│ [___________________________________________________________] │
│ (e.g., roadworks, temporary lights, school zone)             │
│                                                               │
│ Additional Hazards:                                           │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 2-line textarea                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 8: Accident Narrative & Driver Actions

**Section 1: What Happened** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ ACCIDENT NARRATIVE *                                        │
├───────────────────────────────────────────────────────────────┤
│ Describe what happened in your own words:                    │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 8-line textarea, 240pt height                                │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Your Actions** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ MANOEUVRE YOU WERE PERFORMING *                            │
├───────────────────────────────────────────────────────────────┤
│ [▼ Select manoeuvre _______________________________________]  │
│ (Dropdown: Driving straight, Turning left, Turning right,    │
│  Overtaking, Reversing, Parking, Pulling out, etc.)          │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 9: Other Vehicle Information

**Section 1: Other Driver Details** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ OTHER DRIVER INFORMATION                                    │
├───────────────────────────────────────────────────────────────┤
│ Driver Name: *                  [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Driver Email:                   [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Driver Phone:                   [___________________________] │
│                                 200pt width                    │
│                                                               │
│ Driver License Number:          [___________________________] │
│                                 250pt width                    │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Other Vehicle Details** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ OTHER VEHICLE DETAILS                                       │
├───────────────────────────────────────────────────────────────┤
│ Vehicle Registration: *         [___________________________] │
│ (e.g., AB12 CDE)                200pt width                    │
│                                                               │
│ Point of Impact on Other Vehicle:                             │
│   ☐ Front      ☐ Front-Left   ☐ Front-Right                  │
│   ☐ Rear       ☐ Rear-Left    ☐ Rear-Right                   │
│   ☐ Side-Left  ☐ Side-Right   ☐ Multiple areas               │
└───────────────────────────────────────────────────────────────┘
```

**Section 3: Other Driver's Insurance** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ INSURANCE INFORMATION                                       │
├───────────────────────────────────────────────────────────────┤
│ Insurance Company:              [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Policy Holder Name:             [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Policy Number:                  [___________________________] │
│                                 250pt width                    │
│                                                               │
│ Type of Cover:                                                │
│ [▼ Select cover type __________]                              │
│ (Dropdown: Third party, Third party fire & theft, Fully comp)│
└───────────────────────────────────────────────────────────────┘
```

---

### Page 10: Police & Recovery Details

**Section 1: Police Attendance** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ POLICE ATTENDANCE                                           │
├───────────────────────────────────────────────────────────────┤
│ Did police attend the scene? *  ☐ Yes  ☐ No                  │
└───────────────────────────────────────────────────────────────┘
```

**Section 2: Vehicle Recovery** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ RECOVERY INFORMATION (if applicable)                       │
├───────────────────────────────────────────────────────────────┤
│ Recovery Company:               [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Recovery Phone:                 [___________________________] │
│                                 200pt width                    │
│                                                               │
│ Vehicle Recovered To:           [___________________________] │
│                                 300pt width                    │
│                                                               │
│ Additional Recovery Notes:                                    │
│ [___________________________________________________________] │
│ [___________________________________________________________] │
│ 2-line textarea                                               │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 11: Witnesses

**Section 1: Witness Information** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ WITNESS DETAILS                                             │
├───────────────────────────────────────────────────────────────┤
│ Were there witnesses present? *  ☐ Yes  ☐ No  ☐ Unknown      │
│                                                               │
│ Note: Witness contact details collected separately in        │
│ witness table (not part of this PDF form)                    │
└───────────────────────────────────────────────────────────────┘
```

---

### Page 12: Breath Tests

**Section 1: Alcohol Testing** (Cream Gray container)

```
┌───────────────────────────────────────────────────────────────┐
│ ▼ BREATH TEST INFORMATION                                     │
├───────────────────────────────────────────────────────────────┤
│ Did you take a breath test? *    ☐ Yes  ☐ No                 │
│                                                               │
│ Did other driver take a breath test?                          │
│                                  ☐ Yes  ☐ No  ☐ Unknown      │
└───────────────────────────────────────────────────────────────┘
```

---

### Pages 13-17: Supporting Documentation

These pages are reserved for images and supporting documents (not form fields):

**Page 13**: Location photos (uploaded via app, embedded as images)
**Page 14**: Your vehicle damage photos
**Page 15**: Other vehicle damage photos
**Page 16**: Additional evidence photos
**Page 17**: Declaration and signature section (handled separately)

---

## Field Naming Convention

### Exact Field Names (Must Match HTML Forms)

```javascript
// All PDF form field names must match these EXACTLY
const fieldNames = {
  // Page 1
  'accident_date',              // Date picker
  'accident_time',              // Time input
  'your_speed',                 // Number input
  'usual_vehicle',              // Radio group (Yes/No)
  'license_plate',              // Text input
  'location',                   // Textarea (2 lines)
  'what3words',                 // Text input
  'nearestLandmark',            // Text input
  'speed_limit',                // Number input

  // Page 2
  'medical_attention_needed',   // Radio group (Yes/No)
  'medical_ambulance_called',   // Radio group (Yes/No/N/A)
  'medical_hospital_name',      // Text input
  'medical_injury_severity',    // Radio group
  'medical_treatment_received', // Text input
  'medical_symptom_none',       // Checkbox
  'medical_symptom_severe_headache',     // Checkbox
  'medical_symptom_dizziness',           // Checkbox
  'medical_symptom_loss_of_consciousness', // Checkbox
  'medical_symptom_chest_pain',          // Checkbox
  'medical_symptom_breathlessness',      // Checkbox
  'medical_symptom_abdominal_pain',      // Checkbox
  'medical_symptom_abdominal_bruising',  // Checkbox
  'medical_symptom_limb_pain_mobility',  // Checkbox
  'medical_symptom_limb_weakness',       // Checkbox
  'medical_symptom_change_in_vision',    // Checkbox
  'medical_symptom_uncontrolled_bleeding', // Checkbox
  'medical_symptom_life_threatening',    // Checkbox
  'medical_injury_details',     // Textarea (4 lines)
  'final_feeling',              // Textarea (2 lines)

  // Page 3
  'no_damage',                  // Checkbox
  'no_visible_damage',          // Checkbox
  'impact_point',               // Checkbox group
  'damage_description',         // Textarea (5 lines)
  'seatbelts_worn',             // Radio group (Yes/No)
  'airbags_deployed',           // Radio group (Yes/No/Not equipped)
  'vehicle_driveable',          // Radio group (Yes/No/Unknown)

  // Page 4
  'weather_clear',              // Checkbox
  'weather_cloudy',             // Checkbox
  'weather_bright_sunlight',    // Checkbox
  'weather_raining',            // Checkbox
  'weather_drizzle',            // Checkbox
  'weather_heavy_rain',         // Checkbox
  'weather_fog',                // Checkbox
  'weather_snow',               // Checkbox
  'weather_ice',                // Checkbox
  'weather_hail',               // Checkbox
  'weather_windy',              // Checkbox
  'weather_thunder_lightning',  // Checkbox
  'weather_other',              // Checkbox
  'road_condition_dry',         // Checkbox
  'road_condition_wet',         // Checkbox
  'road_condition_icy',         // Checkbox
  'road_condition_snow_covered', // Checkbox
  'road_condition_loose_surface', // Checkbox
  'road_condition_other',       // Checkbox

  // Page 5
  'road_type_motorway',         // Checkbox
  'road_type_a_road',           // Checkbox
  'road_type_b_road',           // Checkbox
  'road_type_urban_street',     // Checkbox
  'road_type_rural_road',       // Checkbox
  'road_type_car_park',         // Checkbox
  'road_type_other',            // Checkbox
  'traffic_conditions_no_traffic', // Checkbox
  'traffic_conditions_light',   // Checkbox
  'traffic_conditions_moderate', // Checkbox
  'traffic_conditions_heavy',   // Checkbox

  // Page 6
  'visibility_good',            // Checkbox
  'visibility_poor',            // Checkbox
  'visibility_very_poor',       // Checkbox
  'visibility_severely_restricted', // Checkbox
  'road_markings_visible_yes',  // Checkbox
  'road_markings_visible_partially', // Checkbox
  'road_markings_visible_no',   // Checkbox
  'visibilityFactors',          // Textarea (2 lines)

  // Page 7
  'junctionType',               // Dropdown
  'junctionControl',            // Dropdown
  'trafficLightStatus',         // Dropdown
  'specialConditions',          // Text input
  'additionalHazards',          // Textarea (2 lines)

  // Page 8
  'accident_narrative',         // Textarea (8 lines)
  'userManoeuvre',              // Dropdown

  // Page 9
  'other_driver_name',          // Text input
  'other_driver_email',         // Text input (email)
  'other_driver_phone',         // Text input (tel)
  'other_driver_license',       // Text input
  'other_license_plate',        // Text input
  'other_point_of_impact',      // Checkbox group
  'other_insurance_company',    // Text input
  'other_policy_holder',        // Text input
  'other_policy_number',        // Text input
  'other_policy_cover',         // Dropdown

  // Page 10
  'police_attended',            // Radio group (Yes/No)
  'recovery_company',           // Text input
  'recovery_phone',             // Text input
  'recovery_location',          // Text input
  'recovery_notes',             // Textarea (2 lines)

  // Page 11
  'witnesses_present',          // Radio group (Yes/No/Unknown)

  // Page 12
  'user-breath-test',           // Radio group (Yes/No)
  'other-breath-test'           // Radio group (Yes/No/Unknown)
};
```

---

## Adobe Acrobat Pro Implementation Guide

### Step-by-Step Instructions

#### Setup (5 minutes)

1. **Open Template**
   - Open `Car-Crash-Lawyer-AI-incident-report-main.pdf` in Adobe Acrobat Pro DC
   - File → Save As → "Car-Crash-Lawyer-AI-Incident-Report-REDESIGN.pdf"

2. **Set Document Properties**
   - File → Properties
   - Title: "Car Crash Lawyer AI - Incident Report"
   - Author: "Car Crash Lawyer AI"
   - Subject: "Legal Incident Report Form"
   - Keywords: "accident, incident, legal, UK"

3. **Enable Form Editing Mode**
   - Tools → Prepare Form
   - Click "Start" to begin adding form fields

#### Page Design (15 minutes per page)

1. **Add Header to All Pages**
   - Tools → Edit PDF → Header & Footer → Add
   - Logo: Insert `public/images/logo.png` (50x50pt, top-left)
   - Title: "CAR CRASH LAWYER AI" (center, Deep Teal #0E7490, 16pt bold)
   - Page number: "Page <<1>> of 17" (top-right, Text Muted #666666, 9pt)

2. **Add Footer to All Pages**
   - Tools → Edit PDF → Header & Footer → Add
   - Text: "Confidential Legal Document • Generated <<date>>" (center, 8pt)
   - Logo: Insert `public/images/car-crash-lawyer-ai-450.webp` (100x28pt, center bottom)

3. **Set Page Background**
   - Tools → Edit PDF → Background → Add
   - Color: Warm Beige (#E8DCC4)
   - Apply to all pages

#### Adding Form Fields (2-3 hours)

**Text Fields:**
```
1. Click "Add Text Field" tool
2. Draw rectangle where field should appear
3. Right-click → Properties:
   - Name: Use exact field name from list above
   - Appearance:
     * Border Color: Dark Gray (#4B5563), 1pt
     * Background Color: Steel Gray (#CFD2D7)
     * Font: Arial, 11pt, Text Dark (#333333)
   - Format: (if applicable)
     * Date fields: Custom format "DD/MM/YYYY"
     * Time fields: Custom format "HH:MM"
   - Actions: None
   - Calculate: None
```

**Checkbox Fields:**
```
1. Click "Add Checkbox Field" tool
2. Draw small square (16x16pt)
3. Right-click → Properties:
   - Name: Use exact field name
   - Check Style: Check
   - Checkbox appearance:
     * Border Color: Dark Gray (#4B5563), 1pt
     * Background Color: Cream Gray (#F5F1E8)
     * Check Color: Success Green (#10b981)
   - Export Value: "true" (for all checkboxes)
```

**Radio Button Groups:**
```
1. Click "Add Radio Button" tool
2. Draw circle for each option
3. Properties (IMPORTANT):
   - Radio Button Choice: Use SAME name for all options in group
   - Export Value: Use DIFFERENT values (e.g., "yes", "no", "unknown")
   - Appearance:
     * Border Color: Dark Gray (#4B5563), 1pt
     * Background Color: Cream Gray (#F5F1E8)
     * Button Style: Circle
```

**Dropdown Fields:**
```
1. Click "Add Dropdown" tool
2. Draw rectangle
3. Properties:
   - Name: Use exact field name
   - Options: Add dropdown values (see dropdown options below)
   - Appearance: Same as text fields
   - Sort items: No (maintain logical order)
```

**Textarea Fields:**
```
1. Use "Add Text Field" tool
2. Draw larger rectangle
3. Properties:
   - Multi-line: Check this box
   - Scroll long text: Check this box
   - Appearance: Same as text fields
```

#### Dropdown Options

**Junction Type:**
```
- T-junction
- Crossroads
- Roundabout
- Mini-roundabout
- Slip road
- Pedestrian crossing
- Not applicable
- Other
```

**Junction Control:**
```
- Traffic lights
- Give way signs
- Stop signs
- Uncontrolled
- Yield lines
- Not applicable
- Other
```

**Traffic Light Status:**
```
- Green
- Amber
- Red
- Flashing amber
- Not working
- Not applicable
```

**Manoeuvre:**
```
- Driving straight ahead
- Turning left
- Turning right
- Overtaking
- Reversing
- Parking
- Pulling out from parked position
- Changing lanes
- Merging
- Slowing down/stopping
- Other
```

**Insurance Cover Type:**
```
- Third party only
- Third party, fire and theft
- Fully comprehensive
- Unknown
```

#### Field Tab Order

**CRITICAL for accessibility:**

1. Tools → Prepare Form
2. Edit → More → Set Tab Order
3. Arrange fields in logical reading order (top to bottom, left to right)
4. Test with Tab key to verify flow

#### Validation & Testing

1. **Required Fields** (mark with asterisk *):
   - Right-click field → Properties → Required
   - Add red asterisk (*) to field label using text tool

2. **Field Validation**:
   - Email fields: Format → Custom → Email
   - Phone fields: Format → Custom → UK phone pattern
   - Date fields: Format → Date → DD/MM/YYYY

3. **Test Form**:
   - Tools → Prepare Form → Preview
   - Fill out all fields
   - Test tab order
   - Verify calculations (if any)
   - Test on mobile (File → Save → Test in Acrobat Reader Mobile)

---

## Quality Checklist

### Before Finalizing

- [ ] All 99 fields added with correct names
- [ ] Header appears on all 17 pages
- [ ] Footer appears on all 17 pages
- [ ] Page background is Warm Beige (#E8DCC4)
- [ ] All colors match design system
- [ ] Field labels use Text Dark (#333333), 11pt
- [ ] Help text uses Text Muted (#666666), 9pt italic
- [ ] All checkboxes are 16x16pt with Success Green (#10b981) checks
- [ ] Text inputs have Steel Gray (#CFD2D7) background
- [ ] Sections have Cream Gray (#F5F1E8) background
- [ ] Borders use Dark Gray (#4B5563), 1pt
- [ ] Tab order is logical and tested
- [ ] Required fields marked with red asterisk (*)
- [ ] All dropdown options added
- [ ] Radio button groups work correctly (only one selectable)
- [ ] Multi-line textareas scroll properly
- [ ] Logo images display correctly
- [ ] PDF generates correctly from database data (test with sample data)

---

## Alternative: Programmatic Approach with Adobe PDF Services API

If you prefer to create the PDF programmatically:

```javascript
// See ADOBE_FORM_FILLING_GUIDE.md for existing implementation
// This spec provides exact field names and coordinates for API calls

const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');

// 1. Create blank PDF with pages
// 2. Add form fields programmatically using coordinates from this spec
// 3. Apply colors and styling
// 4. Save as template

// Example field creation:
const textField = {
  name: 'accident_date',
  type: 'text',
  page: 0,
  bounds: { x: 300, y: 700, width: 150, height: 30 },
  backgroundColor: '#CFD2D7',
  borderColor: '#4B5563',
  font: 'Arial',
  fontSize: 11,
  textColor: '#333333'
};
```

---

## Next Steps

### Week 1: Template Creation
1. ✅ Review this specification
2. ⏳ Open Adobe Acrobat Pro DC
3. ⏳ Set up page backgrounds and headers/footers
4. ⏳ Add all fields from Pages 1-6 (basic info, medical, conditions)

### Week 2: Complete Form Fields
1. ⏳ Add all fields from Pages 7-12 (junction, narrative, other driver, etc.)
2. ⏳ Configure dropdown options
3. ⏳ Set up radio button groups
4. ⏳ Test form functionality

### Week 3: Testing & Refinement
1. ⏳ Test with sample data from database
2. ⏳ Verify all 99 fields populate correctly
3. ⏳ Mobile testing (iOS/Android PDF viewers)
4. ⏳ Accessibility testing (screen readers)
5. ⏳ Print testing (ensure proper printing)

### Week 4: Production Deployment
1. ⏳ Final QA with legal team
2. ⏳ Update PDF generation script (`src/services/adobePdfService.js`)
3. ⏳ Deploy to staging environment
4. ⏳ Deploy to production

---

## Support Resources

- [Adobe Acrobat Pro DC User Guide](https://helpx.adobe.com/acrobat/using/create-fill-pdf-forms.html)
- [Form Field Properties Reference](https://helpx.adobe.com/acrobat/using/form-field-properties.html)
- [PDF Accessibility Guide](https://www.adobe.com/accessibility/pdf/pdf-accessibility-overview.html)
- Internal: `ADOBE_FORM_FILLING_GUIDE.md` - Existing PDF filling implementation
- Internal: `COMPREHENSIVE_FIELD_MAPPING_PLAN.md` - Database integration details

---

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Status**: ✅ Ready for Implementation
**Estimated Implementation Time**: 3-4 weeks (1 week design + 2 weeks testing + 1 week deployment)
