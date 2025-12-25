#!/usr/bin/env node
/**
 * Test PDF generation with font fix
 * Generates locally then checks for font issues
 */

require('dotenv').config();
const { fetchAllData } = require('./lib/dataFetcher');
const pdfService = require('./src/services/adobePdfFormFillerService');
const fs = require('fs');
const { execSync } = require('child_process');

const userId = process.argv[2] || 'e945a22a-ae28-4499-b231-1cac97647e90';

async function main() {
  console.log('🧪 PDF Font Test\n');
  console.log('User ID:', userId);

  // 1. Fetch data
  console.log('\n📊 Fetching user data...');
  const data = await fetchAllData(userId);

  if (!data.currentIncident) {
    console.log('❌ No incident data found');
    process.exit(1);
  }

  console.log('   ✅ Data fetched');
  console.log('   AI fields:');
  console.log('     voice_transcription:', data.currentIncident.voice_transcription?.length || 0, 'chars');
  console.log('     ai_summary:', data.currentIncident.ai_summary?.length || 0, 'chars');
  console.log('     closing_statement:', data.currentIncident.closing_statement?.length || 0, 'chars');
  console.log('     final_review:', data.currentIncident.final_review?.length || 0, 'chars');

  // 2. Generate PDF
  console.log('\n📄 Generating PDF...');
  const pdfBuffer = await pdfService.fillPdfForm(data);

  const outputPath = 'test-output/font-test.pdf';
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`   ✅ PDF saved to ${outputPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  // 3. Extract text and check for issues
  console.log('\n🔍 Checking for font issues...');
  try {
    const text = execSync(`pdftotext ${outputPath} - 2>/dev/null`, { encoding: 'utf8' });

    // Check for garbled text (Arabic-like characters from font issues)
    const arabicPattern = /[\u0600-\u06FF]{5,}/g;
    const garbledMatches = text.match(arabicPattern);

    if (garbledMatches && garbledMatches.length > 0) {
      console.log('   ❌ FONT ISSUE DETECTED!');
      console.log('   Found', garbledMatches.length, 'instances of garbled text');
      console.log('   Sample:', garbledMatches[0]);
    } else {
      console.log('   ✅ No font issues detected!');
    }

    // Check for actual AI content
    const hasTranscription = /morning|approaching|roundabout|junction/i.test(text);
    const hasSummary = /collision|claimant|liability/i.test(text);
    const hasClosing = /Summary of Events|Key Points/i.test(text);
    const hasReview = /Case Assessment|Recommended|Next Steps/i.test(text);

    console.log('\n   AI Content Check:');
    console.log(`     ${hasTranscription ? '✅' : '❌'} Voice Transcription content`);
    console.log(`     ${hasSummary ? '✅' : '❌'} AI Summary content`);
    console.log(`     ${hasClosing ? '✅' : '❌'} Closing Statement content`);
    console.log(`     ${hasReview ? '✅' : '❌'} Final Review content`);

    if (hasTranscription && hasSummary && hasClosing && hasReview && !garbledMatches) {
      console.log('\n🎉 SUCCESS! PDF has all AI content with no font issues.');
    }

  } catch (e) {
    console.log('   ⚠️ pdftotext not available - open PDF manually to check');
  }

  console.log('\n✅ Test complete! Open', outputPath, 'to verify visually.');
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
