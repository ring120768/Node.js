const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Searching for "AI Summary of data collected" Field ===\n');

  const templatePath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const allFieldNames = fields.map(f => f.getName());

  console.log('Searching for fields with "ai", "summary", "data", or "collected":\n');

  const candidates = allFieldNames.filter(name => {
    const lower = name.toLowerCase();
    return (lower.includes('ai') || lower.includes('summary') ||
            lower.includes('data') || lower.includes('collected')) &&
           !lower.includes('accident_data_transcription'); // Exclude Page 13
  });

  candidates.forEach(name => console.log(`  - ${name}`));

  console.log('\n=== Checking exact field name possibilities ===\n');

  const possibleNames = [
    'ai_summary_of_data_collected',
    'ai_summary_data_collected',
    'summary_of_data_collected',
    'data_collected_summary',
    'comprehensive_summary',
    'all_data_summary'
  ];

  possibleNames.forEach(name => {
    if (allFieldNames.includes(name)) {
      console.log(`  ✅ FOUND: ${name}`);
    } else {
      console.log(`  ❌ Not found: ${name}`);
    }
  });
})();
