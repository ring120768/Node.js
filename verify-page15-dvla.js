const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== VERIFYING PAGE 15: DVLA DATA ===\n');

  const pdfPath = path.join(__dirname, 'test-output', 'filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // DVLA fields from adobePdfFormFillerService.js lines 725-730
  const dvlaFields = [
    'dvla_driver_name',
    'dvla_registration',
    'dvla_make',
    'dvla_model',
    'dvla_color',
    'dvla_year_of_manufacture'
  ];

  console.log('📋 DVLA Report Fields (Page 15):\n');

  let populatedCount = 0;
  let emptyCount = 0;

  dvlaFields.forEach(fieldName => {
    try {
      const field = form.getTextField(fieldName);
      const text = field.getText();

      if (text && text.trim().length > 0) {
        console.log(`   ✅ ${fieldName}: ${text}`);
        populatedCount++;
      } else {
        console.log(`   ❌ ${fieldName}: (empty)`);
        emptyCount++;
      }
    } catch (error) {
      console.log(`   ⚠️  ${fieldName}: Field not found`);
      emptyCount++;
    }
  });

  console.log('\n=== SUMMARY ===');
  console.log(`Populated: ${populatedCount}/${dvlaFields.length}`);
  console.log(`Empty: ${emptyCount}/${dvlaFields.length}`);

  if (populatedCount === dvlaFields.length) {
    console.log('\n🎉 SUCCESS: All DVLA fields populated!');
  } else if (populatedCount > 0) {
    console.log('\n⚠️  PARTIAL: Some DVLA fields populated');
  } else {
    console.log('\n❌ FAILURE: No DVLA data found');
    console.log('\nℹ️  This is expected if user has no DVLA vehicle lookup data');
  }
})();
