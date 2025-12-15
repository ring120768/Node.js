const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './test-output/filled-form-adeedf9d-fe8e-43c9-80d1-30db3c226522.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('🎉 FINAL FIELD VERIFICATION:\n');

  // Check all 4 newly added fields
  const newFields = [
    { name: 'date_of_birth', type: 'text', expected: '1968-07-12' },
    { name: 'are_you_safe', type: 'checkbox', expected: true },
    { name: 'street_name_optional', type: 'text', expected: 'Home' },
    { name: 'emergency_recording_timestamp', type: 'text', expected: '2025-11-15T14:17:47.181+00:00' }
  ];

  newFields.forEach(({ name, type, expected }) => {
    try {
      const field = type === 'text' ? form.getTextField(name) : form.getCheckBox(name);
      const value = type === 'text' ? field.getText() : field.isChecked();
      const matches = type === 'text' ? value === expected : value === expected;
      const status = matches ? '✅' : (value ? '⚠️' : '❌');

      console.log(`${status} ${name}:`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Got: ${value || 'EMPTY'}`);
      console.log('');
    } catch (e) {
      console.log(`❌ ${name}: ERROR - ${e.message}\n`);
    }
  });

  // Overall coverage
  const allFields = form.getFields();
  let populated = 0;

  allFields.forEach(field => {
    let hasValue = false;
    try {
      if (field.constructor.name === 'PDFTextField') {
        hasValue = field.getText() !== '' && field.getText() !== null;
      } else if (field.constructor.name === 'PDFCheckBox') {
        hasValue = field.isChecked();
      }
    } catch (e) {}
    if (hasValue) populated++;
  });

  console.log('📊 PDF Field Population:');
  console.log(`   Total fields: ${allFields.length}`);
  console.log(`   Populated: ${populated}`);
  console.log(`   Empty: ${allFields.length - populated}`);
  console.log(`   Coverage: ${((populated / allFields.length) * 100).toFixed(1)}%`);
})();
