/**
 * Test the vehicle_picture_driver_side field font sizing
 */

const fs = require('fs');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');

async function testDriverSideField() {
  try {
    const pdfPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    console.log('\n🔍 Testing vehicle_picture_driver_side field:\n');
    console.log('═'.repeat(80));

    const fieldName = 'vehicle_picture_driver_side';
    const testUrl = 'https://kctlcmbjmhctobmkfrs.supabase.co/storage/v1/object/sign/user-documents/test.jpg';

    try {
      const field = form.getTextField(fieldName);
      console.log('✅ Field found:', fieldName);

      // Get field properties
      const widgets = field.acroField.getWidgets();
      console.log('   Widgets count:', widgets.length);

      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        console.log('   Field dimensions:');
        console.log('     Width:', rect.width);
        console.log('     Height:', rect.height);
      }

      // Test different approaches
      console.log('\n🧪 Test 1: Set font size to 6 (current approach)');
      try {
        field.enableMultiline();
        field.enableScrolling();
        field.setText(testUrl);
        field.setFontSize(6);

        const test1Bytes = await pdfDoc.save();
        fs.writeFileSync('/Users/ianring/Node.js/test-output/driver-field-test1.pdf', test1Bytes);
        console.log('   ✅ Saved: test-output/driver-field-test1.pdf');
      } catch (e) {
        console.log('   ❌ Error:', e.message);
      }

      // Test 2: Set text only, let PDF reader handle rendering
      const pdfDoc2 = await PDFDocument.load(pdfBytes);
      const form2 = pdfDoc2.getForm();
      const field2 = form2.getTextField(fieldName);

      console.log('\n🧪 Test 2: Set text only (no font size, no multiline)');
      try {
        field2.setText(testUrl);
        const test2Bytes = await pdfDoc2.save();
        fs.writeFileSync('/Users/ianring/Node.js/test-output/driver-field-test2.pdf', test2Bytes);
        console.log('   ✅ Saved: test-output/driver-field-test2.pdf');
      } catch (e) {
        console.log('   ❌ Error:', e.message);
      }

      // Test 3: Set text with multiline but no font size
      const pdfDoc3 = await PDFDocument.load(pdfBytes);
      const form3 = pdfDoc3.getForm();
      const field3 = form3.getTextField(fieldName);

      console.log('\n🧪 Test 3: Set text with multiline only (no font size)');
      try {
        field3.enableMultiline();
        field3.enableScrolling();
        field3.setText(testUrl);

        const test3Bytes = await pdfDoc3.save();
        fs.writeFileSync('/Users/ianring/Node.js/test-output/driver-field-test3.pdf', test3Bytes);
        console.log('   ✅ Saved: test-output/driver-field-test3.pdf');
      } catch (e) {
        console.log('   ❌ Error:', e.message);
      }

      // Test 4: Set text only WITH NeedAppearances flag
      const pdfDoc4 = await PDFDocument.load(pdfBytes);
      const form4 = pdfDoc4.getForm();
      const field4 = form4.getTextField(fieldName);

      console.log('\n🧪 Test 4: Set text WITH NeedAppearances flag (no font size)');
      try {
        field4.enableMultiline();
        field4.enableScrolling();
        field4.setText(testUrl);

        // Set NeedAppearances flag
        const acroForm = pdfDoc4.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
        if (acroForm) {
          acroForm.set(PDFName.of('NeedAppearances'), pdfDoc4.context.obj(true));
          console.log('   ✓ NeedAppearances flag set');
        }

        form4.updateFieldAppearances();

        const test4Bytes = await pdfDoc4.save();
        fs.writeFileSync('/Users/ianring/Node.js/test-output/driver-field-test4.pdf', test4Bytes);
        console.log('   ✅ Saved: test-output/driver-field-test4.pdf');
      } catch (e) {
        console.log('   ❌ Error:', e.message);
      }

      console.log('\n═'.repeat(80));
      console.log('\n📄 Open the test PDFs to compare which method works best\n');

    } catch (error) {
      console.log('❌ Field error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testDriverSideField();
