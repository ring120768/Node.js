/**
 * Create Test User for Page 12 Testing
 *
 * Creates a test user with valid authentication and generates
 * mock sessionStorage data for Pages 1-11 so you can test Page 12 directly.
 *
 * Run: node scripts/create-test-user-for-page12.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user credentials
const TEST_EMAIL = 'page12test@example.com';
const TEST_PASSWORD = 'TestPass123!';

async function createTestUser() {
  console.log('🧪 Creating test user for Page 12 testing...\n');

  try {
    // 1. Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

    let userId;

    if (existingUser) {
      console.log('✅ Test user already exists:', TEST_EMAIL);
      userId = existingUser.id;
    } else {
      // 2. Create new test user
      const { data: newUser, error: signupError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
          phone: '+447700900123'
        }
      });

      if (signupError) {
        throw new Error(`Signup failed: ${signupError.message}`);
      }

      userId = newUser.user.id;
      console.log('✅ Test user created:', TEST_EMAIL);
    }

    console.log('   User ID:', userId);

    // 3. Generate login session token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signInError) {
      throw new Error(`Login failed: ${signInError.message}`);
    }

    console.log('\n✅ Session token generated');
    console.log('   Token (first 20 chars):', signInData.session.access_token.substring(0, 20) + '...');

    // 4. Generate mock form data for sessionStorage
    const mockData = generateMockFormData();

    console.log('\n📋 Mock form data generated for Pages 1-11');
    console.log('   Total pages:', Object.keys(mockData).length);

    // 5. Output instructions
    console.log('\n' + '='.repeat(70));
    console.log('🎯 TESTING INSTRUCTIONS');
    console.log('='.repeat(70));
    console.log('\n1️⃣ LOGIN TO THE APP:');
    console.log('   - Navigate to: http://localhost:3000/login-improved.html');
    console.log('   - Email:', TEST_EMAIL);
    console.log('   - Password:', TEST_PASSWORD);
    console.log('   - Click "Sign In"');

    console.log('\n2️⃣ LOAD MOCK DATA (In Browser Console):');
    console.log('   - Open DevTools Console (F12)');
    console.log('   - Copy and paste this code:\n');
    console.log(generateBrowserScript(mockData));

    console.log('\n3️⃣ NAVIGATE TO PAGE 12:');
    console.log('   - Go to: http://localhost:3000/incident-form-page12.html');
    console.log('   - You should see the form pre-filled with mock data');

    console.log('\n4️⃣ TEST SUBMISSION:');
    console.log('   - Open DevTools Console to see debugging logs');
    console.log('   - Click "Submit Incident Report" button');
    console.log('   - Watch for:');
    console.log('     ✅ "🔍 Pre-submission auth check" logs');
    console.log('     ✅ "🚀 Sending incident form submission..." log');
    console.log('     ✅ "✅ Incident report submitted successfully" log');
    console.log('     ✅ Redirect to transcription-status.html');

    console.log('\n5️⃣ VERIFY SUCCESS:');
    console.log('   - Should redirect to: /transcription-status.html?incident_id=<uuid>');
    console.log('   - Check server logs for "Incident report created" message');

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Setup complete! Follow the instructions above to test.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

function generateMockFormData() {
  const timestamp = new Date().toISOString();

  return {
    page1: {
      session_id: 'test-session-' + Date.now()
    },
    page2: {
      medical_attention_needed: 'yes',
      medical_injury_details: 'Whiplash and bruising',
      medical_injury_severity: 'moderate',
      medical_hospital_name: 'Royal London Hospital',
      medical_ambulance_called: 'yes',
      medical_treatment_received: 'Neck brace applied, pain medication given',
      medical_symptom_chest_pain: false,
      medical_symptom_uncontrolled_bleeding: false,
      medical_symptom_breathlessness: false,
      medical_symptom_limb_weakness: false,
      medical_symptom_dizziness: true,
      medical_symptom_loss_of_consciousness: false,
      medical_symptom_severe_headache: false,
      medical_symptom_change_in_vision: false,
      medical_symptom_abdominal_pain: false,
      medical_symptom_abdominal_bruising: false,
      medical_symptom_limb_pain_mobility: true,
      medical_symptom_life_threatening: false,
      medical_symptom_none: false
    },
    page3: {
      accident_date: '2025-11-10',
      accident_time: '14:30',
      weather_bright_sunlight: false,
      weather_clear: true,
      weather_cloudy: false,
      weather_raining: false,
      road_condition_dry: true,
      road_condition_wet: false,
      road_type_a_road: true,
      speed_limit: '30',
      your_speed: 25,
      traffic_conditions_moderate: true,
      visibility_good: true
    },
    page4: {
      location: 'High Street, Camden, London',
      what3words: 'filled.count.soap',
      nearest_landmark: 'Camden Town Station',
      junction_type: 'T-junction',
      user_manoeuvre: 'Going straight ahead',
      session_id: 'test-session-' + Date.now()
    },
    page4a: {
      session_id: 'test-session-' + Date.now()
    },
    page5: {
      usual_vehicle: 'yes',
      vehicle_license_plate: 'AB12 CDE',
      dvla_make: 'Ford',
      dvla_model: 'Focus',
      dvla_colour: 'Blue',
      dvla_year: 2020,
      dvla_fuel_type: 'Petrol'
    },
    page6: {
      impact_point_front: true,
      impact_point_driver_side: false,
      damage_to_your_vehicle: 'Front bumper cracked, headlight broken',
      vehicle_driveable: 'yes'
    },
    page7: {
      other_full_name: 'John Smith',
      other_contact_number: '+447700900456',
      other_email_address: 'john.smith@example.com',
      other_vehicle_registration: 'XY98 ZAB',
      other_vehicle_look_up_make: 'Toyota',
      other_vehicle_look_up_model: 'Corolla',
      other_drivers_insurance_company: 'Aviva',
      other_drivers_policy_number: 'AV123456789'
    },
    page9: {
      witnesses_present: 'yes',
      witness_name: 'Jane Doe',
      witness_mobile_number: '+447700900789',
      witness_email_address: 'jane.doe@example.com',
      witness_statement: 'I saw the whole thing. The other car ran the red light.'
    },
    page10: {
      police_attended: 'yes',
      accident_ref_number: 'CAD12345',
      police_force: 'Metropolitan Police',
      officer_name: 'PC Brown',
      officer_badge: '12345',
      user_breath_test: 'negative',
      other_breath_test: 'not_tested',
      airbags_deployed: 'yes',
      seatbelts_worn: 'yes'
    },
    page11: {
      // Additional details page (if any)
    },
    page12: {
      final_feeling: 'fine',
      completed_at: timestamp
    }
  };
}

function generateBrowserScript(mockData) {
  const script = `// Clear existing incident form data
sessionStorage.clear();

// Load mock data for all pages
const mockData = ${JSON.stringify(mockData, null, 2)};

Object.keys(mockData).forEach(pageKey => {
  sessionStorage.setItem(\`incident_\${pageKey}\`, JSON.stringify(mockData[pageKey]));
});

console.log('✅ Mock data loaded into sessionStorage');
console.log('📊 Pages loaded:', Object.keys(mockData).length);
console.log('🔄 Refresh the page to see the data');`;

  return script;
}

createTestUser();
