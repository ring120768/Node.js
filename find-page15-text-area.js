const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== Finding Large Text Area Fields After Page 14 ===\n');

  const templatePath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const textFields = form.getFields().filter(f => f.constructor.name === 'PDFTextField');

  console.log(`Total text fields: ${textFields.length}\n`);

  // Find Page 14 field index
  const page14FieldName = 'detailed_account_of_what_happened';
  const page14Index = textFields.findIndex(f => f.getName() === page14FieldName);

  if (page14Index >= 0) {
    console.log(`Found Page 14 field "${page14FieldName}" at index ${page14Index}\n`);
    console.log('Next 15 text fields after Page 14:\n');

    for (let i = page14Index + 1; i < Math.min(page14Index + 16, textFields.length); i++) {
      const field = textFields[i];
      const name = field.getName();

      // Get field dimensions and multiline status
      const widgets = field.acroField.getWidgets();
      let width = 0, height = 0, isMultiline = false;

      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        width = rect.width;
        height = rect.height;

        // Check multiline flag
        const fieldDict = field.acroField.dict;
        const flags = fieldDict.get(fieldDict.context.obj('Ff'));
        isMultiline = flags ? (flags.asNumber() & (1 << 12)) !== 0 : false;
      }

      // Highlight large text areas (likely candidates for AI summary)
      const isLargeTextArea = height > 200 || isMultiline;
      const marker = isLargeTextArea ? '📝 LARGE TEXT AREA' : '';

      console.log(`  [${i}] ${name}`);
      console.log(`       Size: ${width.toFixed(0)}w × ${height.toFixed(0)}h | Multiline: ${isMultiline} ${marker}`);
      console.log('');
    }
  } else {
    console.log('❌ Could not find Page 14 field');
  }
})();
