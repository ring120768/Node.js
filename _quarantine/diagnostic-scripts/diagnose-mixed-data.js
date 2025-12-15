// Diagnose mixed incident data issue
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseMixedData() {
  const userId = '35a7475f-60ca-4c5d-bc48-d13a299f4309';

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 MIXED DATA DIAGNOSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Fetch all incident reports for this user (what dataFetcher does)
  const { data: incidents, error: incidentError } = await supabase
    .from('incident_reports')
    .select('id, created_at, accident_date, location, voice_transcription, ai_summary')
    .or(`auth_user_id.eq.${userId},create_user_id.eq.${userId},user_id.eq.${userId}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (incidentError) {
    console.error('❌ Error:', incidentError.message);
    process.exit(1);
  }

  console.log(`📊 Found ${incidents.length} incident reports for user:\n`);

  incidents.forEach((incident, index) => {
    const isLatest = index === 0;
    console.log(`${isLatest ? '👉 ' : '   '}Incident ${index + 1} (${isLatest ? 'LATEST - SHOULD BE USED' : 'OLD'})`);
    console.log(`   ID: ${incident.id}`);
    console.log(`   Created: ${incident.created_at}`);
    console.log(`   Accident Date: ${incident.accident_date || 'NULL'}`);
    console.log(`   Location: ${incident.location ? incident.location.substring(0, 50) + '...' : 'NULL'}`);
    console.log(`   Voice Transcription: ${incident.voice_transcription ? incident.voice_transcription.length + ' chars' : 'NULL'}`);
    console.log(`   AI Summary: ${incident.ai_summary ? incident.ai_summary.length + ' chars' : 'NULL'}`);
    console.log('');
  });

  // 2. Check witnesses (linked by incident_id)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👥 WITNESSES DATA\n');

  for (let i = 0; i < Math.min(incidents.length, 3); i++) {
    const incident = incidents[i];
    const { data: witnesses, error: witnessError } = await supabase
      .from('incident_witnesses')
      .select('id, incident_id, witness_name, created_at')
      .eq('incident_id', incident.id)
      .is('deleted_at', null);

    console.log(`Incident ${i + 1} (${incident.id.substring(0, 8)}...): ${witnesses ? witnesses.length : 0} witnesses`);
    if (witnesses && witnesses.length > 0) {
      witnesses.forEach(w => {
        console.log(`  - ${w.witness_name || 'Unnamed'} (created: ${w.created_at})`);
      });
    }
  }
  console.log('');

  // 3. Check other vehicles (linked by incident_id)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚗 OTHER VEHICLES DATA\n');

  for (let i = 0; i < Math.min(incidents.length, 3); i++) {
    const incident = incidents[i];
    const { data: vehicles, error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .select('id, incident_id, vehicle_registration, created_at')
      .eq('incident_id', incident.id)
      .is('deleted_at', null);

    console.log(`Incident ${i + 1} (${incident.id.substring(0, 8)}...): ${vehicles ? vehicles.length : 0} other vehicles`);
    if (vehicles && vehicles.length > 0) {
      vehicles.forEach(v => {
        console.log(`  - ${v.vehicle_registration || 'No Reg'} (created: ${v.created_at})`);
      });
    }
  }
  console.log('');

  // 4. Check AI transcription (linked by create_user_id, NOT incident_id!)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎤 AI TRANSCRIPTION DATA\n');

  const { data: transcriptions, error: transError } = await supabase
    .from('ai_transcription')
    .select('id, create_user_id, transcript_text, created_at')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  console.log(`Found ${transcriptions ? transcriptions.length : 0} AI transcriptions for user:`);
  if (transcriptions) {
    transcriptions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.transcript_text ? t.transcript_text.substring(0, 60) + '...' : 'NULL'} (${t.created_at})`);
    });
  }
  console.log('');

  // 5. THE PROBLEM SUMMARY
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  ROOT CAUSE ANALYSIS\n');

  const latestIncidentId = incidents[0].id;

  console.log('CURRENT BEHAVIOR:');
  console.log(`  ✅ incident_reports: Uses LATEST (${latestIncidentId.substring(0, 8)}...)`);
  console.log(`  ✅ incident_witnesses: Correctly filtered by incident_id (${latestIncidentId.substring(0, 8)}...)`);
  console.log(`  ✅ incident_other_vehicles: Correctly filtered by incident_id (${latestIncidentId.substring(0, 8)}...)`);
  console.log(`  ❌ ai_transcription: Uses create_user_id (may return OLD data if multiple incidents)`);
  console.log('');

  console.log('SOLUTION:');
  console.log('  1. Add incident_id column to ai_transcription table');
  console.log('  2. Update ai.controller.js to set incident_id when creating transcriptions');
  console.log('  3. Update dataFetcher.js to filter by incident_id instead of create_user_id');
  console.log('  4. Update pdf.controller.js to filter by incident_id instead of create_user_id');

  process.exit(0);
}

diagnoseMixedData();
