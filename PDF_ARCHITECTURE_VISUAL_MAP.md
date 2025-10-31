# PDF Architecture Visual Map: Field Placement & Structure

**Project**: Car Crash Lawyer AI - PDF Template Field Architecture
**Template**: Car-Crash-Lawyer-AI-Incident-Report.pdf (17 pages, 150+ fields)
**Date**: 2025-10-31
**Purpose**: Visual guide for adding 64+ new fields to PDF template

---

## Table of Contents

1. [PDF Structure Overview](#pdf-structure-overview)
2. [Page-by-Page Field Layout](#page-by-page-field-layout)
3. [New Field Placement Strategy](#new-field-placement-strategy)
4. [Field Type Legend](#field-type-legend)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Implementation Checklist](#implementation-checklist)

---

## PDF Structure Overview

### 17-Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Car Crash Lawyer AI - Legal Incident Report (17 Pages)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 PAGE 1:  Cover Page & User Information                 │
│  📄 PAGE 2:  Medical Condition (Immediate)                 │ ← NEW FIELDS
│  📄 PAGE 3:  Medical Details & Symptoms                    │ ← NEW FIELDS
│  📄 PAGE 4:  Accident Location & Time                      │ ← NEW FIELDS
│  📄 PAGE 5:  Location Details & Photos                     │ ← NEW FIELDS
│  📄 PAGE 6:  Accident Narrative                            │
│  📄 PAGE 7:  Weather Conditions                            │ ← NEW FIELDS
│  📄 PAGE 8:  Road Conditions & Environment                 │ ← NEW FIELDS
│  📄 PAGE 9:  Junction & Traffic Details                    │ ← NEW FIELDS
│  📄 PAGE 10: Your Vehicle Information                      │ ← NEW FIELDS
│  📄 PAGE 11: Vehicle Damage & Recovery                     │ ← NEW FIELDS
│  📄 PAGE 12: Vehicle Photos                                │
│  📄 PAGE 13: Other Driver Information                      │ ← NEW FIELDS
│  📄 PAGE 14: Other Vehicle Details                         │ ← NEW FIELDS
│  📄 PAGE 15: Witness Information                           │
│  📄 PAGE 16: Police Details                                │
│  📄 PAGE 17: Declaration & Signature                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Field Distribution Statistics

| Category | Existing Fields | New Fields | Total |
|----------|----------------|------------|-------|
| Medical | ~15 | **+9** | 24 |
| Location | ~5 | **+3** | 8 |
| Weather | ~12 | **+5** | 17 |
| Road Conditions | ~6 | **+4** | 10 |
| Road Type | 1 | **+7** | 8 |
| Traffic | 0 | **+4** | 4 |
| Visibility | 0 | **+8** | 8 |
| Junction | ~4 | **+3** | 7 |
| Vehicle | ~10 | **+8** | 18 |
| Other Driver | ~10 | **+4** | 14 |
| **TOTAL** | **~63** | **+64** | **127** |

---

## Page-by-Page Field Layout

### 📄 PAGE 1: Cover Page & User Information

```
┌─────────────────────────────────────────────────────────────┐
│                    CAR CRASH LAWYER AI                      │
│                 Legal Incident Report                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ USER INFORMATION (from user_signup table)           │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Name:          [________________________]          │  │
│  │ ☑ Email:         [________________________]          │  │
│  │ ☑ Phone:         [________________________]          │  │
│  │ ☑ Address:       [________________________]          │  │
│  │                  [________________________]          │  │
│  │ ☑ Postcode:      [________]                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ VEHICLE INFORMATION                                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Registration:  [________________________]          │  │
│  │ ☑ Make:          [________________________]          │  │
│  │ ☑ Model:         [________________________]          │  │
│  │ ☑ Color:         [________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ INSURANCE INFORMATION                                │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Company:       [________________________]          │  │
│  │ ☑ Policy Number: [________________________]          │  │
│  │ ☑ Policy Holder: [________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Page 1 unchanged)
```

---

### 📄 PAGE 2: Medical Condition (Immediate Assessment)

```
┌─────────────────────────────────────────────────────────────┐
│                    MEDICAL ASSESSMENT                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ IMMEDIATE MEDICAL STATUS                             │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Did you need medical attention?                   │  │ ← NEW
│  │    ☐ Yes  ☐ No                                       │  │
│  │                                                       │  │
│  │ ☑ Was an ambulance called?                          │  │ ← NEW
│  │    ☐ Yes  ☐ No  ☐ Not needed                        │  │
│  │                                                       │  │
│  │ ☑ Injury Severity:                                   │  │ ← NEW
│  │    ☐ None     ☐ Minor    ☐ Moderate                 │  │
│  │    ☐ Severe   ☐ Life-threatening                    │  │
│  │                                                       │  │
│  │ ☑ Hospital Name (if attended):                      │  │ ← NEW
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Treatment Received:                                │  │ ← NEW
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ HOW DO YOU FEEL NOW?                                 │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Current Feeling:                                   │  │ ← NEW
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 6
   - medical_attention_needed
   - medical_ambulance_called
   - medical_injury_severity
   - medical_hospital_name
   - medical_treatment_received
   - final_feeling
```

---

### 📄 PAGE 3: Medical Details & Symptoms

```
┌─────────────────────────────────────────────────────────────┐
│                    MEDICAL SYMPTOMS                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SYMPTOMS CHECKLIST (Check all that apply)           │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  Critical Symptoms:                                  │  │
│  │  ☐ Loss of consciousness                            │  │
│  │  ☐ Uncontrolled bleeding                            │  │
│  │  ☐ Severe headache                                  │  │
│  │  ☐ Life-threatening condition          ← NEW        │  │
│  │                                                       │  │
│  │  Chest & Breathing:                                  │  │
│  │  ☐ Chest pain                                        │  │
│  │  ☐ Breathlessness                                    │  │
│  │                                                       │  │
│  │  Vision & Head:                                      │  │
│  │  ☐ Change in vision                                  │  │
│  │  ☐ Dizziness                               ← NEW    │  │
│  │                                                       │  │
│  │  Body Pain:                                          │  │
│  │  ☐ Abdominal pain                                    │  │
│  │  ☐ Abdominal bruising                                │  │
│  │  ☐ Limb pain/mobility issues                        │  │
│  │  ☐ Limb weakness                                     │  │
│  │                                                       │  │
│  │  ☐ None of these symptoms                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ INJURY DETAILS                                       │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Describe your injuries in detail:                 │  │ ← NEW
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 3
   - medical_symptom_life_threatening (checkbox)
   - medical_symptom_dizziness (checkbox)
   - medical_injury_details (textarea)

✅ EXISTING FIELDS: 11 symptom checkboxes (consolidated to array)
```

---

### 📄 PAGE 4: Accident Location & Time

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCIDENT DETAILS                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WHEN DID IT HAPPEN?                                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Date:  [___/___/______]  (DD/MM/YYYY)            │  │
│  │ ☑ Time:  [___:___]  ☐ AM  ☐ PM                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WHERE DID IT HAPPEN?                                 │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Full Address:                                      │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ what3words Location:                    ← NEW     │  │
│  │    [_______._______.________]                        │  │
│  │    (3 words separated by dots)                       │  │
│  │                                                       │  │
│  │ ☑ Nearest Landmark:                        ← NEW     │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Additional Hazards Present:              ← NEW     │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ JUNCTION INFORMATION                                 │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Junction Type:                                     │  │
│  │    ☐ T-junction    ☐ Crossroads   ☐ Roundabout     │  │
│  │    ☐ Slip road     ☐ Mini-roundabout  ☐ None       │  │
│  │                                                       │  │
│  │ ☑ Junction Control:                        ← NEW     │  │
│  │    ☐ Traffic lights  ☐ Give way  ☐ Stop sign       │  │
│  │    ☐ Roundabout     ☐ Priority   ☐ None            │  │
│  │                                                       │  │
│  │ ☑ Traffic Light Status (if applicable):   ← NEW     │  │
│  │    ☐ Red  ☐ Amber  ☐ Green  ☐ Not working          │  │
│  │                                                       │  │
│  │ ☑ Your Manoeuvre:                          ← NEW     │  │
│  │    ☐ Going straight  ☐ Turning left  ☐ Turning right│  │
│  │    ☐ Overtaking      ☐ Changing lanes  ☐ Reversing │  │
│  │    ☐ Parked          ☐ Waiting to go                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 6
   - what3words (text)
   - nearestLandmark (text)
   - additionalHazards (textarea)
   - junctionControl (select)
   - trafficLightStatus (select)
   - userManoeuvre (select)
```

---

### 📄 PAGE 5: Location Photos & Map

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCATION EVIDENCE                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SCENE OVERVIEW PHOTOS                                │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  [         Photo 1: Scene Overview         ]         │  │
│  │                                                       │  │
│  │  [         Photo 2: Another Angle          ]         │  │
│  │                                                       │  │
│  │  [      Photo 3: Road Markings/Signs       ]         │  │
│  │                                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ MAP LOCATION (what3words)                            │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  [          Map Screenshot/Image            ]         │  │
│  │                                                       │  │
│  │  Generated from: what3words location above           │  │
│  │                                                       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Photo pages unchanged)
```

---

### 📄 PAGE 6: Accident Narrative

```
┌─────────────────────────────────────────────────────────────┐
│                 DETAILED ACCOUNT OF ACCIDENT                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WHAT HAPPENED?                                       │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Please describe exactly what happened:            │  │
│  │                                                       │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │  Include:                                            │  │
│  │  • What you were doing before impact                 │  │
│  │  • What the other driver was doing                   │  │
│  │  • Speed estimates                                   │  │
│  │  • Who had right of way                              │  │
│  │  • Any signals/indicators used                       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Narrative page unchanged)
```

---

### 📄 PAGE 7: Weather Conditions

```
┌─────────────────────────────────────────────────────────────┐
│                    WEATHER CONDITIONS                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WEATHER AT TIME OF ACCIDENT (Check all that apply)  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  General Conditions:                                 │  │
│  │  ☐ Clear weather                                     │  │
│  │  ☐ Bright sunlight                                   │  │
│  │  ☐ Cloudy/Overcast                                   │  │
│  │  ☐ Dusk/Dawn                                         │  │
│  │                                                       │  │
│  │  Rain Conditions:                                    │  │
│  │  ☐ Light rain/drizzle                    ← NEW      │  │
│  │  ☐ Raining                                           │  │
│  │  ☐ Heavy rain                                        │  │
│  │  ☐ Wet road surface                                  │  │
│  │                                                       │  │
│  │  Severe Weather:                                     │  │
│  │  ☐ Fog                                               │  │
│  │  ☐ Snow falling                                      │  │
│  │  ☐ Snow on road                                      │  │
│  │  ☐ Ice on road                                       │  │
│  │  ☐ Hail                                   ← NEW      │  │
│  │  ☐ Thunder/Lightning                      ← NEW      │  │
│  │                                                       │  │
│  │  Wind:                                               │  │
│  │  ☐ Windy conditions                       ← NEW      │  │
│  │                                                       │  │
│  │  Lighting:                                           │  │
│  │  ☐ Street lights on                                  │  │
│  │  ☐ Bright daylight                                   │  │
│  │                                                       │  │
│  │  ☐ Other (specify): [________________]    ← NEW      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ☑ Array Storage: weather_conditions[]                   │  │
│     (All checked items stored as PostgreSQL array)        │  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 5 checkboxes
   - weather_drizzle
   - weather_hail
   - weather_thunder_lightning
   - weather_windy
   - weather_other

✅ EXISTING FIELDS: 12 checkboxes (now stored as array)
```

---

### 📄 PAGE 8: Road Conditions & Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    ROAD CONDITIONS                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ROAD SURFACE (Check all that apply)                 │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  ☐ Dry                                   ← NEW      │  │
│  │  ☐ Wet                                               │  │
│  │  ☐ Icy                                   ← NEW      │  │
│  │  ☐ Snow covered                                      │  │
│  │  ☐ Loose surface (gravel, mud)           ← NEW      │  │
│  │  ☐ Other: [_______________]              ← NEW      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ROAD TYPE (Check primary type)          ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  ☐ Motorway (M1, M25, etc.)                         │  │
│  │  ☐ A-Road (dual/single carriageway)                 │  │
│  │  ☐ B-Road (secondary route)                         │  │
│  │  ☐ Urban street (city/town)                         │  │
│  │  ☐ Rural road (country lane)                        │  │
│  │  ☐ Car park                                          │  │
│  │  ☐ Other: [_______________]                         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ TRAFFIC CONDITIONS                       ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  ☐ Heavy traffic (congested)                        │  │
│  │  ☐ Moderate traffic                                  │  │
│  │  ☐ Light traffic                                     │  │
│  │  ☐ No other traffic                                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ VISIBILITY                               ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  General Visibility:                                 │  │
│  │  ☐ Good visibility (clear)                          │  │
│  │  ☐ Poor visibility (reduced)                        │  │
│  │  ☐ Very poor visibility (significantly reduced)     │  │
│  │  ☐ Severely restricted (near zero)                  │  │
│  │                                                       │  │
│  │  Visibility Factors (Check all that apply):         │  │
│  │  ☐ Sun glare                                         │  │
│  │  ☐ Rain on windscreen                                │  │
│  │  ☐ Dirt/debris on windscreen                        │  │
│  │  ☐ Fogged windows                                    │  │
│  │  ☐ Obstructed view (trees, buildings, etc.)         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ROAD MARKINGS                            ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  Were road markings visible?                        │  │
│  │  ☐ Yes - clearly visible                            │  │
│  │  ☐ Partially - faded or unclear                     │  │
│  │  ☐ No - not visible or not present                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SPEED                                                │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  ☑ Your Speed: [___] mph                 ← NEW      │  │
│  │  ☑ Speed Limit: [___] mph                           │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 22 total
   Road Conditions: 4 checkboxes (dry, icy, loose_surface, other)
   Road Types: 7 checkboxes (entire new section)
   Traffic: 4 checkboxes (entire new section)
   Visibility: 8 checkboxes (entire new section)
   Road Markings: 3 checkboxes (entire new section)
   Speed: 1 text field (your_speed)
```

---

### 📄 PAGE 9: Junction & Special Conditions

```
┌─────────────────────────────────────────────────────────────┐
│               JUNCTION & SPECIAL CONDITIONS                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ JUNCTION DETAILS (Continued from Page 4)            │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  • Junction type, control, traffic lights covered   │  │
│  │  • User manoeuvre covered on Page 4                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SPECIAL CONDITIONS                       ← ENHANCED  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  (Check all that apply)                              │  │
│  │                                                       │  │
│  │  ☐ Animals on/near road                             │  │
│  │  ☐ Roadworks                                         │  │
│  │  ☐ Defective road surface                           │  │
│  │  ☐ Oil spill/debris                                  │  │
│  │  ☐ Road workers present                              │  │
│  │  ☐ Cyclists in road                      ← NEW      │  │
│  │  ☐ Pedestrians in road                   ← NEW      │  │
│  │  ☐ Traffic calming (speed bumps)         ← NEW      │  │
│  │  ☐ Parked vehicles narrowing road        ← NEW      │  │
│  │  ☐ Pedestrian crossing                   ← NEW      │  │
│  │  ☐ School zone                            ← NEW      │  │
│  │  ☐ Narrow road                            ← NEW      │  │
│  │  ☐ Poor/missing signage                   ← NEW      │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 8 checkboxes (special_conditions expanded)
   - cyclists_in_road
   - pedestrians_in_road
   - traffic_calming
   - parked_vehicles
   - pedestrian_crossing
   - school_zone
   - narrow_road
   - poor_signage

✅ EXISTING FIELDS: 5 special condition checkboxes
```

---

### 📄 PAGE 10: Your Vehicle Information

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR VEHICLE                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ VEHICLE DETAILS                                      │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Registration: [______________]                     │  │
│  │ ☑ Make:         [______________]                     │  │
│  │ ☑ Model:        [______________]                     │  │
│  │                                                       │  │
│  │ ☑ Is this your usual vehicle?           ← NEW       │  │
│  │    ☐ Yes  ☐ No                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SAFETY EQUIPMENT                                     │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Were seatbelts worn?                               │  │
│  │    ☐ Yes - driver  ☐ Yes - all passengers           │  │
│  │    ☐ No                                              │  │
│  │                                                       │  │
│  │ ☑ Did airbags deploy?                                │  │
│  │    ☐ Yes  ☐ No  ☐ No airbags fitted                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ IMPACT DETAILS                           ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Point of Impact (Check all that apply):           │  │
│  │                                                       │  │
│  │    ☐ Front           ☐ Rear                         │  │
│  │    ☐ Left side       ☐ Right side                   │  │
│  │    ☐ Front-left corner   ☐ Front-right corner       │  │
│  │    ☐ Rear-left corner    ☐ Rear-right corner        │  │
│  │    ☐ Roof            ☐ Underside                    │  │
│  │    ☐ Multiple points                                 │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 2
   - usual_vehicle (yes/no)
   - impact_point (11 checkboxes stored as array)
```

---

### 📄 PAGE 11: Vehicle Damage & Recovery

```
┌─────────────────────────────────────────────────────────────┐
│                 VEHICLE DAMAGE & RECOVERY                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DAMAGE ASSESSMENT                                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Is your vehicle driveable?            ← NEW       │  │
│  │    ☐ Yes - can drive away                           │  │
│  │    ☐ No - needs recovery                            │  │
│  │    ☐ Unsure                                          │  │
│  │                                                       │  │
│  │ ☑ Damage present?                                    │  │
│  │    ☐ Yes (describe below)                           │  │
│  │    ☐ No visible damage                   ← NEW      │  │
│  │                                                       │  │
│  │ ☑ Damage Description:                                │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ RECOVERY INFORMATION                     ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Recovery Company Name:                            │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Recovery Phone Number:                            │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Vehicle Recovered To:                             │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Recovery Notes:                                    │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 6
   - vehicle_driveable (yes/no)
   - no_damage (checkbox)
   - recovery_company (text)
   - recovery_phone (text)
   - recovery_location (text)
   - recovery_notes (textarea)
```

---

### 📄 PAGE 12: Vehicle Damage Photos

```
┌─────────────────────────────────────────────────────────────┐
│                    VEHICLE DAMAGE PHOTOS                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ YOUR VEHICLE PHOTOS                                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │  [     Photo 1: Overall vehicle damage     ]         │  │
│  │                                                       │  │
│  │  [     Photo 2: Close-up of damage         ]         │  │
│  │                                                       │  │
│  │  [     Photo 3: Another angle              ]         │  │
│  │                                                       │  │
│  │  [     Photo 4: Registration plate visible ]         │  │
│  │                                                       │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Photo pages unchanged)
```

---

### 📄 PAGE 13: Other Driver Information

```
┌─────────────────────────────────────────────────────────────┐
│                    OTHER DRIVER DETAILS                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DRIVER INFORMATION                                   │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Full Name:                                         │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Email Address:                         ← NEW      │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Phone Number:                                      │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Address:                                           │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Driving License Number:                ← NEW      │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ INSURANCE DETAILS                                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Insurance Company:                                 │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Policy Number:                                     │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Policy Holder:                                     │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Policy Cover Type:                                 │  │
│  │    ☐ Third Party  ☐ Third Party Fire & Theft        │  │
│  │    ☐ Comprehensive  ☐ Unknown                        │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 2 ⭐ CRITICAL
   - other_driver_email (text)
   - other_driver_license (text)
```

---

### 📄 PAGE 14: Other Vehicle Details & DVLA Data

```
┌─────────────────────────────────────────────────────────────┐
│                    OTHER VEHICLE DETAILS                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ VEHICLE INFORMATION                                  │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Registration:     [______________]                 │  │
│  │ ☑ Make:             [______________]                 │  │
│  │ ☑ Model:            [______________]                 │  │
│  │ ☑ Color:            [______________]                 │  │
│  │                                                       │  │
│  │ ☑ No visible damage?                     ← NEW      │  │
│  │    ☐ Yes - no damage visible                        │  │
│  │    ☐ No - damage present                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DAMAGE & IMPACT                                      │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Point of Impact on Other Vehicle:     ← NEW      │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Damage Description:                                │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DVLA VEHICLE DATA (Auto-populated)       ← NEW SECTION│  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ MOT Status:        [______________]                │  │
│  │ ☑ MOT Expiry Date:   [___/___/______]               │  │
│  │ ☑ Tax Status:        [______________]                │  │
│  │ ☑ Tax Due Date:      [___/___/______]               │  │
│  │ ☑ Fuel Type:         [______________]                │  │
│  │ ☑ Engine Capacity:   [______________]                │  │
│  │                                                       │  │
│  │ Data retrieved from DVLA database on:                │  │
│  │ [___/___/______ at __:__]                            │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

🆕 NEW FIELDS: 9 (7 DVLA fields + 2 damage fields)
   - no_visible_damage (checkbox)
   - other_point_of_impact (text)
   - mot_status (text - from DVLA API)
   - mot_expiry_date (date - from DVLA API)
   - tax_status (text - from DVLA API)
   - tax_due_date (date - from DVLA API)
   - fuel_type (text - from DVLA API)
   - engine_capacity (text - from DVLA API)
```

---

### 📄 PAGE 15: Witness Information

```
┌─────────────────────────────────────────────────────────────┐
│                    WITNESS INFORMATION                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WITNESSES PRESENT?                                   │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Were there any witnesses?                          │  │
│  │    ☐ Yes  ☐ No  ☐ Unknown                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WITNESS 1                                            │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Name:    [_______________________________]         │  │
│  │ ☑ Phone:   [_______________________________]         │  │
│  │ ☑ Email:   [_______________________________]         │  │
│  │ ☑ Address: [_______________________________]         │  │
│  │            [_______________________________]         │  │
│  │                                                       │  │
│  │ ☑ Statement:                                         │  │
│  │    [_______________________________________]          │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WITNESS 2                                            │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ (Same fields as Witness 1)                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Note: Additional witnesses stored in incident_witnesses  │  │
│        table (separate repeating section)                 │  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Witness table schema already complete)
```

---

### 📄 PAGE 16: Police Details

```
┌─────────────────────────────────────────────────────────────┐
│                    POLICE INFORMATION                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ POLICE ATTENDANCE                                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Did police attend the scene?                       │  │
│  │    ☐ Yes  ☐ No  ☐ Called but didn't attend          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ POLICE DETAILS (if attended)                        │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Accident Reference Number:                         │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Officer Name:                                      │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Officer Badge Number:                              │  │
│  │    [_______________________________________]          │  │
│  │                                                       │  │
│  │ ☑ Police Force:                                      │  │
│  │    [_______________________________________]          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ BREATH TEST                                          │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ ☑ Were you breath tested?                            │  │
│  │    ☐ Yes - passed  ☐ Yes - failed  ☐ No             │  │
│  │                                                       │  │
│  │ ☑ Was other driver breath tested?                    │  │
│  │    ☐ Yes - passed  ☐ Yes - failed  ☐ No             │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Police section unchanged)
```

---

### 📄 PAGE 17: Declaration & Signature

```
┌─────────────────────────────────────────────────────────────┐
│                    LEGAL DECLARATION                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ DECLARATION                                          │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │ I declare that the information provided in this      │  │
│  │ report is true and accurate to the best of my       │  │
│  │ knowledge. I understand that providing false         │  │
│  │ information may constitute fraud and could affect    │  │
│  │ my insurance claim.                                  │  │
│  │                                                       │  │
│  │ ☐ I agree to the above declaration                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ SIGNATURE                                            │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │                                                       │  │
│  │ Signature: [_____________________________]           │  │
│  │                                                       │  │
│  │ Print Name: [____________________________]           │  │
│  │                                                       │  │
│  │ Date: [___/___/______]                               │  │
│  │                                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ REPORT GENERATION                                    │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │ This report was generated by:                        │  │
│  │ Car Crash Lawyer AI System                           │  │
│  │                                                       │  │
│  │ Generated on: [___/___/______ at __:__]              │  │
│  │ Report ID: [_____________________________]           │  │
│  │                                                       │  │
│  │ 🤖 Generated with Claude Code AI                     │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

✅ NO NEW FIELDS (Declaration page unchanged)
```

---

## New Field Placement Strategy

### Priority Placement Matrix

| Page | Section | New Fields | Priority | Implementation |
|------|---------|------------|----------|----------------|
| 2 | Medical Immediate | 6 fields | 🔴 HIGH | Add above existing symptoms |
| 3 | Medical Symptoms | 3 fields | 🔴 HIGH | Add to checkbox grid |
| 4 | Location Details | 6 fields | 🔴 HIGH | Add after address |
| 7 | Weather | 5 checkboxes | 🟡 MEDIUM | Add to existing grid |
| 8 | Road Conditions | 22 fields | 🟠 HIGH | New sections required |
| 9 | Special Conditions | 8 checkboxes | 🟡 MEDIUM | Expand existing grid |
| 10 | Vehicle Info | 2 fields | 🔴 HIGH | Add before safety |
| 11 | Recovery | 6 fields | 🟠 HIGH | New section required |
| 13 | Other Driver | 2 fields | 🔴 HIGH | Add after phone |
| 14 | Other Vehicle DVLA | 9 fields | 🟠 HIGH | New section required |

### Space Requirements

**Pages Requiring Significant Expansion**:
- **Page 8**: Add 3 new sections (road types, traffic, visibility) - may need to split into 2 pages
- **Page 11**: Add recovery section - adequate space available
- **Page 14**: Add DVLA section - may need new page for comprehensive DVLA data

**Recommended Page Restructure**:
```
Option A: Keep 17 pages (tight layout)
Option B: Expand to 19 pages (comfortable spacing)
  → Split Page 8 into 8a (road conditions) and 8b (traffic/visibility)
  → Add Page 14a for comprehensive DVLA data display
```

---

## Field Type Legend

### Visual Indicators in PDF

```
┌─────────────────────────────────────────────────────────┐
│  FIELD TYPE LEGEND                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ☑ [________________]  = Text Field                    │
│                                                         │
│  ☐ Checkbox           = Boolean Checkbox               │
│                                                         │
│  ☑ Dropdown ▼         = Select Dropdown                │
│                                                         │
│  [___/___/______]     = Date Field (DD/MM/YYYY)        │
│                                                         │
│  [__:__]              = Time Field (24hr)              │
│                                                         │
│  [_____________]      = Multi-line Text Area           │
│  [_____________]                                        │
│  [_____________]                                        │
│                                                         │
│  [   Photo   ]        = Image Placeholder              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Color Coding for Implementation

```
🔴 HIGH PRIORITY (Implement First)
   - Medical fields
   - Location fields (what3words)
   - Other driver email/license ⭐
   - Vehicle driveable status

🟠 MEDIUM-HIGH PRIORITY
   - Road type expansion (7 fields)
   - Traffic conditions (new)
   - Visibility levels (new)
   - Recovery information
   - DVLA fields

🟡 MEDIUM PRIORITY
   - Weather enhancements (5 fields)
   - Road markings visibility
   - Special conditions expansion

🟢 LOW PRIORITY
   - Additional hazards (textarea)
   - Recovery notes (optional)
   - Visibility factors (nice-to-have)
```

---

## Data Flow Architecture

### HTML Form → Database → PDF Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA FLOW DIAGRAM                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│ HTML FORMS   │  99 unique fields across 16 pages
│ (16 pages)   │  Checkbox groups + Single values
└──────┬───────┘
       │
       │ User submits form
       ↓
┌──────────────┐
│  FRONTEND    │  • localStorage persistence
│  CONTROLLER  │  • Field validation
└──────┬───────┘  • Image uploads
       │
       │ POST /api/incident-reports
       ↓
┌──────────────┐
│  BACKEND     │  groupCheckboxFields()
│  CONTROLLER  │  • weather_raining → weather_conditions[]
└──────┬───────┘  • traffic_heavy → traffic_conditions[]
       │          • Validate arrays
       │
       │ Insert into Supabase
       ↓
┌──────────────────────────────────────────────────────────┐
│  POSTGRESQL DATABASE                                     │
├──────────────────────────────────────────────────────────┤
│  incident_reports:                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ • weather_conditions: TEXT[]                       │ │
│  │   = ['raining', 'windy', 'fog']                    │ │
│  │                                                     │ │
│  │ • traffic_conditions: TEXT[]                       │ │
│  │   = ['heavy']                                      │ │
│  │                                                     │ │
│  │ • what3words: TEXT                                 │ │
│  │   = 'table.lamp.chair'                             │ │
│  │                                                     │ │
│  │ • recovery_company: TEXT                           │ │
│  │   = 'AA Recovery'                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  incident_other_vehicles:                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ • driver_email: TEXT                               │ │
│  │ • driver_license: TEXT                             │ │
│  │ • mot_status: TEXT (from DVLA API)                 │ │
│  │ • fuel_type: TEXT (from DVLA API)                  │ │
│  └────────────────────────────────────────────────────┘ │
└──────┬───────────────────────────────────────────────────┘
       │
       │ User requests PDF
       ↓
┌──────────────┐
│ PDF SERVICE  │  expandArrayToPdfCheckboxes()
│              │  • weather_conditions[] → weather_raining ✓
└──────┬───────┘  • weather_conditions[] → weather_windy ✓
       │          • what3words → PDF text field
       │
       │ Adobe PDF Services API
       ↓
┌──────────────────────────────────────────────────────────┐
│  PDF TEMPLATE (17 pages)                                 │
├──────────────────────────────────────────────────────────┤
│  Page 2:  ☑ medical_hospital_name = "St Thomas"         │
│  Page 4:  ☑ what3words = "table.lamp.chair"             │
│  Page 7:  ☑ weather_raining = ✓ (from array)            │
│           ☑ weather_windy = ✓ (from array)              │
│  Page 8:  ☑ traffic_conditions_heavy = ✓ (from array)   │
│  Page 11: ☑ recovery_company = "AA Recovery"            │
│  Page 13: ☑ other_driver_email = "john@example.com"     │
│  Page 14: ☑ mot_status = "Valid"                        │
└──────┬───────────────────────────────────────────────────┘
       │
       │ Generate PDF
       ↓
┌──────────────┐
│ FINAL PDF    │  Compressed, signed, emailed to user
│ (17 pages)   │  Stored in Supabase Storage
└──────────────┘  Legal document ready for lawyer
```

### Array → Checkbox Expansion (Critical Mapping)

```
DATABASE ARRAY                     PDF CHECKBOXES
═══════════════                    ══════════════

weather_conditions: [              ☑ weather_raining
  'raining',          ────────────→☑ weather_windy
  'windy',            ────────────→☑ weather_fog
  'fog'               ────────────→☐ weather_snow
]                                   ☐ weather_clear
                                    ☐ weather_overcast

traffic_conditions: [              ☑ traffic_conditions_heavy
  'heavy'             ────────────→☐ traffic_conditions_moderate
]                                   ☐ traffic_conditions_light
                                    ☐ traffic_conditions_no_traffic

visibility_levels: [               ☐ visibility_good
  'poor',             ────────────→☑ visibility_poor
  'very_poor'         ────────────→☑ visibility_very_poor
]                                   ☐ visibility_severely_restricted

road_types: [                      ☐ road_type_motorway
  'urban_street'      ────────────→☑ road_type_urban_street
]                                   ☐ road_type_a_road
                                    ☐ road_type_b_road
```

---

## Implementation Checklist

### Phase 1: PDF Template Analysis ✅
- [x] Create extract-pdf-fields.js script
- [ ] Run extraction on incident report template
- [ ] Run extraction on witness/vehicle template
- [ ] Generate missing fields report
- [ ] Document existing field names and pages

### Phase 2: PDF Template Modification 🔄
- [ ] Open template in Adobe Acrobat Pro
- [ ] Add 64 new form fields to appropriate pages
- [ ] Set field properties (type, required, validation)
- [ ] Test field visibility and spacing
- [ ] Export updated template
- [ ] Verify field extraction works

### Phase 3: Field Mapping Code 📝
- [x] Create fieldMapper.js utility (groupCheckboxFields)
- [x] Create expandArrayToPdfCheckboxes function
- [ ] Update pdfService.js with new mappings
- [ ] Add validation for new field types
- [ ] Test array expansion logic

### Phase 4: Testing 🧪
- [ ] Test HTML form submission with all fields
- [ ] Verify database arrays populated correctly
- [ ] Generate test PDF with new fields
- [ ] Verify all checkboxes map correctly
- [ ] Test with edge cases (empty arrays, special chars)

### Phase 5: Documentation 📚
- [x] Create visual architecture map (THIS DOCUMENT)
- [x] Create comprehensive field mapping plan
- [ ] Update API documentation
- [ ] Create PDF field naming conventions guide
- [ ] Document testing procedures

---

## Summary Statistics

### Field Count Summary

| Category | Existing | New | Total | Storage Type |
|----------|----------|-----|-------|--------------|
| **Medical** | 15 | 9 | 24 | Mixed (6 text + 18 array) |
| **Location** | 5 | 3 | 8 | Text fields |
| **Weather** | 12 | 5 | 17 | Array (1 column) |
| **Road Conditions** | 6 | 4 | 10 | Array (1 column) |
| **Road Types** | 1 | 7 | 8 | Array (1 column) |
| **Traffic** | 0 | 4 | 4 | Array (1 column) |
| **Visibility** | 0 | 8 | 8 | Arrays (2 columns) |
| **Road Markings** | 0 | 3 | 3 | Array (1 column) |
| **Junction** | 4 | 3 | 7 | Text fields |
| **Speed** | 1 | 1 | 2 | Text fields |
| **Vehicle** | 10 | 8 | 18 | Mixed (7 text + 11 array) |
| **Other Driver** | 10 | 4 | 14 | Text fields |
| **Other Vehicle DVLA** | 4 | 9 | 13 | Text fields |
| **Special Conditions** | 5 | 8 | 13 | Array (1 column) |
| **TOTALS** | **73** | **76** | **149** | **35 new columns** |

### Database Impact

- **New Columns Needed**: 35
  - 25 single-value (TEXT, BOOLEAN, DATE)
  - 10 arrays (TEXT[])
- **Tables Modified**: 2
  - incident_reports (+35 columns)
  - incident_other_vehicles (+9 columns)
- **Old Columns to Archive**: ~38 boolean columns (consolidated to arrays)
- **Net Column Change**: -3 columns (cleaner schema!)

### PDF Template Impact

- **Pages with New Fields**: 9 of 17 pages
- **Pages Requiring New Sections**: 4 (pages 8, 11, 14)
- **Potential New Pages**: 2 (if expanded layout chosen)
- **Total PDF Fields After**: ~149 fields (from 73)
- **Checkbox Expansion**: 1 array → 3-11 PDF checkboxes each

---

## Next Actions

1. **Run PDF Field Extraction** 🔴 CRITICAL
   ```bash
   node scripts/extract-pdf-fields.js
   ```

2. **Review Extracted Fields** against this visual map

3. **Begin PDF Template Modifications** in Adobe Acrobat Pro
   - Start with HIGH PRIORITY pages (2, 4, 13)
   - Add field naming conventions from this document
   - Test field extraction after each section

4. **Implement Database Migrations** per COMPREHENSIVE_FIELD_MAPPING_PLAN.md

5. **Update Controllers** with array grouping logic

6. **Test End-to-End** with complete form submission → PDF generation

---

**Document Created**: 2025-10-31
**Purpose**: Visual guide for 64+ new PDF field placements
**Related Documents**:
- COMPREHENSIVE_FIELD_MAPPING_PLAN.md (implementation guide)
- SCHEMA_ANALYSIS_SUMMARY.md (database structure)
- MCP_VERIFICATION_REPORT.md (tools verification)

---

*This visual architecture map provides a page-by-page breakdown of the PDF template structure, showing exactly where each of the 64+ new fields will be placed, how they map from HTML forms through the database to the final PDF document.*
