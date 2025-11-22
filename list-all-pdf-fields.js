const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

(async () => {
  const pdfPath = './pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const allFields = form.getFields();

  console.log(`📋 ALL ${allFields.length} PDF FIELDS:\n`);

  // Filter to just the checkbox names we care about
  const checkboxes = allFields
    .filter(f => f.constructor.name === 'PDFCheckBox')
    .map(f => f.getName())
    .filter(name =>
      name.includes('airbag') ||
      name.includes('seatbelt') ||
      name.includes('police') ||
      name.includes('road_marking') ||
      name.includes('visib') ||
      name.includes('weather_thunder')
    )
    .sort();

  console.log('🔍 RELEVANT CHECKBOXES:\n');
  checkboxes.forEach(name => console.log(`  ${name}`));
})();
