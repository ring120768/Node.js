const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './test-output/filled-form-adeedf9d-fe8e-43c9-80d1-30db3c226522.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('🔍 Verifying newly mapped field:\n');

  const field = form.getTextField('street_name_optional');
  const value = field.getText();
  const status = value ? '✅' : '❌';

  console.log(`${status} street_name_optional: ${value || 'EMPTY'}`);

  console.log('\n📊 Updated Coverage:\n');
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

  console.log(`  Total fields: ${allFields.length}`);
  console.log(`  Populated: ${populated}`);
  console.log(`  Coverage: ${((populated / allFields.length) * 100).toFixed(1)}%`);
})();
