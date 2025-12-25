#!/usr/bin/env node
/**
 * Quick test: Regenerate PDF on Railway and check AI content
 * Usage: node test-railway-pdf.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { execSync } = require('child_process');

const RAILWAY_URL = 'https://car-crash-lawyer-ai-production.up.railway.app';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('🚀 Railway PDF Generation Test\n');

  // 1. Get latest user
  const { data: users } = await supabase
    .from('user_signup')
    .select('create_user_id, first_name, last_name, email')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!users || !users.length) {
    console.log('❌ No users found. Run a manual test first to create data.');
    process.exit(1);
  }

  const user = users[0];
  console.log(`👤 User: ${user.first_name} ${user.last_name} (${user.create_user_id})`);

  // 2. Check Railway deployment
  console.log('\n📡 Checking Railway deployment...');
  try {
    const healthRes = await fetch(`${RAILWAY_URL}/healthz`);
    const health = await healthRes.json();
    console.log(`   Commit: ${health.commit}`);
    console.log(`   Uptime: ${Math.round(health.uptime / 60)} minutes`);
  } catch (e) {
    console.log('   ⚠️ Could not check health:', e.message);
  }

  // 3. Trigger PDF generation
  console.log('\n📄 Triggering PDF generation on Railway...');
  try {
    const pdfRes = await fetch(`${RAILWAY_URL}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.create_user_id })
    });

    if (!pdfRes.ok) {
      const error = await pdfRes.text();
      console.log(`   ❌ PDF generation failed: ${pdfRes.status}`);
      console.log(`   ${error.substring(0, 200)}`);
      process.exit(1);
    }

    const result = await pdfRes.json();
    console.log('   ✅ PDF generated successfully');
    if (result.pdfUrl) console.log(`   URL: ${result.pdfUrl.substring(0, 80)}...`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    process.exit(1);
  }

  // 4. Wait a moment for storage
  await new Promise(r => setTimeout(r, 2000));

  // 5. Download latest PDF from storage
  console.log('\n📥 Downloading generated PDF...');
  const { data: forms } = await supabase
    .from('completed_incident_forms')
    .select('pdf_storage_path, created_at')
    .eq('create_user_id', user.create_user_id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!forms || !forms.length || !forms[0].pdf_storage_path) {
    console.log('   ❌ No PDF found in storage');
    process.exit(1);
  }

  const { data: fileData, error: dlError } = await supabase.storage
    .from('generated_reports')
    .download(forms[0].pdf_storage_path);

  if (dlError) {
    console.log(`   ❌ Download error: ${dlError.message}`);
    process.exit(1);
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const pdfPath = 'test-output/railway-test.pdf';
  fs.writeFileSync(pdfPath, buffer);
  console.log(`   ✅ Saved to ${pdfPath} (${(buffer.length / 1024).toFixed(1)} KB)`);

  // 6. Extract and check AI content
  console.log('\n🔍 Checking AI content in PDF...');
  try {
    const text = execSync(`pdftotext ${pdfPath} - 2>/dev/null`, { encoding: 'utf8' });

    // Check for key AI content markers
    const checks = [
      { name: 'Voice Transcription', pattern: /transcription|recording|statement/i },
      { name: 'AI Summary', pattern: /summary|synthesizes|analysis/i },
      { name: 'Closing Statement', pattern: /closing|statement|narrative/i },
      { name: 'Final Review', pattern: /review|next steps|recommendations/i }
    ];

    // Check for garbled text (Arabic-like characters from font issues)
    const hasGarbledText = /[\u0600-\u06FF]{5,}/.test(text);

    console.log('');
    checks.forEach(check => {
      const found = check.pattern.test(text);
      console.log(`   ${found ? '✅' : '❌'} ${check.name}`);
    });

    if (hasGarbledText) {
      console.log('\n   ⚠️  FONT ISSUE: Garbled Arabic-like characters detected!');
      console.log('   The Google Fonts fix may not be deployed yet.');
    } else {
      console.log('\n   ✅ No font issues detected');
    }

    // Show a sample of the AI content
    const aiSample = text.match(/This AI-generated[\s\S]{0,200}/);
    if (aiSample) {
      console.log('\n   📝 Sample AI content:');
      console.log(`   "${aiSample[0].substring(0, 150)}..."`);
    }

  } catch (e) {
    console.log(`   ⚠️ pdftotext not available: ${e.message}`);
    console.log('   Open the PDF manually to check content.');
  }

  console.log('\n✅ Test complete! Check test-output/railway-test.pdf');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
