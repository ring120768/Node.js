const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== VERIFYING TRANSCRIPTION DATA IN PDF ===\n');

  const pdfPath = path.join(__dirname, 'test-output', 'filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found:', pdfPath);
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Page 13: AI Summary
  console.log('📋 PAGE 13: AI Summary');
  try {
    const summaryField = form.getTextField('ai_summary_of_accident_data_transcription');
    const summaryText = summaryField.getText();

    if (summaryText && summaryText.trim().length > 0) {
      console.log(`   ✅ Has data: ${summaryText.length} chars`);
      console.log(`   Preview: ${summaryText.substring(0, 150)}...\n`);
    } else {
      console.log('   ❌ Empty or NULL\n');
    }
  } catch (error) {
    console.log(`   ❌ Field not found: ${error.message}\n`);
  }

  // Page 14: AI Transcription / Detailed Account
  console.log('📝 PAGE 14: AI Transcription / Detailed Account');
  try {
    const transcriptionField = form.getTextField('detailed_account_of_what_happened');
    const transcriptionText = transcriptionField.getText();

    if (transcriptionText && transcriptionText.trim().length > 0) {
      console.log(`   ✅ Has data: ${transcriptionText.length} chars`);
      console.log(`   Preview: ${transcriptionText.substring(0, 150)}...\n`);
    } else {
      console.log('   ❌ Empty or NULL\n');
    }
  } catch (error) {
    console.log(`   ❌ Field not found: ${error.message}\n`);
  }

  // Summary
  console.log('=== SUMMARY ===');
  let summaryHasData = false;
  let transcriptionHasData = false;

  try {
    const summaryText = form.getTextField('ai_summary_of_accident_data_transcription').getText();
    summaryHasData = summaryText && summaryText.trim().length > 0;
  } catch (e) {}

  try {
    const transcriptionText = form.getTextField('detailed_account_of_what_happened').getText();
    transcriptionHasData = transcriptionText && transcriptionText.trim().length > 0;
  } catch (e) {}

  console.log(`Page 13 (AI Summary): ${summaryHasData ? '✅ POPULATED' : '❌ EMPTY'}`);
  console.log(`Page 14 (Transcription): ${transcriptionHasData ? '✅ POPULATED' : '❌ EMPTY'}`);

  const bothPopulated = summaryHasData && transcriptionHasData;
  const onePopulated = summaryHasData || transcriptionHasData;

  if (bothPopulated) {
    console.log('\n🎉 SUCCESS: Both pages 13 & 14 have data!');
  } else if (onePopulated) {
    console.log('\n⚠️  PARTIAL: One page has data, one is empty');
  } else {
    console.log('\n❌ FAILURE: Both pages 13 & 14 are empty');
  }
})();
