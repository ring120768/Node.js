/**
 * Attempt to fix the weather_dusk checkbox in the PDF template
 * by ensuring it has proper appearance settings
 */

const fs = require('fs');
const { PDFDocument, PDFName, PDFDict, PDFStream } = require('pdf-lib');

async function fixDuskCheckbox() {
  try {
    const templatePath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    console.log('\n🔧 Attempting to fix weather_dusk checkbox in PDF template:\n');
    console.log('═'.repeat(80));

    // Get the checkbox
    const duskField = form.getCheckBox('weather_dusk');
    console.log('✅ Found weather_dusk checkbox');

    // Set NeedAppearances flag to true - forces PDF readers to generate appearances
    const acroForm = pdfDoc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (acroForm) {
      acroForm.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));
      console.log('✅ Set NeedAppearances flag to true');
    }

    // Check the checkbox to test
    duskField.check();
    console.log('✅ Checked the weather_dusk field');

    // Update appearances
    form.updateFieldAppearances();
    console.log('✅ Updated field appearances');

    // Save the fixed template
    const outputPath = '/Users/ianring/Node.js/test-output/template-with-needappearances.pdf';
    const fixedBytes = await pdfDoc.save({
      useObjectStreams: false,  // Ensure compatibility
      addDefaultPage: false
    });

    fs.writeFileSync(outputPath, fixedBytes);
    console.log('✅ Saved fixed template:', outputPath);

    // Now test if this fixed version shows the checkbox
    console.log('\n🔍 Verifying the fix...\n');
    const verifyDoc = await PDFDocument.load(fixedBytes);
    const verifyForm = verifyDoc.getForm();
    const verifyField = verifyForm.getCheckBox('weather_dusk');
    console.log('Is checked:', verifyField.isChecked());

    console.log('\n═'.repeat(80));
    console.log('\n📄 Open the fixed template to verify the checkbox shows as checked:\n');
    console.log('   ', outputPath);
    console.log('\nIf this works, we can use NeedAppearances flag in our PDF filling code.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

fixDuskCheckbox();
