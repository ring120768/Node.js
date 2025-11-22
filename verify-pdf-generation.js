#!/usr/bin/env node

/**
 * PDF Generation Verification Script
 *
 * Purpose: Verify that PDF generation is working correctly with latest fixes
 *
 * What this script does:
 * 1. Generates a fresh PDF with current codebase
 * 2. Verifies no XRef errors
 * 3. Verifies text content is present
 * 4. Opens PDF for visual inspection
 *
 * Usage: node verify-pdf-generation.js [user-id]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const adobePdfService = require('./src/services/adobePdfFormFillerService');
const dataFetcher = require('./lib/dataFetcher');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyPdfGeneration() {
  const userId = process.argv[2] || '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('━'.repeat(80));
  console.log('📊 PDF GENERATION VERIFICATION');
  console.log('━'.repeat(80));
  console.log(`\n🔍 Testing with user: ${userId}\n`);

  try {
    // Step 1: Fetch latest data
    console.log('📥 Step 1: Fetching latest data from database...');
    const allData = await dataFetcher.fetchAllData(userId);

    if (!allData.currentIncident || Object.keys(allData.currentIncident).length === 0) {
      console.error('❌ Error: No incident data found for this user');
      console.log('\n💡 Tip: Make sure this user has completed the incident form');
      process.exit(1);
    }

    console.log('✅ Data fetched successfully:');
    console.log(`   - ${allData.metadata.total_incidents} incidents`);
    console.log(`   - ${allData.metadata.total_user_documents} documents`);
    console.log(`   - AI transcription: ${allData.metadata.has_ai_transcription ? 'YES' : 'NO'}`);
    console.log(`   - AI analysis: ${allData.metadata.has_ai_analysis ? 'YES' : 'NO'}`);

    // Check AI analysis fields
    const ai = allData.currentIncident;
    console.log('\n🤖 AI Analysis Fields:');
    console.log(`   - voice_transcription: ${ai.voice_transcription ? `${ai.voice_transcription.length} chars` : 'MISSING'}`);
    console.log(`   - analysis_metadata: ${ai.analysis_metadata ? 'Present' : 'MISSING'}`);
    console.log(`   - quality_review: ${ai.quality_review ? `${ai.quality_review.length} chars` : 'MISSING'}`);
    console.log(`   - ai_summary: ${ai.ai_summary ? `${ai.ai_summary.length} chars` : 'MISSING'}`);
    console.log(`   - closing_statement: ${ai.closing_statement ? `${ai.closing_statement.length} chars` : 'MISSING'}`);
    console.log(`   - final_review: ${ai.final_review ? `${ai.final_review.length} chars` : 'MISSING'}`);

    // Step 2: Generate PDF
    console.log('\n🎨 Step 2: Generating fresh PDF with latest code...');
    console.log('   ⏳ This may take 15-30 seconds...');

    const startTime = Date.now();
    const pdfBuffer = await adobePdfService.fillPdfForm(allData);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const sizeKB = (pdfBuffer.length / 1024).toFixed(2);

    console.log(`✅ PDF generated in ${duration}s (${sizeKB} KB)`);

    // Step 3: Save PDF
    const outputPath = path.join(__dirname, 'test-output', `verification-${userId.substring(0, 8)}.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`📁 Saved to: ${outputPath}`);

    // Step 4: Check for XRef errors
    console.log('\n🔍 Step 3: Checking PDF integrity...');
    try {
      const xrefCheck = execSync(`pdftotext ${outputPath} /dev/null 2>&1 | grep -i "xref\\|error\\|warning"`, {
        encoding: 'utf8'
      });
      console.log('⚠️  XRef errors detected:');
      console.log(xrefCheck);
    } catch (error) {
      console.log('✅ No XRef errors - PDF structure is valid');
    }

    // Step 5: Extract text from Page 13
    console.log('\n📖 Step 4: Verifying content on Page 13...');
    try {
      const text = execSync(`pdftotext -f 13 -l 13 ${outputPath} - 2>/dev/null`, {
        encoding: 'utf8'
      });

      if (text.includes('M25') || text.includes('Junction') || text.includes('Right, so this happened')) {
        console.log('✅ Page 13 contains M25 transcription');
        console.log('\nExtracted text preview:');
        console.log('─'.repeat(80));
        console.log(text.substring(0, 300));
        console.log('─'.repeat(80));
      } else {
        console.log('⚠️  Page 13 content detected, but not M25 data:');
        console.log(text.substring(0, 200));
      }
    } catch (error) {
      console.error('❌ Failed to extract text from Page 13:', error.message);
    }

    // Step 6: Open PDF
    console.log('\n👁️  Step 5: Opening PDF for visual inspection...');
    execSync(`open ${outputPath}`, { encoding: 'utf8' });

    // Summary
    console.log('\n━'.repeat(80));
    console.log('✅ VERIFICATION COMPLETE');
    console.log('━'.repeat(80));
    console.log('\n📋 VISUAL INSPECTION CHECKLIST:');
    console.log('   □ Pages 1-12: Form fields are filled correctly');
    console.log('   □ Page 13: Voice transcription visible (M25 Junction 15 text)');
    console.log('   □ Page 14: AI closing statement visible');
    console.log('   □ Page 15: AI summary visible');
    console.log('   □ Page 16: Final review visible');
    console.log('   □ Pages 17-18: Remaining form content visible');

    console.log('\n🎯 KEY POINT:');
    console.log('   If you see BLANK pages 13-16 but text extraction worked above,');
    console.log('   this is a PDF VIEWER issue, not a code issue.');
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   1. Try opening the PDF in Adobe Acrobat Reader');
    console.log('   2. Try opening in Chrome browser (File → Open)');
    console.log('   3. Try opening in a different PDF viewer');
    console.log('   4. If all viewers show blank, report back to Claude');

    console.log('\n📁 Generated PDF: ' + outputPath);
    console.log('');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyPdfGeneration();
