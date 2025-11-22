const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './test-output/filled-form-adeedf9d-fe8e-43c9-80d1-30db3c226522.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('🔍 Auditing newly mapped fields:\n');

  // Check the 3 fields we just added
  const fieldsToCheck = [
    { name: 'date_of_birth', type: 'text' },
    { name: 'are_you_safe', type: 'checkbox' },
    { name: 'six_point_safety_check', type: 'checkbox' }
  ];

  fieldsToCheck.forEach(({ name, type }) => {
    try {
      const field = type === 'text' ? form.getTextField(name) : form.getCheckBox(name);
      const value = type === 'text' ? field.getText() : field.isChecked();
      const status = value ? '✅' : '❌';
      console.log(`${status} ${name}: ${value || 'EMPTY'}`);
    } catch (e) {
      console.log(`❌ ${name}: ERROR - ${e.message}`);
    }
  });

  console.log('\n📊 Field Population Summary:');
  const allFields = form.getFields();
  let populated = 0;
  let empty = 0;

  allFields.forEach(field => {
    const fieldName = field.getName();
    let hasValue = false;

    try {
      if (field.constructor.name === 'PDFTextField') {
        hasValue = field.getText() !== '' && field.getText() !== null;
      } else if (field.constructor.name === 'PDFCheckBox') {
        hasValue = field.isChecked();
      }
    } catch (e) {
      // Ignore errors
    }

    if (hasValue) {
      populated++;
    } else {
      empty++;
    }
  });

  console.log(`  Total fields: ${allFields.length}`);
  console.log(`  Populated: ${populated}`);
  console.log(`  Empty: ${empty}`);
  console.log(`  Coverage: ${((populated / allFields.length) * 100).toFixed(1)}%`);
})();
