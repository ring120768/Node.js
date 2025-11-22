const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdfPath = '/Users/ianring/Node.js/test-output/filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.log('PDF not found');
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const subscriptionField = form.getTextField('subscription_start_date');
  const date69Field = form.getTextField('Date69_af_date');
  const accidentDateField = form.getTextField('accident_date');
  const accidentTimeField = form.getTextField('accident_time');

  console.log('=== CURRENT PDF FIELD VALUES (Revision 4) ===\n');
  console.log('Page 2 - Signup Date:');
  console.log('  subscription_start_date:', subscriptionField.getText() || '(empty)');
  console.log('  Date69_af_date:', date69Field.getText() || '(empty)');
  console.log('');
  console.log('Accident fields:');
  console.log('  accident_date:', accidentDateField.getText() || '(empty)');
  console.log('  accident_time:', accidentTimeField.getText() || '(empty)');
})();
