/**
 * Verify if weather_dusk is actually checked in the generated PDF
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function verifyDusk() {
  try {
    const pdfPath = '/Users/ianring/Node.js/test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';

    console.log('\n🔍 Verifying weather_dusk in generated PDF:\n');
    console.log('File:', pdfPath);
    console.log('═'.repeat(80));

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const duskField = form.getCheckBox('weather_dusk');
    console.log('\n✅ Field found: weather_dusk');
    console.log('   Is checked:', duskField.isChecked());

    // Check some other weather fields for comparison
    console.log('\n📊 Comparison with other weather checkboxes:\n');

    const weatherFields = [
      'weather_bright_sunlight',
      'weather_clear',
      'weather_cloudy',
      'weather_raining',
      'weather_heavy_rain',
      'weather_drizzle',
      'weather_fog',
      'weather_snow',
      'weather_windy',
      'weather_hail',
      'weather_thunder_lightening',
      'weather_dusk'
    ];

    weatherFields.forEach(fieldName => {
      try {
        const field = form.getCheckBox(fieldName);
        const isChecked = field.isChecked();
        console.log(`${isChecked ? '✅' : '❌'} ${fieldName}: ${isChecked}`);
      } catch (e) {
        console.log(`❌ ${fieldName}: NOT FOUND`);
      }
    });

    console.log('\n═'.repeat(80));
    console.log('\nIf weather_dusk shows as checked=true here but appears unchecked');
    console.log('in Adobe Acrobat, it might be a rendering/appearance issue.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

verifyDusk();
