/**
 * Debug the weather_dusk checkbox specifically
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function debugDuskCheckbox() {
  try {
    const pdfPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    console.log('\n🔍 Debugging weather_dusk checkbox:\n');
    console.log('═'.repeat(80));

    try {
      const duskField = form.getCheckBox('weather_dusk');
      console.log('\n✅ Field exists: weather_dusk');
      console.log('   Field type:', duskField.constructor.name);

      // Get all widgets (visual representations)
      const widgets = duskField.acroField.getWidgets();
      console.log('   Widgets count:', widgets.length);

      // Try to get the field's properties
      console.log('\n📋 Field Properties:');
      console.log('   Name:', duskField.getName());

      try {
        console.log('   Is checked (before):', duskField.isChecked ? duskField.isChecked() : 'Method not available');
      } catch (e) {
        console.log('   Is checked (before): Unable to read');
      }

      // Try checking it
      console.log('\n✅ Attempting to check the field...');
      duskField.check();
      console.log('   Check() called successfully');

      try {
        console.log('   Is checked (after):', duskField.isChecked ? duskField.isChecked() : 'Method not available');
      } catch (e) {
        console.log('   Is checked (after): Unable to read');
      }

      // Update appearances
      console.log('\n🎨 Updating field appearances...');
      form.updateFieldAppearances();
      console.log('   Field appearances updated');

      // Try to save and check
      console.log('\n💾 Saving test PDF...');
      const testPdfBytes = await pdfDoc.save();
      const testPath = '/Users/ianring/Node.js/test-output/dusk-checkbox-test.pdf';
      fs.writeFileSync(testPath, testPdfBytes);
      console.log('   Test PDF saved:', testPath);

      // Now reload and verify
      console.log('\n🔍 Reloading PDF to verify...');
      const verifyDoc = await PDFDocument.load(testPdfBytes);
      const verifyForm = verifyDoc.getForm();
      const verifyField = verifyForm.getCheckBox('weather_dusk');

      try {
        const isCheckedAfterSave = verifyField.isChecked ? verifyField.isChecked() : 'Unknown';
        console.log('   Is checked after save:', isCheckedAfterSave);
      } catch (e) {
        console.log('   Unable to verify checked state after save');
      }

      // Compare with a working checkbox (e.g., weather_hail)
      console.log('\n🔍 Comparing with weather_hail checkbox (for reference):\n');
      try {
        const hailField = form.getCheckBox('weather_hail');
        console.log('✅ weather_hail field exists');
        console.log('   Field type:', hailField.constructor.name);
        const hailWidgets = hailField.acroField.getWidgets();
        console.log('   Widgets count:', hailWidgets.length);
      } catch (e) {
        console.log('❌ weather_hail not found');
      }

    } catch (error) {
      console.log('❌ Error accessing weather_dusk field:', error.message);
    }

    console.log('\n═'.repeat(80));
    console.log('\n📄 Test PDF: /Users/ianring/Node.js/test-output/dusk-checkbox-test.pdf');
    console.log('Open this file to see if the checkbox is visually checked\n');

  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

debugDuskCheckbox();
