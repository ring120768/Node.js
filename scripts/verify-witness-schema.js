require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyWitnessSchema() {
  console.log('🔍 Verifying incident_witnesses table schema...\n');

  try {
    // Try to fetch one witness record to see actual column names
    const { data: sampleWitness, error: fetchError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .limit(1)
      .maybeSingle(); // Use maybeSingle to avoid error if no records

    if (fetchError) {
      console.log('❌ Error fetching witness data:', fetchError.message);
      return;
    }

    if (!sampleWitness) {
      console.log('⚠️  No witness records found in database.');
      console.log('   Creating test record to discover schema...\n');

      // Create a test witness to discover schema
      const testUserId = '1af483d1-35c3-4202-a50f-4b5a8aa631f7';

      // First, get or create an incident report
      let { data: incident, error: incidentError } = await supabase
        .from('incident_reports')
        .select('id')
        .eq('create_user_id', testUserId)
        .limit(1)
        .maybeSingle();

      if (!incident) {
        console.log('   No incident found, creating test incident...');
        const { data: newIncident, error: createError } = await supabase
          .from('incident_reports')
          .insert([{ create_user_id: testUserId }])
          .select('id')
          .single();

        if (createError) {
          console.log('   ❌ Failed to create test incident:', createError.message);
          return;
        }
        incident = newIncident;
      }

      console.log('   ✅ Using incident ID:', incident.id);

      // Try different foreign key variations
      const testCases = [
        { create_user_id: testUserId, witness_index: 1 },
        { incident_id: incident.id, witness_index: 1 },
        { incident_report_id: incident.id, witness_index: 1 },
        { create_user_id: testUserId, witness_number: 1 },
        { incident_id: incident.id, witness_number: 1 },
        { incident_report_id: incident.id, witness_number: 1 },
      ];

      let successfulInsert = null;

      for (const testData of testCases) {
        const { data: insertedWitness, error: insertError } = await supabase
          .from('incident_witnesses')
          .insert([{
            ...testData,
            witness_name: 'Schema Test Witness',
            witness_phone: '01234567890',
            witness_email: 'test@example.com'
          }])
          .select()
          .maybeSingle();

        if (!insertError && insertedWitness) {
          console.log(`   ✅ Successfully inserted with:`, Object.keys(testData).join(', '));
          successfulInsert = insertedWitness;

          // Clean up test record
          await supabase
            .from('incident_witnesses')
            .delete()
            .eq('id', insertedWitness.id);

          break;
        }
      }

      if (!successfulInsert) {
        console.log('   ❌ Could not determine correct schema');
        return;
      }

      sampleWitness = successfulInsert;
    }

    // Analyze the schema
    console.log('📋 incident_witnesses Table Columns:\n');
    const columns = Object.keys(sampleWitness);
    columns.forEach(col => {
      const value = sampleWitness[col];
      const type = typeof value;
      console.log(`   ${col.padEnd(30)} (${type})`);
    });

    console.log('\n🔍 Schema Analysis:\n');

    // Check ordering field
    const hasWitnessNumber = 'witness_number' in sampleWitness;
    const hasWitnessIndex = 'witness_index' in sampleWitness;

    console.log(`   Ordering field:`);
    if (hasWitnessNumber) {
      console.log(`      ✅ witness_number EXISTS`);
      console.log(`      → dataFetcher.js is CORRECT (uses witness_number)`);
    } else if (hasWitnessIndex) {
      console.log(`      ❌ witness_index EXISTS (not witness_number)`);
      console.log(`      → dataFetcher.js needs UPDATE (change to witness_index)`);
    } else {
      console.log(`      ⚠️  Neither witness_number nor witness_index found`);
      console.log(`      → Check schema manually`);
    }

    // Check foreign key field
    console.log(`\n   Foreign key field:`);
    const hasIncidentReportId = 'incident_report_id' in sampleWitness;
    const hasIncidentId = 'incident_id' in sampleWitness;
    const hasCreateUserId = 'create_user_id' in sampleWitness;

    if (hasIncidentReportId) {
      console.log(`      ✅ incident_report_id EXISTS`);
      console.log(`      → dataFetcher.js is CORRECT (uses incident_report_id)`);
    } else if (hasIncidentId) {
      console.log(`      ❌ incident_id EXISTS (not incident_report_id)`);
      console.log(`      → dataFetcher.js needs UPDATE (change to incident_id)`);
    } else if (hasCreateUserId) {
      console.log(`      ⚠️  create_user_id EXISTS (unusual for witnesses)`);
      console.log(`      → Witnesses linked directly to user, not incident`);
    } else {
      console.log(`      ⚠️  No obvious foreign key found`);
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 DATAFECHER.JS STATUS');
    console.log('========================================');

    const orderingCorrect = hasWitnessNumber;
    const foreignKeyCorrect = hasIncidentReportId;

    if (orderingCorrect && foreignKeyCorrect) {
      console.log('✅ dataFetcher.js is CORRECT - no changes needed');
    } else {
      console.log('❌ dataFetcher.js needs UPDATES:');
      if (!orderingCorrect) {
        const correctField = hasWitnessIndex ? 'witness_index' : '(unknown)';
        console.log(`   - Change ordering from 'witness_number' to '${correctField}'`);
      }
      if (!foreignKeyCorrect) {
        const correctField = hasIncidentId ? 'incident_id' : hasCreateUserId ? 'create_user_id' : '(unknown)';
        console.log(`   - Change foreign key from 'incident_report_id' to '${correctField}'`);
      }
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.error('Stack:', error.stack);
  }
}

verifyWitnessSchema()
  .then(() => console.log('✅ Verification complete'))
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
