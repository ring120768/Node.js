#!/usr/bin/env node

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function verifyPhotoUrls() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VERIFY PHOTO URLs IN GENERATED PDF                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const pdfPath = '/Users/ianring/Node.js/test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';

    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found:', pdfPath);
      return;
    }

    // Read the PDF
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Photo URL fields to check
    const photoFields = [
      // Location map
      'location_map_screenshot',

      // Vehicle damage photos (5)
      'vehicle_damage_photo_1_url',
      'vehicle_damage_photo_2_url',
      'vehicle_damage_photo_3_url',
      'vehicle_damage_photo_4_url',
      'vehicle_damage_photo_5_url',

      // Other vehicle photos (5)
      'other_vehicle_photo_1_url',
      'other_vehicle_photo_2_url',
      'other_vehicle_photo_3_url',
      'other_vehicle_photo_4_url',
      'other_vehicle_photo_5_url'
    ];

    let populatedCount = 0;
    let emptyCount = 0;
    const results = [];

    console.log('📸 Checking photo URL fields:\n');

    for (const fieldName of photoFields) {
      try {
        const field = form.getTextField(fieldName);
        const value = field.getText();

        if (value && value.trim().length > 0) {
          console.log(`✅ ${fieldName}`);
          console.log(`   ${value.substring(0, 80)}...`);
          populatedCount++;
          results.push({ field: fieldName, populated: true, value });
        } else {
          console.log(`❌ ${fieldName} - EMPTY`);
          emptyCount++;
          results.push({ field: fieldName, populated: false });
        }
      } catch (error) {
        console.log(`⚠️  ${fieldName} - FIELD NOT FOUND IN PDF`);
        emptyCount++;
        results.push({ field: fieldName, populated: false, error: 'Field not found' });
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    VERIFICATION SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const totalFields = photoFields.length;
    const successRate = ((populatedCount / totalFields) * 100).toFixed(1);

    console.log(`📊 Total photo fields: ${totalFields}`);
    console.log(`✅ Populated: ${populatedCount}`);
    console.log(`❌ Empty/Missing: ${emptyCount}`);
    console.log(`📈 Success rate: ${successRate}%\n`);

    if (populatedCount === totalFields) {
      console.log('🎉 SUCCESS! All photo URL fields are populated!\n');
    } else {
      console.log(`⚠️  WARNING: Only ${populatedCount}/${totalFields} photo URL fields populated.\n`);

      console.log('Empty/Missing fields:');
      results.filter(r => !r.populated).forEach(r => {
        console.log(`   - ${r.field}${r.error ? ' (' + r.error + ')' : ''}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

verifyPhotoUrls().catch(console.error);
