require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseTypes() {
  console.log('🔍 Diagnosing Page 10 column types...\n');

  const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

  // Try inserting with boolean true/false
  console.log('Test 1: Inserting boolean values...');
  const { data: booleanTest, error: booleanError } = await supabase
    .from('incident_reports')
    .insert([{
      create_user_id: testUserId,
      police_attended: true,
      airbags_deployed: false,
      seatbelts_worn: true
    }])
    .select('police_attended, airbags_deployed, seatbelts_worn')
    .single();

  if (booleanError) {
    console.log(`❌ Boolean test failed: ${booleanError.message}`);
    console.log(`   This suggests columns might be TEXT type\n`);

    // Try with string values
    console.log('Test 2: Trying string "true"/"false"...');
    const { data: stringTest, error: stringError } = await supabase
      .from('incident_reports')
      .insert([{
        create_user_id: testUserId,
        police_attended: "true",
        airbags_deployed: "false",
        seatbelts_worn: "true"
      }])
      .select('police_attended, airbags_deployed, seatbelts_worn')
      .single();

    if (stringError) {
      console.log(`❌ String test also failed: ${stringError.message}\n`);
    } else {
      console.log(`✅ String test succeeded!`);
      console.log(`Returned values:`, stringTest);
      console.log(`\n💡 Conclusion: Columns are TEXT type, not BOOLEAN`);
      console.log(`   Need to create migration to convert to BOOLEAN\n`);

      // Cleanup
      await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
    }
  } else {
    console.log(`✅ Boolean test succeeded!`);
    console.log(`Returned values:`, booleanTest);
    console.log(`Types: ${typeof booleanTest.police_attended}, ${typeof booleanTest.airbags_deployed}, ${typeof booleanTest.seatbelts_worn}`);
    console.log(`\n💡 Conclusion: Columns are BOOLEAN type\n`);

    // Cleanup
    await supabase.from('incident_reports').delete().eq('create_user_id', testUserId);
  }
}

diagnoseTypes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
