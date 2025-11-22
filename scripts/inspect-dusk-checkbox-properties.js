/**
 * Inspect the weather_dusk checkbox properties in detail
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function inspectDuskProperties() {
  try {
    const pdfPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    console.log('\n🔍 Detailed inspection of weather_dusk checkbox:\n');
    console.log('═'.repeat(80));

    const duskField = form.getCheckBox('weather_dusk');
    const hailField = form.getCheckBox('weather_hail'); // For comparison

    console.log('\n📋 DUSK CHECKBOX PROPERTIES:\n');
    console.log('Name:', duskField.getName());

    const duskDict = duskField.acroField.dict;
    const hailDict = hailField.acroField.dict;

    // Check export value
    try {
      const duskWidgets = duskField.acroField.getWidgets();
      const hailWidgets = hailField.acroField.getWidgets();

      console.log('Number of widgets:', duskWidgets.length);

      if (duskWidgets.length > 0) {
        const widget = duskWidgets[0];
        const widgetDict = widget.dict;

        // Get appearance states
        const ap = widgetDict.get('AP');
        console.log('Has AP (appearance) dictionary:', ap !== undefined);

        // Get normal appearance
        if (ap) {
          const n = ap.get('N');
          console.log('Has N (normal) appearance:', n !== undefined);

          if (n) {
            const keys = n.asDict ? n.asDict().keys() : 'Not a dict';
            console.log('Normal appearance keys:', keys);
          }
        }

        // Check export value
        const as = widgetDict.get('AS');
        console.log('Current appearance state (AS):', as ? as.toString() : 'undefined');

        // Check default value
        const dv = duskDict.get('DV');
        console.log('Default value (DV):', dv ? dv.toString() : 'undefined');

        // Check value
        const v = duskDict.get('V');
        console.log('Value (V):', v ? v.toString() : 'undefined');
      }

      console.log('\n📋 HAIL CHECKBOX (for comparison):\n');
      console.log('Name:', hailField.getName());
      console.log('Number of widgets:', hailWidgets.length);

      if (hailWidgets.length > 0) {
        const widget = hailWidgets[0];
        const widgetDict = widget.dict;

        const ap = widgetDict.get('AP');
        console.log('Has AP (appearance) dictionary:', ap !== undefined);

        if (ap) {
          const n = ap.get('N');
          console.log('Has N (normal) appearance:', n !== undefined);

          if (n) {
            const keys = n.asDict ? n.asDict().keys() : 'Not a dict';
            console.log('Normal appearance keys:', keys);
          }
        }

        const as = widgetDict.get('AS');
        console.log('Current appearance state (AS):', as ? as.toString() : 'undefined');
      }

    } catch (e) {
      console.error('Error inspecting widgets:', e.message);
    }

    // Try different check methods
    console.log('\n🔧 Testing different check methods:\n');

    // Method 1: Normal check()
    const testDoc1 = await PDFDocument.load(pdfBytes);
    const testForm1 = testDoc1.getForm();
    const testDusk1 = testForm1.getCheckBox('weather_dusk');
    testDusk1.check();
    testForm1.updateFieldAppearances();
    const test1Bytes = await testDoc1.save();
    fs.writeFileSync('/Users/ianring/Node.js/test-output/dusk-method1.pdf', test1Bytes);
    console.log('✅ Method 1 (check + updateFieldAppearances): /Users/ianring/Node.js/test-output/dusk-method1.pdf');

    // Method 2: Flatten after checking
    const testDoc2 = await PDFDocument.load(pdfBytes);
    const testForm2 = testDoc2.getForm();
    const testDusk2 = testForm2.getCheckBox('weather_dusk');
    testDusk2.check();
    testForm2.updateFieldAppearances();
    testForm2.flatten(); // Flatten the form
    const test2Bytes = await testDoc2.save();
    fs.writeFileSync('/Users/ianring/Node.js/test-output/dusk-method2-flattened.pdf', test2Bytes);
    console.log('✅ Method 2 (check + flatten): /Users/ianring/Node.js/test-output/dusk-method2-flattened.pdf');

    console.log('\n═'.repeat(80));
    console.log('\n📄 Open the test PDFs to see which method works\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

inspectDuskProperties();
