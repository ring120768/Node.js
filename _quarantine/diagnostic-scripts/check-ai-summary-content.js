// Check AI summary content length
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkContent() {
  const { data, error } = await supabase
    .from('incident_reports')
    .select('ai_summary')
    .eq('id', '16d646f7-42a8-4218-ae23-4221c9ec912a')
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('AI Summary Length:', data.ai_summary.length, 'characters');
  console.log('\nContent Preview (first 500 chars):');
  console.log(data.ai_summary.substring(0, 500));
  console.log('\n...\n');
  console.log('Content End (last 500 chars):');
  console.log(data.ai_summary.substring(data.ai_summary.length - 500));

  process.exit(0);
}

checkContent();
