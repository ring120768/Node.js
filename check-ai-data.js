require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Check ai_summary table
  const { data: summaries, error: sumErr } = await supabase
    .from('ai_summary')
    .select('id, incident_id, created_at, summary_text')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('=== AI Summary Table ===');
  if (sumErr) {
    console.log('Error:', sumErr.message);
  } else if (summaries && summaries.length > 0) {
    summaries.forEach(s => {
      console.log('ID:', s.id);
      console.log('Incident ID:', s.incident_id);
      console.log('Created:', s.created_at);
      console.log('Summary length:', s.summary_text ? s.summary_text.length : 0, 'chars');
      console.log('---');
    });
  } else {
    console.log('No AI summaries found');
  }

  // Check incident_reports for AI fields
  const { data: incidents, error: incErr } = await supabase
    .from('incident_reports')
    .select('id, ai_summary, ai_analysis_complete, ai_incident_summary')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('');
  console.log('=== Incident Reports AI Fields ===');
  if (incErr) {
    console.log('Error:', incErr.message);
  } else if (incidents && incidents.length > 0) {
    incidents.forEach(i => {
      console.log('ID:', i.id);
      console.log('ai_analysis_complete:', i.ai_analysis_complete);
      console.log('ai_summary length:', i.ai_summary ? i.ai_summary.length : 0);
      console.log('ai_incident_summary length:', i.ai_incident_summary ? i.ai_incident_summary.length : 0);
      console.log('---');
    });
  } else {
    console.log('No incidents found');
  }

  process.exit(0);
})();
