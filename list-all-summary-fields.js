const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Listing ALL Fields to Find Page 15 AI Summary ===\n');

  const templatePath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`Total fields: ${fields.length}\n`);

  // Filter for fields that likely contain comprehensive summaries
  console.log('=== Fields with "summary", "collected", "comprehensive", or "all" ===\n');
  const summaryFields = fields.filter(f => {
    const name = f.getName().toLowerCase();
    return name.includes('summary') ||
           name.includes('collected') ||
           name.includes('comprehensive') ||
           name.includes('all_data') ||
           name.includes('complete');
  });

  summaryFields.forEach(f => console.log(`  ${f.getName()}`));

  console.log('\n=== We know these fields already ===');
  console.log('  Page 13: ai_summary_of_accident_data_transcription');
  console.log('  Page 14: detailed_account_of_what_happened');
  console.log('\n=== Looking for Page 15 field... ===\n');

  // Search for fields between known Page 14 and possible Page 16
  const allFieldNames = fields.map(f => f.getName());
  const page14Index = allFieldNames.indexOf('detailed_account_of_what_happened');

  if (page14Index >= 0) {
    console.log(`Found Page 14 field at index ${page14Index}`);
    console.log('\nNext 10 fields after Page 14:\n');
    for (let i = page14Index + 1; i < Math.min(page14Index + 11, allFieldNames.length); i++) {
      console.log(`  [${i}] ${allFieldNames[i]}`);
    }
  }
})();
