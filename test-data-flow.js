require('dotenv').config();
const { fetchAllData } = require('./lib/dataFetcher');

(async () => {
  // Get the most recent user from the database
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: users } = await supabase
    .from('user_signup')
    .select('create_user_id')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }

  const userId = users[0].create_user_id;
  console.log('Testing with user:', userId);
  console.log('');

  // Fetch all data using dataFetcher
  const data = await fetchAllData(userId);

  console.log('=== currentIncident fields ===');
  const incident = data.currentIncident || {};
  console.log('Has currentIncident:', !!data.currentIncident);
  console.log('');
  console.log('Page 13 fields:');
  console.log('  voice_transcription:', incident.voice_transcription ? incident.voice_transcription.length + ' chars' : 'MISSING');
  console.log('  analysis_metadata:', incident.analysis_metadata ? 'Present' : 'MISSING');
  console.log('  quality_review:', incident.quality_review ? incident.quality_review.length + ' chars' : 'MISSING');
  console.log('');
  console.log('Page 14 fields:');
  console.log('  closing_statement:', incident.closing_statement ? incident.closing_statement.length + ' chars' : 'MISSING');
  console.log('');
  console.log('Page 15 fields:');
  console.log('  ai_summary:', incident.ai_summary ? incident.ai_summary.length + ' chars' : 'MISSING');
  console.log('');
  console.log('Page 16 fields:');
  console.log('  final_review:', incident.final_review ? incident.final_review.length + ' chars' : 'MISSING');

  process.exit(0);
})();
