/**
 * Add /DA (default appearance) entry to vehicle_picture_driver_side field
 * This allows font size to be set properly
 */

const fs = require('fs');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');

async function addDAEntry() {
  try {
    const pdfPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    console.log('\n🔧 Adding /DA entry to vehicle_picture_driver_side field:\n');
    console.log('═'.repeat(80));

    const fieldName = 'vehicle_picture_driver_side';
    const testUrl = 'https://kctlcmbjmhctobmkfrs.supabase.co/storage/v1/object/sign/user-documents/test.jpg';

    try {
      const field = form.getTextField(fieldName);
      console.log('✅ Field found:', fieldName);

      // Get the field's AcroField object
      const acroField = field.acroField;
      const fieldDict = acroField.dict;

      // Create a /DA (default appearance) string
      // Format: /Font_Name font_size Tf color_r color_g color_b rg
      // Using Helvetica font at size 6
      const daString = '/Helv 6 Tf 0 0 0 rg';

      console.log('\n🔨 Creating /DA entry:');
      console.log('   DA string:', daString);

      // Set the /DA entry
      fieldDict.set(PDFName.of('DA'), PDFString.of(daString));
      console.log('   ✅ /DA entry added');

      // Now set the text and font size
      field.enableMultiline();
      field.enableScrolling();
      field.setText(testUrl);
      field.setFontSize(6);

      console.log('   ✅ Text and font size set');

      // Update field appearances
      form.updateFieldAppearances();
      console.log('   ✅ Field appearances updated');

      // Save the PDF
      const outputBytes = await pdfDoc.save();
      fs.writeFileSync('/Users/ianring/Node.js/test-output/driver-field-with-da.pdf', outputBytes);

      console.log('\n✅ PDF saved: test-output/driver-field-with-da.pdf');
      console.log('\n═'.repeat(80));
      console.log('\n📄 Open the PDF to verify the field renders correctly\n');

    } catch (error) {
      console.log('❌ Error:', error.message);
      console.log(error.stack);
    }

  } catch (error) {
    console.error('❌ Script error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

addDAEntry();
