const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== VERIFYING PAGE 15: EMERGENCY AUDIO (AI EAVESDROPPER) ===\n');

  const pdfPath = path.join(__dirname, 'test-output', 'filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found:', pdfPath);
    console.log('\nRun this first: node test-form-filling.js ee7cfcaf-5810-4c62-b99b-ab0f2291733e');
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Page 15 Emergency Audio fields
  const emergencyFields = [
    'emergency_audio_transcription',
    'emergency_recording_timestamp'
  ];

  console.log('📋 Emergency Audio Recording (Page 15):\n');

  let populatedCount = 0;
  let emptyCount = 0;

  emergencyFields.forEach(fieldName => {
    try {
      const field = form.getTextField(fieldName);
      const text = field.getText();

      if (text && text.trim().length > 0) {
        if (fieldName === 'emergency_audio_transcription') {
          console.log(`   ✅ ${fieldName}:`);
          console.log(`      Length: ${text.length} chars`);
          console.log(`      Preview: ${text.substring(0, 150)}...`);
        } else {
          console.log(`   ✅ ${fieldName}: ${text}`);
        }
        populatedCount++;
      } else {
        console.log(`   ❌ ${fieldName}: (empty)`);
        emptyCount++;
      }
    } catch (error) {
      console.log(`   ⚠️  ${fieldName}: Field not found - ${error.message}`);
      emptyCount++;
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Populated: ${populatedCount}/${emergencyFields.length}`);
  console.log(`Empty: ${emptyCount}/${emergencyFields.length}`);

  if (populatedCount === emergencyFields.length) {
    console.log('\n🎉 SUCCESS: All emergency audio fields populated!');
  } else if (populatedCount > 0) {
    console.log('\n⚠️  PARTIAL: Some emergency audio fields populated');
  } else {
    console.log('\n❌ NO DATA: Emergency audio fields empty');
    console.log('\nℹ️  This is expected if user did not use the AI Eavesdropper feature');
    console.log('   The AI Eavesdropper is activated via the 🎤 button in incident.html');
  }
})();
