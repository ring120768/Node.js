const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './test-output/filled-form-adeedf9d-fe8e-43c9-80d1-30db3c226522.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('📋 EMPTY PDF FIELDS (31 total):\n');

  const allFields = form.getFields();
  const emptyFields = [];

  allFields.forEach(field => {
    const fieldName = field.getName();
    let hasValue = false;

    try {
      if (field.constructor.name === 'PDFTextField') {
        const text = field.getText();
        hasValue = text !== '' && text !== null && text !== undefined;
      } else if (field.constructor.name === 'PDFCheckBox') {
        hasValue = field.isChecked();
      } else if (field.constructor.name === 'PDFRadioGroup') {
        hasValue = field.getSelected() !== undefined;
      }
    } catch (e) {
      // Field couldn't be read
    }

    if (!hasValue) {
      emptyFields.push({
        name: fieldName,
        type: field.constructor.name
      });
    }
  });

  // Sort by type for easier reading
  emptyFields.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  // Group by type
  const checkboxes = emptyFields.filter(f => f.type === 'PDFCheckBox');
  const textFields = emptyFields.filter(f => f.type === 'PDFTextField');
  const others = emptyFields.filter(f => f.type !== 'PDFCheckBox' && f.type !== 'PDFTextField');

  if (checkboxes.length > 0) {
    console.log(`☐ CHECKBOXES (${checkboxes.length}):\n`);
    checkboxes.forEach((field, idx) => {
      console.log(`   ${idx + 1}. ${field.name}`);
    });
    console.log('');
  }

  if (textFields.length > 0) {
    console.log(`📝 TEXT FIELDS (${textFields.length}):\n`);
    textFields.forEach((field, idx) => {
      console.log(`   ${idx + 1}. ${field.name}`);
    });
    console.log('');
  }

  if (others.length > 0) {
    console.log(`📌 OTHER FIELDS (${others.length}):\n`);
    others.forEach((field, idx) => {
      console.log(`   ${idx + 1}. ${field.name} (${field.type})`);
    });
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log(`TOTAL EMPTY FIELDS: ${emptyFields.length}`);
  console.log('═'.repeat(70));
})();
