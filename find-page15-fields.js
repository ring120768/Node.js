const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Searching for Page 15 AI Summary Field ===\n');

  const templatePath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log('Looking for AI summary fields (excluding Page 13):\n');

  const summaryFields = fields.filter(f => {
    const name = f.getName().toLowerCase();
    const isAiRelated = name.includes('summary') || name.includes('ai') || name.includes('data');
    const notPage13 = !name.includes('accident_data_transcription');
    return isAiRelated && notPage13;
  });

  console.log(`Found ${summaryFields.length} potential AI summary fields:\n`);
  summaryFields.forEach(f => console.log(`  - ${f.getName()}`));

  console.log('\n=== All fields containing "page" ===\n');
  const pageFields = fields.filter(f => f.getName().toLowerCase().includes('page'));
  pageFields.forEach(f => console.log(`  - ${f.getName()}`));
})();
