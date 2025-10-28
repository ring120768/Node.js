#!/usr/bin/env node
/**
 * Check webhook audit logs to see what data was actually received
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWebhookLog() {
  const userId = 'nkwxh49sm2swwlzxtx1bnkwxhroukfn7';

  console.log('\n📋 Checking webhook audit logs for user:', userId);

  const { data: logs, error } = await supabase
    .from('gdpr_audit_log')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.log('Error:', error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('❌ No webhook logs found');
    return;
  }

  console.log('\n✅ Found', logs.length, 'webhook log(s)\n');

  logs.forEach((log, i) => {
    console.log('='.repeat(70));
    console.log('Log', i + 1, '- Event:', log.event_type);
    console.log('  Created:', log.created_at);
    console.log('  Form ID:', log.form_response?.form_id);
    console.log('  Submission ID:', log.form_response?.response_id);
    console.log('  Answers:', log.form_response?.answers?.length || 0);

    if (log.form_response?.answers) {
      const textAnswers = log.form_response.answers.filter(a =>
        a.type === 'text' || a.type === 'email' || a.type === 'phone_number'
      );
      const boolAnswers = log.form_response.answers.filter(a => a.type === 'boolean');
      const choiceAnswers = log.form_response.answers.filter(a => a.type === 'choice');
      const dateAnswers = log.form_response.answers.filter(a => a.type === 'date');

      console.log('\n  Answer types breakdown:');
      console.log('    - Text/email/phone:', textAnswers.length);
      console.log('    - Boolean:', boolAnswers.length);
      console.log('    - Choice:', choiceAnswers.length);
      console.log('    - Date:', dateAnswers.length);

      if (textAnswers.length > 0) {
        console.log('\n  📝 Text answers (first 10):');
        textAnswers.slice(0, 10).forEach(a => {
          const val = a.text || a.email || a.phone_number;
          console.log('    Field ref:', a.field?.ref);
          console.log('      Value:', val?.substring(0, 80) || '[empty]');
        });
      }

      if (choiceAnswers.length > 0) {
        console.log('\n  ✅ Choice answers (first 5):');
        choiceAnswers.slice(0, 5).forEach(a => {
          console.log('    Field ref:', a.field?.ref);
          console.log('      Choice:', a.choice?.label);
        });
      }

      if (boolAnswers.length > 0) {
        console.log('\n  ☑️  Boolean answers (showing TRUE only):');
        boolAnswers.filter(a => a.boolean === true).slice(0, 10).forEach(a => {
          console.log('    Field ref:', a.field?.ref, '= true');
        });
      }

      if (dateAnswers.length > 0) {
        console.log('\n  📅 Date answers:');
        dateAnswers.forEach(a => {
          console.log('    Field ref:', a.field?.ref);
          console.log('      Date:', a.date);
        });
      }
    }
    console.log('\n');
  });

  // Check if form is complete or partial
  if (logs.length > 0 && logs[0].form_response) {
    const answers = logs[0].form_response.answers || [];
    console.log('🔍 ANALYSIS:');
    console.log('  Total answers received:', answers.length);

    // According to documentation, incident report should have 131+ fields
    if (answers.length < 50) {
      console.log('  ⚠️  WARNING: Expected 100+ answers for complete incident report');
      console.log('  ⚠️  This suggests form submission is INCOMPLETE or IN PROGRESS');
    } else {
      console.log('  ✅ Reasonable number of answers (form likely complete)');
    }
  }
}

checkWebhookLog().catch(console.error);
