# Test Incident Report Scenarios

**Purpose:** Comprehensive test data for end-to-end testing of the Car Crash Lawyer AI system
**Created:** 2025-10-21
**Use Cases:** Transcription testing, PDF generation, full UI testing

---

## Scenario 1: Simple Rear-End Collision (M25)

### Audio Transcription Narrative

> "Right, so this happened about 2 hours ago on the M25 near Junction 15. I was driving along in the middle lane, doing about 60 miles per hour, traffic was quite heavy. The weather was clear, dry roads, good visibility. I noticed the brake lights ahead and started slowing down, but the car behind me just ploughed straight into the back of me. Massive jolt, my head snapped forward against the headrest, thank God for that. The other driver got out and admitted he was looking at his phone, didn't see me braking. He's apologised profusely. My boot is completely crumpled in, rear lights are smashed. His front bumper is hanging off. No one else was hurt, just me with a bit of whiplash. We exchanged details, took photos. Police weren't called as it seemed straightforward. I've got his insurance details - he's with Admiral. My neck is quite sore now, might need to see a doctor."

### User Signup Data (Typeform 1)

```javascript
{
  // Personal Information
  full_name: "James Mitchell",
  email: "james.mitchell@email.co.uk",
  phone: "07700900123",
  date_of_birth: "1985-03-15",
  address_line_1: "42 Oakwood Avenue",
  address_line_2: "",
  city: "St Albans",
  county: "Hertfordshire",
  postcode: "AL1 3RQ",

  // Vehicle Information
  car_registration_number: "BF19 XYZ",
  car_make: "Ford",
  car_model: "Focus",
  car_colour: "Blue",
  car_year: "2019",

  // Driver Information
  driving_license_number: "MITCH803159JM9BN",
  years_driving_experience: "20",

  // Insurance Information
  insurance_company: "Direct Line",
  insurance_policy_number: "DL-458792365",
  insurance_renewal_date: "2025-08-15",

  // Emergency Contacts
  emergency_contact: "Sarah Mitchell | 07700900456 | sarah.mitchell@email.co.uk | Wife",
  recovery_breakdown_number: "0800 777 172",

  // GDPR
  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data (Typeform 2)

```javascript
{
  // Incident Details
  incident_date: "2025-10-21",
  incident_time: "14:30",
  incident_location: "M25 Junction 15, Hertfordshire",
  what3words_location: "///sheep.blended.moving",
  weather_conditions: "Clear/Dry",
  road_conditions: "Dry",
  lighting_conditions: "Daylight",

  // Your Vehicle
  your_vehicle_speed: "60 mph",
  your_vehicle_direction: "Northbound, middle lane",
  your_vehicle_damaged: "Yes",
  damage_description: "Rear bumper completely crumpled, boot dented, rear lights smashed, possible frame damage",
  your_vehicle_driveable: "Yes, but with caution",

  // Injuries
  injuries_sustained: "Yes",
  injury_type: "Whiplash",
  injury_description: "Neck pain, head snapped forward on impact, using headrest prevented worse injury",
  medical_attention_sought: "Not yet, planning to visit GP",
  hospital_name: "",
  ambulance_called: "No",

  // Other Driver
  other_driver_name: "Michael Thompson",
  other_driver_phone: "07700900789",
  other_driver_vehicle_reg: "KL67 ABC",
  other_driver_vehicle_make: "Vauxhall",
  other_driver_vehicle_model: "Corsa",
  other_driver_insurance: "Admiral Insurance",
  other_driver_policy_number: "ADM-789456123",

  // Witness Information
  witnesses: "No",
  witness_names: "",
  witness_contact: "",

  // Police & Emergency Services
  police_called: "No",
  police_reference: "",
  fire_service_called: "No",

  // Fault & Circumstances
  who_at_fault: "Other driver",
  fault_description: "Other driver admitted to being distracted by mobile phone, failed to notice brake lights, rear-ended my vehicle",
  collision_type: "Rear-end collision",

  // Additional Details
  dashcam_footage: "Yes",
  photos_taken: "Yes",
  damage_estimate: "£3,500 - £5,000",

  // Your Account
  your_narrative: "I was driving in the middle lane of the M25 at approximately 60mph. Traffic ahead began slowing down, I applied brakes smoothly. Without warning, I felt a massive impact from behind. The other driver admitted he was looking at his phone and didn't see me braking. Clear day, no adverse conditions. My vehicle sustained significant rear-end damage.",

  // Post-Incident
  vehicle_recovered: "No, drove home",
  recovery_company: "",
  vehicle_location: "Home driveway",
  repairs_started: "No",

  // Insurance Claim
  insurance_notified: "Yes",
  claim_reference: "DL-INC-20251021-456",
  claim_status: "Open",

  // Legal
  legal_representation: "Not yet",
  previous_incidents: "No"
}
```

---

## Scenario 2: Roundabout Collision (Morning Rush Hour)

### Audio Transcription Narrative

> "This morning, about half seven, I was approaching the roundabout at the junction of London Road and Station Road in Watford. It was pouring with rain, visibility wasn't great. I was indicating right to take the third exit. As I entered the roundabout, a white van came flying round from my right, didn't give way at all, just went straight into my driver's side. Absolutely smashed my door in, wing mirror's gone, front wheel arch is completely crumpled. The van driver was really aggressive, shouting that I should have given way to him, but I had right of way! I was already on the roundabout. There was a woman at the bus stop who saw everything, she gave me her number. The van's got damage to the passenger side, front wing and bumper. I called the police because he was being quite threatening. They came out, took statements from both of us and the witness. My door won't open properly now, had to get in from the passenger side. I'm okay physically, just a bit shaken up. The van's a white Ford Transit, plastering company logo on the side."

### User Signup Data

```javascript
{
  full_name: "Priya Sharma",
  email: "priya.sharma@gmail.com",
  phone: "07700900234",
  date_of_birth: "1992-07-22",
  address_line_1: "15 Riverside Court",
  address_line_2: "Flat 3B",
  city: "Watford",
  county: "Hertfordshire",
  postcode: "WD17 4QH",

  car_registration_number: "DN21 MNO",
  car_make: "Honda",
  car_model: "Civic",
  car_colour: "Silver",
  car_year: "2021",

  driving_license_number: "SHARM907228PK9CD",
  years_driving_experience: "11",

  insurance_company: "Aviva",
  insurance_policy_number: "AV-332145698",
  insurance_renewal_date: "2026-02-10",

  emergency_contact: "Rajesh Sharma | 07700900567 | rajesh.sharma@gmail.com | Father",
  recovery_breakdown_number: "0800 777 173",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "07:30",
  incident_location: "Roundabout at London Road/Station Road junction, Watford",
  what3words_location: "///dined.tables.crunch",
  weather_conditions: "Heavy Rain",
  road_conditions: "Wet",
  lighting_conditions: "Dawn/Dusk",

  your_vehicle_speed: "15-20 mph",
  your_vehicle_direction: "On roundabout, indicating right for third exit",
  your_vehicle_damaged: "Yes",
  damage_description: "Driver's side door severely dented, wing mirror destroyed, front wheel arch crumpled, door difficult to open",
  your_vehicle_driveable: "Yes, but door compromised",

  injuries_sustained: "No major injuries",
  injury_type: "Minor shock",
  injury_description: "Shaken but no physical injuries",
  medical_attention_sought: "No",

  other_driver_name: "David Collins",
  other_driver_phone: "07700900891",
  other_driver_vehicle_reg: "WX15 TYU",
  other_driver_vehicle_make: "Ford",
  other_driver_vehicle_model: "Transit (White van)",
  other_driver_insurance: "Trade Direct Insurance",
  other_driver_policy_number: "TDI-556789012",
  other_driver_business: "Collins Plastering Ltd",

  witnesses: "Yes",
  witness_names: "Mrs. Angela Peters",
  witness_contact: "07700900445",
  witness_statement: "Was waiting at bus stop, saw silver Honda already on roundabout when white van failed to give way",

  police_called: "Yes",
  police_reference: "HT/21102025/0134",
  police_attended: "Yes",
  officer_name: "PC Sarah Johnson",
  officer_badge: "5467",

  who_at_fault: "Other driver",
  fault_description: "Other driver failed to give way at roundabout, I had right of way as I was already on the roundabout. Witness confirms this. Other driver was aggressive and confrontational.",
  collision_type: "T-bone/Side impact at roundabout",

  dashcam_footage: "Yes",
  photos_taken: "Yes",
  damage_estimate: "£4,000 - £6,000",

  your_narrative: "Approaching roundabout in heavy rain, indicating right. Already on roundabout when white van from right failed to give way and struck my driver's side. Van driver was aggressive, claimed I should have given way but I had right of way. Independent witness confirms my account.",

  vehicle_recovered: "No",
  vehicle_location: "Still at incident scene, waiting for recovery",

  insurance_notified: "Yes",
  claim_reference: "AV-INC-20251021-789",

  legal_representation: "Considering",
  previous_incidents: "No"
}
```

---

## Scenario 3: Car Park Collision (Supermarket)

### Audio Transcription Narrative

> "I was in the Tesco car park in Stevenage, just this afternoon around 3 o'clock. I'd found a space and was reversing in slowly, checked my mirrors, looked behind me, everything was clear. Suddenly there was this almighty crunch. A black BMW had come speeding round the corner behind me and just driven straight into my rear end as I was reversing. The driver was a young lad, probably early twenties, and he's claiming that I reversed into him, but that's not true at all. I was already reversing when he came flying round. There's a security camera on that corner, I've told the car park management. The back of my car has a big dent in the boot, bumper's cracked. His BMW has damage to the front bumper and bonnet. We exchanged details. No one's hurt, thank goodness. He seemed quite nervous, kept saying his dad was going to kill him. I think he's on his dad's insurance. The security guard saw the aftermath and took note of what happened."

### User Signup Data

```javascript
{
  full_name: "Margaret Evans",
  email: "margaret.evans@btinternet.com",
  phone: "07700900345",
  date_of_birth: "1968-11-08",
  address_line_1: "78 Meadow Lane",
  address_line_2: "",
  city: "Stevenage",
  county: "Hertfordshire",
  postcode: "SG2 9TH",

  car_registration_number: "PF15 GHJ",
  car_make: "Nissan",
  car_model: "Qashqai",
  car_colour: "Red",
  car_year: "2015",

  driving_license_number: "EVANS611088ME9JK",
  years_driving_experience: "39",

  insurance_company: "Churchill",
  insurance_policy_number: "CH-998877665",
  insurance_renewal_date: "2025-11-30",

  emergency_contact: "Robert Evans | 07700900678 | robert.evans@btinternet.com | Husband",
  recovery_breakdown_number: "0800 777 174",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "15:00",
  incident_location: "Tesco Supermarket Car Park, Stevenage (Row D, near entrance)",
  what3words_location: "///crisp.handed.lodge",
  weather_conditions: "Clear/Dry",
  road_conditions: "Tarmac car park, dry",
  lighting_conditions: "Daylight",

  your_vehicle_speed: "2-3 mph (reversing)",
  your_vehicle_direction: "Reversing into parking space",
  your_vehicle_damaged: "Yes",
  damage_description: "Rear bumper cracked and dented, boot lid dented, rear sensors damaged",
  your_vehicle_driveable: "Yes",

  injuries_sustained: "No",
  injury_type: "",
  injury_description: "",
  medical_attention_sought: "No",

  other_driver_name: "Joshua Patterson (driving father's car)",
  other_driver_phone: "07700900923",
  other_driver_vehicle_reg: "BM68 VVX",
  other_driver_vehicle_make: "BMW",
  other_driver_vehicle_model: "3 Series",
  other_driver_vehicle_colour: "Black",
  other_driver_insurance: "Direct Line (registered to Mr. David Patterson)",
  other_driver_policy_number: "DL-225536987",
  other_driver_notes: "Named driver on father's policy",

  witnesses: "Yes",
  witness_names: "Tesco Security Guard - Steve Morrison",
  witness_contact: "Via Tesco Store Manager: 01438 123456",
  witness_statement: "Security guard observed aftermath, noted other vehicle travelling at speed in car park",

  police_called: "No",
  police_reference: "",

  who_at_fault: "Other driver",
  fault_description: "I was already reversing slowly into space when other driver came speeding round corner and struck my rear. CCTV should show this. Other driver admits he was 'in a rush'.",
  collision_type: "Rear-end collision during reversing",

  dashcam_footage: "No",
  photos_taken: "Yes",
  cctv_available: "Yes - Tesco car park cameras, reference requested from store manager",
  damage_estimate: "£1,800 - £2,500",

  your_narrative: "Reversing slowly into parking space in Tesco car park. Mirrors and reversing sensors clear. Other vehicle came round corner at excessive speed for car park and collided with my rear. Driver appeared inexperienced and nervous. Security guard witnessed aftermath. CCTV requested.",

  vehicle_recovered: "No",
  vehicle_location: "Driven home",

  insurance_notified: "Yes",
  claim_reference: "CH-INC-20251021-334",

  legal_representation: "No",
  previous_incidents: "No"
}
```

---

## Scenario 4: Hit and Run (Residential Street)

### Audio Transcription Narrative

> "I'm absolutely livid. I parked my car on my street last night, about 10 PM, right outside my house on Elm Grove in Hemel Hempstead. This morning when I came out at 7 AM, someone's completely smashed into the side of my car and driven off. The whole passenger side is scraped, wing mirror's hanging off, both doors on that side are dented. There's blue paint transfer on my car, so whoever hit me was driving something blue. I've spoken to my neighbours, nobody saw anything, but Mrs. Peterson three doors down has a Ring doorbell that might have caught something. I've reported it to the police as a hit and run. They gave me a crime reference number. I'm so angry because now my insurance is going to go up even though it's not my fault at all. The car was properly parked, well within the lines, plenty of space. Whoever did this must have been drunk or just didn't care. My car's less than a year old!"

### User Signup Data

```javascript
{
  full_name: "Thomas Wright",
  email: "t.wright@outlook.com",
  phone: "07700900456",
  date_of_birth: "1995-05-30",
  address_line_1: "23 Elm Grove",
  address_line_2: "",
  city: "Hemel Hempstead",
  county: "Hertfordshire",
  postcode: "HP2 5NQ",

  car_registration_number: "YH24 RST",
  car_make: "Mazda",
  car_model: "CX-5",
  car_colour: "White",
  car_year: "2024",

  driving_license_number: "WRIGH905309TW9LM",
  years_driving_experience: "10",

  insurance_company: "LV=",
  insurance_policy_number: "LV-445522998",
  insurance_renewal_date: "2026-01-15",

  emergency_contact: "Emily Wright | 07700900789 | emily.wright@outlook.com | Sister",
  recovery_breakdown_number: "0800 777 175",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-20", // Occurred overnight
  incident_time: "22:00-07:00 (Unknown exact time)",
  incident_location: "Elm Grove, Hemel Hempstead (outside house number 23)",
  what3words_location: "///habit.nests.caring",
  weather_conditions: "Unknown (overnight)",
  road_conditions: "Residential street",
  lighting_conditions: "Night-time",

  your_vehicle_speed: "0 mph (Parked)",
  your_vehicle_direction: "Parked on street, facing north",
  your_vehicle_damaged: "Yes",
  damage_description: "Entire passenger side scraped, both passenger doors dented, wing mirror hanging off, blue paint transfer visible",
  your_vehicle_driveable: "Yes, but damaged",

  injuries_sustained: "No (vehicle unattended)",
  injury_type: "",
  injury_description: "",
  medical_attention_sought: "No",

  other_driver_name: "Unknown (Hit and Run)",
  other_driver_phone: "",
  other_driver_vehicle_reg: "Unknown",
  other_driver_vehicle_make: "Unknown",
  other_driver_vehicle_model: "Unknown - blue vehicle (from paint transfer)",
  other_driver_vehicle_colour: "Blue",
  other_driver_insurance: "Unknown",
  other_driver_policy_number: "",

  witnesses: "Potentially",
  witness_names: "Mrs. Angela Peterson (neighbour)",
  witness_contact: "07700900334",
  witness_statement: "Has Ring doorbell camera that may have captured incident",

  police_called: "Yes",
  police_reference: "HP/20102025/0567",
  police_attended: "No - report filed online/by phone",
  crime_reference: "HP/20102025/0567",

  who_at_fault: "Other driver (unknown)",
  fault_description: "Vehicle was legally parked on residential street. Unknown driver struck parked vehicle and fled scene without leaving details. This is a criminal offence (hit and run).",
  collision_type: "Hit and run - side impact on parked vehicle",

  dashcam_footage: "No (vehicle was parked)",
  photos_taken: "Yes",
  cctv_available: "Potentially - neighbour's Ring doorbell",
  damage_estimate: "£3,000 - £4,500",

  your_narrative: "Vehicle parked legally on residential street overnight. Discovered damage in morning. Entire passenger side scraped and dented with blue paint transfer. No note left by other driver. Reported to police as hit and run. Neighbour may have doorbell footage.",

  vehicle_recovered: "No",
  vehicle_location: "Still parked outside home",

  insurance_notified: "Yes",
  claim_reference: "LV-INC-20251021-556",
  claim_type: "Uninsured driver claim",

  legal_representation: "Considering",
  previous_incidents: "No"
}
```

---

## Scenario 5: Multi-Vehicle Motorway Accident (M1)

### Audio Transcription Narrative

> "Oh God, this was terrifying. I was on the M1 southbound near Luton, Junction 10, about 11 this morning. Heavy traffic, stop-start. I was in the slow lane, doing maybe 40 miles an hour. Suddenly the lorry in front slammed his brakes on, I stopped in time, but the car behind me didn't. They hit me, which shunted me forward into the lorry. Then another car hit the one behind me. Four vehicles total in the pile-up. My car's sandwiched between the lorry and the car behind. The front end's completely smashed in, bonnet's crumpled, radiator's leaking everywhere. The back's also got damage from being rear-ended. I hit my chest on the steering wheel even with the seatbelt on. I'm quite sore. The ambulance came, they checked everyone. The woman in the car behind me was taken to hospital with chest pains. The lorry driver's okay, he was just doing his job, had to brake suddenly. Police shut two lanes for about an hour. There were two other witnesses in the adjacent lane who stopped to help. Everyone exchanged details. My car's been recovered to a secure compound. I've got photos of everything. The police said the car that hit me first is being investigated as the driver admitted to being distracted."

### User Signup Data

```javascript
{
  full_name: "Sarah O'Connor",
  email: "sarah.oconnor@yahoo.co.uk",
  phone: "07700900567",
  date_of_birth: "1988-09-14",
  address_line_1: "56 Park Avenue",
  address_line_2: "",
  city: "Luton",
  county: "Bedfordshire",
  postcode: "LU1 3QW",

  car_registration_number: "MT18 PQR",
  car_make: "Volkswagen",
  car_model: "Golf",
  car_colour: "Grey",
  car_year: "2018",

  driving_license_number: "OCONN809149SO9PQ",
  years_driving_experience: "19",

  insurance_company: "Hastings Direct",
  insurance_policy_number: "HD-778899001",
  insurance_renewal_date: "2025-12-20",

  emergency_contact: "Michael O'Connor | 07700900890 | michael.oconnor@yahoo.co.uk | Brother",
  recovery_breakdown_number: "0800 777 176",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "11:00",
  incident_location: "M1 Southbound, Junction 10 (near Luton), slow lane",
  what3words_location: "///racing.inputs.diving",
  weather_conditions: "Overcast but dry",
  road_conditions: "Dry",
  lighting_conditions: "Daylight",

  your_vehicle_speed: "40 mph (slowing/stopped)",
  your_vehicle_direction: "Southbound, slow lane",
  your_vehicle_damaged: "Yes - severe",
  damage_description: "Front end severely damaged (collision with lorry), bonnet crumpled, radiator leaking, front bumper destroyed. Rear end also damaged (rear-ended). Vehicle sandwiched between two vehicles.",
  your_vehicle_driveable: "No - recovered to compound",

  injuries_sustained: "Yes",
  injury_type: "Chest injury from steering wheel impact",
  injury_description: "Chest pain and soreness from steering wheel impact despite wearing seatbelt. Checked by paramedics at scene.",
  medical_attention_sought: "Yes - paramedics at scene",
  hospital_name: "Luton & Dunstable Hospital (advised to attend if pain worsens)",
  ambulance_called: "Yes",

  // Vehicle 1: Lorry in front (no fault)
  other_driver_1_name: "John Davies (HGV Driver)",
  other_driver_1_phone: "07700900445",
  other_driver_1_vehicle_reg: "YT19 HGV",
  other_driver_1_vehicle_make: "Scania",
  other_driver_1_vehicle_model: "R450 Articulated Lorry",
  other_driver_1_insurance: "Fleet Insurance - Haulage Direct",
  other_driver_1_policy_number: "HD-FLEET-334455",
  other_driver_1_company: "Davies Transport Ltd",

  // Vehicle 2: Car behind (at fault)
  other_driver_2_name: "Ryan Mitchell",
  other_driver_2_phone: "07700900778",
  other_driver_2_vehicle_reg: "FG20 DEF",
  other_driver_2_vehicle_make: "Audi",
  other_driver_2_vehicle_model: "A4",
  other_driver_2_insurance: "Admiral",
  other_driver_2_policy_number: "ADM-556677889",
  other_driver_2_notes: "Admitted to being distracted",

  // Vehicle 3: Car behind Vehicle 2
  other_driver_3_name: "Lisa Barnes",
  other_driver_3_phone: "07700900889",
  other_driver_3_vehicle_reg: "KP21 ZZZ",
  other_driver_3_vehicle_make: "Toyota",
  other_driver_3_vehicle_model: "Yaris",
  other_driver_3_insurance: "LV=",
  other_driver_3_policy_number: "LV-990088777",
  other_driver_3_notes: "Transported to hospital with chest pains",

  witnesses: "Yes",
  witness_names: "Mr. Peter Collins, Mrs. Janet Taylor",
  witness_contact: "07700900556, 07700900667",
  witness_statement: "Both driving in adjacent lane, saw lorry brake, saw chain collision",

  police_called: "Yes",
  police_reference: "BD/21102025/0234",
  police_attended: "Yes",
  officer_name: "PC Mark Stevens",
  officer_badge: "6789",
  lanes_closed: "Yes - 2 lanes closed for approximately 1 hour",

  who_at_fault: "Driver behind me (Vehicle 2 - Ryan Mitchell)",
  fault_description: "Lorry braked suddenly due to traffic. I stopped safely. Driver behind me was distracted and failed to stop, rear-ended me, causing me to collide with lorry in front. Driver admitted distraction to police. Third vehicle then hit the second vehicle.",
  collision_type: "Multi-vehicle chain reaction, rear-end collisions",

  dashcam_footage: "No",
  photos_taken: "Yes - extensive photos of all vehicles",
  damage_estimate: "Likely write-off - £8,000+",

  your_narrative: "M1 southbound, heavy traffic. Lorry in front braked suddenly, I stopped safely. Car behind failed to stop and struck my rear, pushing me into lorry. Another car then hit the car that hit me. Four vehicles total. I sustained chest injury from steering wheel. One other driver hospitalized. Police attended, lanes closed. Driver behind me admitted distraction. Vehicle recovered to compound.",

  vehicle_recovered: "Yes",
  recovery_company: "AA Recovery Services",
  vehicle_location: "Secure compound - Junction 10 Recovery, Luton",

  insurance_notified: "Yes",
  claim_reference: "HD-INC-20251021-990",
  claim_type: "Multi-vehicle collision",
  likely_total_loss: "Yes",

  legal_representation: "Yes, considering due to injury claim",
  previous_incidents: "No"
}
```

---

## Scenario 6: Pedestrian Involved (School Zone)

### Audio Transcription Narrative

> "This happened right outside St. Mary's Primary School in Welwyn Garden City, about 3:15 this afternoon during school pickup. I was driving slowly, maybe 15 miles an hour, being really careful because of all the kids and parents. There's a zebra crossing right there. A little girl, maybe 7 or 8, just ran out from between parked cars onto the crossing. I slammed my brakes on immediately but still clipped her with my front bumper. She went down. Oh my God, I was terrified. Her mum was screaming. I jumped out, the little girl was crying but conscious. Her leg was hurting. I called 999 straight away, ambulance came really quickly, about 5 minutes. Police came too. The paramedics checked her over, said she might have a fractured ankle, took her to A&E with her mum. The police were brilliant, really understanding. They said I couldn't have done anything different, the child ran out suddenly and I was already going slowly. Lots of witnesses, other parents who saw it all. I'm in shock, I feel terrible even though everyone's saying it wasn't my fault. My front bumper has a small crack where she hit it. The police took all my details, breathalysed me which was negative obviously. They're treating it as an accident. I've notified my insurance but I'm worried sick about that little girl."

### User Signup Data

```javascript
{
  full_name: "Claire Henderson",
  email: "claire.henderson@gmail.com",
  phone: "07700900678",
  date_of_birth: "1982-04-25",
  address_line_1: "112 Bridge Road",
  address_line_2: "",
  city: "Welwyn Garden City",
  county: "Hertfordshire",
  postcode: "AL8 6PQ",

  car_registration_number: "SV20 UVW",
  car_make: "Nissan",
  car_model: "Juke",
  car_colour: "White",
  car_year: "2020",

  driving_license_number: "HENDE804259CH9RS",
  years_driving_experience: "25",

  insurance_company: "Zurich",
  insurance_policy_number: "ZU-112233445",
  insurance_renewal_date: "2025-09-10",

  emergency_contact: "Paul Henderson | 07700900901 | paul.henderson@gmail.com | Husband",
  recovery_breakdown_number: "0800 777 177",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "15:15",
  incident_location: "Outside St. Mary's Primary School, School Lane, Welwyn Garden City (near zebra crossing)",
  what3words_location: "///chefs.rushed.plots",
  weather_conditions: "Clear/Dry",
  road_conditions: "Dry",
  lighting_conditions: "Daylight",
  road_type: "20mph school zone",

  your_vehicle_speed: "15 mph (school zone)",
  your_vehicle_direction: "Driving past school, approaching zebra crossing",
  your_vehicle_damaged: "Minor",
  damage_description: "Small crack in front bumper where pedestrian made contact",
  your_vehicle_driveable: "Yes",

  injuries_sustained: "No (driver uninjured)",
  injury_type: "",
  injury_description: "",
  medical_attention_sought: "No",

  pedestrian_involved: "Yes",
  pedestrian_name: "Emily Roberts (child, age 7)",
  pedestrian_parent_name: "Mrs. Jennifer Roberts",
  pedestrian_parent_contact: "07700900234",
  pedestrian_injury: "Suspected fractured ankle",
  pedestrian_medical_attention: "Yes - transported to hospital by ambulance",
  hospital_name: "Lister Hospital, Stevenage A&E",
  ambulance_called: "Yes",
  ambulance_arrival_time: "5 minutes",

  witnesses: "Yes - multiple",
  witness_names: "Mrs. Karen Smith, Mr. David Brown, Mrs. Lisa Price (all school parents)",
  witness_contact: "07700900123, 07700900456, 07700900789",
  witness_statement: "Multiple witnesses confirm child ran out suddenly from between parked cars, driver was already driving slowly and braked immediately",

  police_called: "Yes",
  police_reference: "HT/21102025/0567",
  police_attended: "Yes",
  officer_name: "PC David Morris",
  officer_badge: "7890",
  breathalyser_test: "Negative",

  who_at_fault: "Unclear/Under investigation",
  fault_description: "Child ran suddenly onto zebra crossing from between parked cars. Driver was already driving at appropriate speed (15mph in 20mph zone) and braked immediately upon seeing child. Police indicated driver acted appropriately. Multiple witnesses support driver's account.",
  collision_type: "Vehicle-pedestrian collision",

  dashcam_footage: "Yes - critical evidence",
  photos_taken: "Yes",
  damage_estimate: "£200 (minor bumper repair)",

  your_narrative: "Driving slowly past school during pickup time, approximately 15mph in 20mph zone. Child ran out suddenly from between parked cars onto zebra crossing. Braked immediately but light contact made. Called 999 instantly. Child conscious, crying, complaining of ankle pain. Ambulance arrived within 5 minutes, transported child to hospital. Police attended, multiple parent witnesses. Breathalyser negative. Police indicated I acted appropriately given circumstances. Extremely distressed about child's welfare.",

  vehicle_recovered: "No",
  vehicle_location: "Driven home after police clearance",

  insurance_notified: "Yes",
  claim_reference: "ZU-INC-20251021-667",
  claim_type: "Pedestrian accident (potential third-party injury claim)",

  legal_representation: "Will likely need legal advice",
  previous_incidents: "No",

  additional_notes: "School contacted, headteacher Mrs. Susan Walsh also provided statement. Child's mother initially very upset but witnesses assured her driver was not at fault. Awaiting hospital report on child's injuries. Driver in significant emotional distress despite witnesses confirming appropriate driving."
}
```

---

## Scenario 7: Weather-Related Accident (Black Ice)

### Audio Transcription Narrative

> "Early this morning, about 6 AM, I was driving to work along the A414 near Hertford. It had been frosty overnight, temperature must have been below freezing. The road looked fine, just a bit damp. I was going about 50, just under the speed limit. As I came round a gentle bend, suddenly the back end just went. I'd hit a patch of black ice, completely invisible. The car started spinning, I tried to correct but there was no grip at all. I went sideways across both lanes and ended up in the ditch on the opposite side of the road. Thankfully no other cars were around, if someone had been coming the other way it could have been really bad. The car's stuck in the ditch, front driver's side is all crunched up from hitting the banking, the underside's damaged from the ditch. I called the police and they sent a gritter out after. They said there'd been several accidents on that stretch this morning, black ice everywhere. Recovery had to winch my car out of the ditch. I'm okay, bit bruised from the seatbelt. They said I should report it even though there's no other vehicle involved because of the road conditions. The council might be liable if they didn't grit properly."

### User Signup Data

```javascript
{
  full_name: "Andrew Foster",
  email: "a.foster@outlook.com",
  phone: "07700900789",
  date_of_birth: "1975-12-03",
  address_line_1: "34 Willow Drive",
  address_line_2: "",
  city: "Hertford",
  county: "Hertfordshire",
  postcode: "SG13 8LN",

  car_registration_number: "RK17 XYZ",
  car_make: "Ford",
  car_model: "Mondeo",
  car_colour: "Black",
  car_year: "2017",

  driving_license_number: "FOSTE712039AF9MN",
  years_driving_experience: "32",

  insurance_company: "More Than",
  insurance_policy_number: "MT-334455667",
  insurance_renewal_date: "2026-03-15",

  emergency_contact: "Linda Foster | 07700900012 | linda.foster@outlook.com | Wife",
  recovery_breakdown_number: "0800 777 178",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "06:00",
  incident_location: "A414 near Hertford, approximately 1 mile east of Cole Green roundabout",
  what3words_location: "///ranks.spoon.gifted",
  weather_conditions: "Frosty/Freezing (-2°C), Black Ice",
  road_conditions: "Black ice (invisible ice on road surface)",
  lighting_conditions: "Dawn/Dark",

  your_vehicle_speed: "50 mph (speed limit 60mph)",
  your_vehicle_direction: "Eastbound on A414",
  your_vehicle_damaged: "Yes - significant",
  damage_description: "Front driver's side wheel arch and bumper damaged from impact with banking, undercarriage damage from ditch, possible suspension damage",
  your_vehicle_driveable: "No - had to be winched from ditch",

  injuries_sustained: "Minor",
  injury_type: "Bruising from seatbelt",
  injury_description: "Seat belt bruising across chest and shoulder, minor whiplash",
  medical_attention_sought: "No, but advised to see GP if pain worsens",

  other_driver_name: "N/A - Single vehicle accident",
  other_driver_phone: "",
  other_driver_vehicle_reg: "",

  witnesses: "No direct witnesses to incident",
  witness_names: "Several other drivers reported similar incidents on same stretch",
  witness_contact: "",

  police_called: "Yes",
  police_reference: "HT/21102025/0678",
  police_attended: "Yes",
  officer_name: "PC Amanda Clarke",
  officer_badge: "5678",
  police_notes: "Multiple accidents reported on this stretch due to black ice. Council highways notified to grit road.",

  who_at_fault: "Potentially road maintenance (untreated black ice)",
  fault_description: "Black ice on public road caused loss of control. Road had not been gritted despite freezing temperatures overnight. Police confirmed multiple accidents on same stretch. Council may be liable for failing to grit road appropriately.",
  collision_type: "Single vehicle accident - weather related (black ice)",

  dashcam_footage: "Yes - shows black ice and loss of control",
  photos_taken: "Yes - vehicle in ditch, road conditions, temperature reading",
  damage_estimate: "£4,500 - £6,000",

  your_narrative: "Driving to work at 6am on A414 in freezing conditions. Road appeared wet but was actually covered in invisible black ice. Hit ice patch on gentle bend, vehicle lost all traction and spun across both lanes into opposite ditch. Attempted to correct but no grip available. No other vehicles involved fortunately. Police confirmed multiple accidents on untreated stretch. Council highways department notified.",

  vehicle_recovered: "Yes",
  recovery_company: "Green Flag Recovery",
  vehicle_location: "Home driveway (recovered from scene)",
  recovery_notes: "Required winching from ditch",

  insurance_notified: "Yes",
  claim_reference: "MT-INC-20251021-445",
  claim_type: "Single vehicle accident - potential council liability claim",

  council_complaint: "Yes - notified Hertfordshire County Council Highways",
  council_reference: "HCC-HIGHWAYS-20251021-789",

  legal_representation: "Considering for potential council claim",
  previous_incidents: "No"
}
```

---

## Scenario 8: Distracted Driving (Mobile Phone Use)

### Audio Transcription Narrative

> "Right, so I'm at fault on this one and I'm not proud of it. This afternoon, about 2 o'clock, I was driving through Bishop's Stortford town center. My phone rang, I know I shouldn't have but I picked it up to see who was calling. Just glanced down for a second. When I looked up, the car in front had stopped at a pedestrian crossing and I went straight into the back of them. It wasn't a huge impact but enough to crunch their bumper and my bonnet. The other driver was furious, understandably. A traffic officer was literally right there, saw the whole thing. He pulled me over, I admitted I'd been looking at my phone. He's issued me with 6 points and a £200 fine. I'm absolutely gutted. My insurance is going to be through the roof. The other car's rear bumper is dented, one of the lights is cracked. My bonnet won't close properly now. The other driver's okay, bit of neck pain but they didn't want an ambulance. They took photos of everything including me with my phone. I've apologised profusely but they're rightly annoyed. I've contacted my insurance, explained what happened. I'm never touching my phone while driving again, lesson learned the hard way."

### User Signup Data

```javascript
{
  full_name: "Daniel Brooks",
  email: "daniel.brooks@gmail.com",
  phone: "07700900890",
  date_of_birth: "1990-08-19",
  address_line_1: "89 Richmond Road",
  address_line_2: "",
  city: "Bishop's Stortford",
  county: "Hertfordshire",
  postcode: "CM23 3JH",

  car_registration_number: "LM19 ABC",
  car_make: "Volkswagen",
  car_model: "Polo",
  car_colour: "Blue",
  car_year: "2019",

  driving_license_number: "BROOK908199DB9XY",
  years_driving_experience: "17",

  insurance_company: "Admiral",
  insurance_policy_number: "ADM-667788990",
  insurance_renewal_date: "2025-06-30",

  emergency_contact: "Rachel Brooks | 07700900445 | rachel.brooks@gmail.com | Wife",
  recovery_breakdown_number: "0800 777 179",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "14:00",
  incident_location: "South Street, Bishop's Stortford town center (near pedestrian crossing)",
  what3words_location: "///jumps.master.panel",
  weather_conditions: "Clear/Dry",
  road_conditions: "Dry",
  lighting_conditions: "Daylight",

  your_vehicle_speed: "20-25 mph",
  your_vehicle_direction: "Heading south on South Street",
  your_vehicle_damaged: "Yes",
  damage_description: "Bonnet crumpled, won't close properly, front bumper cracked, radiator grille damaged",
  your_vehicle_driveable: "Just about, but bonnet needs securing",

  injuries_sustained: "No (driver at fault uninjured)",
  injury_type: "",
  injury_description: "",
  medical_attention_sought: "No",

  other_driver_name: "Mrs. Patricia Williams",
  other_driver_phone: "07700900556",
  other_driver_vehicle_reg: "HJ21 LMN",
  other_driver_vehicle_make: "Toyota",
  other_driver_vehicle_model: "Corolla",
  other_driver_vehicle_colour: "Silver",
  other_driver_insurance: "Direct Line",
  other_driver_policy_number: "DL-889900112",
  other_driver_injuries: "Minor neck discomfort, declined ambulance",

  witnesses: "Yes - traffic officer witnessed entire incident",
  witness_names: "Traffic Officer PC James Reid",
  witness_contact: "Via Hertfordshire Police",
  witness_badge: "8901",
  witness_statement: "Officer witnessed driver using mobile phone and subsequent collision",

  police_called: "Yes - officer present at scene",
  police_reference: "HT/21102025/0789",
  police_attended: "Yes - officer at scene",
  officer_name: "PC James Reid (Traffic Officer)",
  officer_badge: "8901",

  traffic_offence_committed: "Yes",
  traffic_offence_type: "Using mobile phone while driving",
  penalty_points: "6 points",
  fine_issued: "£200",

  who_at_fault: "Me (driver admitting fault)",
  fault_description: "I was distracted by mobile phone, looked away from road. Other driver had stopped legally at pedestrian crossing. I failed to stop in time and rear-ended them. Traffic officer witnessed me using phone. I accept full responsibility. No excuses.",
  collision_type: "Rear-end collision due to driver distraction (mobile phone)",

  dashcam_footage: "No",
  photos_taken: "Yes - by other driver and police",
  damage_estimate: "My vehicle: £2,500 | Other vehicle: £1,800",

  your_narrative: "I made a serious mistake. I was driving through town when my phone rang. Against my better judgment, I glanced at it to see who was calling. In that moment of distraction, the car in front stopped at a pedestrian crossing and I collided with their rear. A traffic officer witnessed the entire incident including my phone use. I immediately admitted fault. I've been issued 6 penalty points and £200 fine. The other driver was understandably angry. I accept full responsibility and have learned a harsh lesson about mobile phone distraction.",

  vehicle_recovered: "No",
  vehicle_location: "Driven home with bonnet secured",

  insurance_notified: "Yes",
  claim_reference: "ADM-INC-20251021-778",
  claim_type: "At-fault collision - distracted driving",
  expected_premium_increase: "Significant (6 points + at-fault claim)",

  legal_representation: "Not applicable (admitting fault)",
  previous_incidents: "No",

  driver_improvement_course: "Considering",
  personal_reflection: "This was entirely my fault. No one was seriously hurt but it could have been much worse. I'm ashamed and will never touch my phone while driving again. I want this documented so others can learn from my mistake."
}
```

---

## Scenario 9: Mechanical Failure (Brake Failure)

### Audio Transcription Narrative

> "This was absolutely terrifying. I was coming down the hill on Hitchin Road in Stevenage this afternoon, maybe 1 o'clock. It's quite a steep hill. I went to brake for the junction at the bottom and the pedal just went straight to the floor, nothing happened. I pumped it, nothing. I was gaining speed down the hill. I tried the handbrake, managed to slow down a bit but not enough. There were cars stopped at the junction ahead. I had to swerve to avoid them, mounted the pavement - thankfully no pedestrians there - and crashed into a garden wall. The wall stopped me. I hit it pretty hard, front end's completely smashed in, airbag went off. My chest is sore from the airbag. The homeowner came running out, he was brilliant, called 999. Police and ambulance came. Paramedics checked me over, I've got bruising but nothing broken. The police called out a vehicle examiner because it's a mechanical failure. They've taken my car for examination. I bought it from a small garage six months ago, had it serviced there last month. The examiner said initially it looks like total brake fluid loss, possibly a line failure. If that garage didn't do the service properly I'm going to be making a complaint. The wall owner has my insurance details. The police said because it's mechanical failure there might not be points but I'm still liable for the damage. My car's likely a write-off."

### User Signup Data

```javascript
{
  full_name: "Robert Patel",
  email: "robert.patel@hotmail.co.uk",
  phone: "07700900901",
  date_of_birth: "1978-06-11",
  address_line_1: "67 Fairway Drive",
  address_line_2: "",
  city: "Stevenage",
  county: "Hertfordshire",
  postcode: "SG1 2LP",

  car_registration_number: "HN16 QWE",
  car_make: "Vauxhall",
  car_model: "Astra",
  car_colour: "Silver",
  car_year: "2016",

  driving_license_number: "PATEL806119RP9KL",
  years_driving_experience: "29",

  insurance_company: "Tesco Bank",
  insurance_policy_number: "TB-445566778",
  insurance_renewal_date: "2026-04-22",

  emergency_contact: "Priya Patel | 07700900234 | priya.patel@hotmail.co.uk | Wife",
  recovery_breakdown_number: "0800 777 180",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "13:00",
  incident_location: "Hitchin Road, Stevenage (steep hill descent near junction with Fairlands Way)",
  what3words_location: "///hotter.drill.cotton",
  weather_conditions: "Clear/Dry",
  road_conditions: "Dry",
  lighting_conditions: "Daylight",

  your_vehicle_speed: "Initially 30mph, accelerating uncontrollably down hill due to brake failure",
  your_vehicle_direction: "Descending Hitchin Road hill towards Fairlands Way junction",
  your_vehicle_damaged: "Yes - severe",
  damage_description: "Complete front-end damage from wall collision, bonnet crumpled, airbag deployed, radiator destroyed, possible frame damage",
  your_vehicle_driveable: "No - total brake failure, likely write-off",

  injuries_sustained: "Yes - minor",
  injury_type: "Chest bruising from airbag deployment",
  injury_description: "Bruising and soreness from airbag deployment, checked by paramedics",
  medical_attention_sought: "Yes - paramedics at scene",
  ambulance_called: "Yes",

  other_driver_name: "N/A - Single vehicle mechanical failure",
  other_driver_phone: "",
  other_driver_vehicle_reg: "",

  // Property damage
  property_owner_name: "Mr. George Harrison",
  property_owner_address: "34 Hitchin Road, Stevenage",
  property_owner_contact: "07700900667",
  property_damage: "Garden wall destroyed, possible boundary fence damage",
  property_damage_estimate: "£2,500 - £4,000",

  witnesses: "Yes",
  witness_names: "Mr. George Harrison (property owner), Mrs. Helen Davis (passing pedestrian)",
  witness_contact: "07700900667, 07700900778",
  witness_statement: "Witnesses saw vehicle unable to stop, driver attempting to avoid stopped traffic",

  police_called: "Yes",
  police_reference: "HT/21102025/0890",
  police_attended: "Yes",
  officer_name: "PC Sarah Thompson",
  officer_badge: "9012",

  vehicle_examiner_called: "Yes",
  vehicle_examiner_name: "David Morris - Certified Vehicle Examiner",
  vehicle_examiner_company: "Hertfordshire Police Vehicle Examination Unit",
  preliminary_findings: "Complete brake fluid loss, suspected brake line failure or service negligence",

  who_at_fault: "Potentially garage that serviced vehicle",
  fault_description: "Total brake failure on steep hill. Vehicle had been serviced by 'Steve's Motors' one month ago. Vehicle examiner suspects brake line failure or improper service. Driver took evasive action to avoid pedestrians and other vehicles. May pursue claim against garage for negligence.",
  collision_type: "Single vehicle accident - mechanical failure (brakes)",

  dashcam_footage: "Yes - shows brake pedal being pressed with no response",
  photos_taken: "Yes - vehicle damage, wall damage, brake pedal position",
  damage_estimate: "Vehicle likely write-off: £8,000 | Wall repair: £3,500",

  your_narrative: "Descending steep hill when brake pedal went completely to floor - total brake failure. Pumped brakes, tried handbrake, nothing worked. Gaining speed uncontrollably. Swerved to avoid vehicles stopped at junction, mounted pavement (no pedestrians), collided with garden wall to stop vehicle. Terrifying experience. Airbag deployed. Vehicle serviced by Steve's Motors just last month - they may be liable. Police called vehicle examiner. Preliminary findings suggest brake line failure or service negligence.",

  vehicle_recovered: "Yes",
  recovery_company: "Police arranged - AA Recovery",
  vehicle_location: "Police vehicle examination compound",
  vehicle_examination_ongoing: "Yes",

  insurance_notified: "Yes",
  claim_reference: "TB-INC-20251021-889",
  claim_type: "Single vehicle mechanical failure with property damage",

  garage_last_service: "Steve's Motors, Stevenage",
  garage_address: "Unit 5, Industrial Estate, Stevenage",
  garage_contact: "01438 987654",
  last_service_date: "2025-09-15",
  last_service_type: "Full service including brake fluid change",

  legal_representation: "Yes - will pursue garage for negligence",
  previous_incidents: "No",

  vehicle_examiner_report: "Awaiting full written report",
  potential_claims: "1) Own vehicle damage against garage, 2) Property damage claim, 3) Personal injury if required"
}
```

---

## Scenario 10: Minor Scrape (Supermarket Exit)

### Audio Transcription Narrative

> "Oh, this is embarrassing really. I was leaving the Sainsbury's car park in Hatfield this evening, around 6 PM. The exit has these concrete pillars on either side. I misjudged the width and scraped my passenger side along the pillar. Just a moment of inattention. There's a long scrape down the passenger doors and the wing mirror's scuffed. My own silly fault. No other vehicles involved, just me and a concrete pillar. I went back into the store and reported it to the manager in case there's any CCTV or anything they need for their records. They were fine about it, said the pillar's undamaged, just my car that's scratched. It's all still driveable, just cosmetic damage. I've taken photos. I'm going to have to claim on my insurance for it which is annoying because my no-claims bonus will be affected. But it needs fixing, it looks awful. The scrape goes from the front passenger door all the way back to the rear wheel arch. Might be £800 to a thousand pounds to repair I reckon. I feel like an idiot. I've driven through that car park exit hundreds of times, just wasn't concentrating today. Lesson learned I suppose."

### User Signup Data

```javascript
{
  full_name: "Helen Morris",
  email: "helen.morris@btinternet.com",
  phone: "07700900012",
  date_of_birth: "1972-02-17",
  address_line_1: "23 Meadow View",
  address_line_2: "",
  city: "Hatfield",
  county: "Hertfordshire",
  postcode: "AL10 9BN",

  car_registration_number: "VH18 TUV",
  car_make: "Peugeot",
  car_model: "208",
  car_colour: "White",
  car_year: "2018",

  driving_license_number: "MORRI702179HM9NP",
  years_driving_experience: "35",

  insurance_company: "Aviva",
  insurance_policy_number: "AV-556677889",
  insurance_renewal_date: "2025-07-30",

  emergency_contact: "John Morris | 07700900345 | john.morris@btinternet.com | Husband",
  recovery_breakdown_number: "0800 777 181",

  gdpr_consent: true,
  privacy_policy_accepted: true
}
```

### Incident Report Data

```javascript
{
  incident_date: "2025-10-21",
  incident_time: "18:00",
  incident_location: "Sainsbury's Supermarket Car Park, Hatfield (exit lane)",
  what3words_location: "///party.grapes.sender",
  weather_conditions: "Clear/Dry",
  road_conditions: "Tarmac car park surface, dry",
  lighting_conditions: "Dusk - car park lighting on",

  your_vehicle_speed: "5-10 mph",
  your_vehicle_direction: "Exiting car park",
  your_vehicle_damaged: "Yes",
  damage_description: "Long scrape down entire passenger side from front door to rear wheel arch, passenger wing mirror scuffed, paint damage",
  your_vehicle_driveable: "Yes - cosmetic damage only",

  injuries_sustained: "No",
  injury_type: "",
  injury_description: "",
  medical_attention_sought: "No",

  other_driver_name: "N/A - Single vehicle, no collision with other vehicles",
  other_driver_phone: "",
  other_driver_vehicle_reg: "",

  // Property involved
  property_type: "Concrete pillar (car park infrastructure)",
  property_owner: "Sainsbury's Supermarket, Hatfield",
  property_owner_contact: "Store Manager: 01707 123456",
  property_damage: "None - pillar undamaged",

  witnesses: "No direct witnesses",
  witness_names: "",
  witness_contact: "",

  police_called: "No - minor incident, no other parties",
  police_reference: "",

  store_notified: "Yes - reported to Sainsbury's manager",
  store_incident_number: "SAINS-HF-20251021-034",
  cctv_available: "Potentially - store has cameras at exits",

  who_at_fault: "Me - driver error",
  fault_description: "Misjudged width of exit lane and scraped passenger side against concrete pillar. Momentary lapse in concentration. No other vehicles or people involved. My fault entirely.",
  collision_type: "Single vehicle - scrape against fixed object",

  dashcam_footage: "No",
  photos_taken: "Yes - damage to passenger side, pillar (showing no damage to property)",
  damage_estimate: "£800 - £1,200 (cosmetic repair and paint)",

  your_narrative: "Exiting Sainsbury's car park after shopping. Misjudged width of exit lane between concrete pillars. Scraped entire passenger side against pillar. Embarrassing driver error. Reported to store manager immediately. No damage to store property. Vehicle driveable but cosmetic damage requires repair. Will claim on own insurance as no other party involved.",

  vehicle_recovered: "No - drove home",
  vehicle_location: "Home driveway",

  insurance_notified: "Yes",
  claim_reference: "AV-INC-20251021-990",
  claim_type: "Single vehicle damage - own fault",
  no_claims_bonus_affected: "Yes",

  legal_representation: "Not required",
  previous_incidents: "One previous minor claim 8 years ago",

  additional_notes: "Minor incident but documentation needed for insurance claim. Driver accepts full responsibility. Sainsbury's confirmed no liability as no damage to their property. Simple case of driver misjudgment."
}
```

---

## Usage Guide for Testing

### How to Use These Scenarios

1. **Transcription Testing:**
   - Use the audio narratives as scripts for testing Whisper API
   - Record these narratives (or use text-to-speech) and upload to system
   - Verify transcription accuracy and GPT-4 summary generation

2. **Full PDF Report Testing:**
   - Import User Signup data into `user_signup` table
   - Import Incident Report data into `incident_reports` table
   - Generate PDF report using `/api/pdf/generate` endpoint
   - Verify all 150+ fields populate correctly

3. **End-to-End Testing:**
   - Simulate complete user journey from signup to PDF delivery
   - Test data fetching (`lib/dataFetcher.js`)
   - Test PDF form filling (`src/services/adobePdfFormFillerService.js`)
   - Test email delivery (`lib/emailService.js`)

4. **Edge Case Testing:**
   - Scenario 4: Missing data (hit and run - unknown driver)
   - Scenario 5: Multiple vehicles (4 vehicles involved)
   - Scenario 6: Pedestrian involvement (different liability)
   - Scenario 9: Mechanical failure (third-party garage liability)

### Test Data Variety

These scenarios cover:
- ✅ Simple rear-end (clear fault)
- ✅ Roundabout (disputed fault)
- ✅ Car park (witness needed)
- ✅ Hit and run (missing data)
- ✅ Multi-vehicle (complex data)
- ✅ Pedestrian (serious injury)
- ✅ Weather-related (council liability)
- ✅ Driver distraction (at-fault admission)
- ✅ Mechanical failure (third-party)
- ✅ Minor damage (simple claim)

### UK-Specific Elements

All scenarios include:
- UK registration numbers (format: XX00 XXX)
- UK postcodes (real format, fictional addresses)
- UK driving license numbers (correct format)
- UK insurance companies
- UK locations (Hertfordshire focus)
- UK emergency numbers (999, 0800, 07700)
- UK weather/road conditions
- UK legal context (penalty points, police procedures)

### Next Steps

1. Create SQL import scripts for bulk test data loading
2. Create automated test suite that runs all 10 scenarios
3. Generate 10 actual PDF reports for manual review
4. Document expected vs actual outputs for QA

---

**Last Updated:** 2025-10-21
**Total Scenarios:** 10
**Ready for Testing:** Yes
