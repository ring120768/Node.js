const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdfPath = 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('=== ALL PDF FORM FIELDS ===\n');
  console.log(`Total fields: ${fields.length}\n`);

  // Group by likely category
  const imageFields = [];
  const urlFields = [];
  const pathFields = [];
  const photoFields = [];
  const pictureFields = [];

  fields.forEach(field => {
    const name = field.getName().toLowerCase();
    if (name.includes('image')) imageFields.push(field.getName());
    else if (name.includes('url')) urlFields.push(field.getName());
    else if (name.includes('path')) pathFields.push(field.getName());
    else if (name.includes('photo')) photoFields.push(field.getName());
    else if (name.includes('picture')) pictureFields.push(field.getName());
  });

  console.log('IMAGE fields:', imageFields.length);
  imageFields.forEach(f => console.log(`  ${f}`));

  console.log('\nURL fields:', urlFields.length);
  urlFields.forEach(f => console.log(`  ${f}`));

  console.log('\nPATH fields:', pathFields.length);
  pathFields.forEach(f => console.log(`  ${f}`));

  console.log('\nPHOTO fields:', photoFields.length);
  photoFields.forEach(f => console.log(`  ${f}`));

  console.log('\nPICTURE fields:', pictureFields.length);
  pictureFields.forEach(f => console.log(`  ${f}`));

  console.log('\nTotal image-related fields:',
    imageFields.length + urlFields.length + pathFields.length + photoFields.length + pictureFields.length);
})();
