const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './test-output/filled-form-adeedf9d-fe8e-43c9-80d1-30db3c226522.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const allFields = form.getFields();
  let populated = 0;
  let empty = 0;

  const populatedFields = [];
  const emptyFields = [];

  allFields.forEach(field => {
    const fieldName = field.getName();
    const fieldType = field.constructor.name;
    let hasValue = false;

    try {
      if (fieldType === 'PDFTextField') {
        const text = field.getText();
        hasValue = text !== '' && text !== null && text !== undefined;
      } else if (fieldType === 'PDFCheckBox') {
        hasValue = field.isChecked();
      } else if (fieldType === 'PDFRadioGroup') {
        hasValue = field.getSelected() !== undefined;
      } else if (fieldType === 'PDFSignature') {
        // Signatures are usually empty until signed
        hasValue = false;
      }
    } catch (e) {
      // Field couldn't be read
    }

    if (hasValue) {
      populated++;
      populatedFields.push({ name: fieldName, type: fieldType });
    } else {
      empty++;
      emptyFields.push({ name: fieldName, type: fieldType });
    }
  });

  console.log('📊 PDF FIELD STATISTICS:\n');
  console.log(`Total fields in PDF: ${allFields.length}`);
  console.log(`Populated fields: ${populated} (${((populated / allFields.length) * 100).toFixed(1)}%)`);
  console.log(`Empty fields: ${empty} (${((empty / allFields.length) * 100).toFixed(1)}%)`);

  console.log('\n🔍 BREAKDOWN BY TYPE:\n');

  const checkboxCount = allFields.filter(f => f.constructor.name === 'PDFCheckBox').length;
  const textFieldCount = allFields.filter(f => f.constructor.name === 'PDFTextField').length;
  const signatureCount = allFields.filter(f => f.constructor.name === 'PDFSignature').length;
  const otherCount = allFields.length - checkboxCount - textFieldCount - signatureCount;

  console.log(`Checkboxes: ${checkboxCount}`);
  console.log(`Text fields: ${textFieldCount}`);
  console.log(`Signatures: ${signatureCount}`);
  console.log(`Other: ${otherCount}`);
})();
