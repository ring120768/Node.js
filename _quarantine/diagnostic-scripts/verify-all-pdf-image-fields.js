#!/usr/bin/env node

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function verifyAllImageFields() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          VERIFY ALL IMAGE FIELDS IN PDF                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    const pdfPath = '/Users/ianring/Node.js/test-output/filled-form-5326c2aa-f1d5-4edc-a972-7fb14995ed0f.pdf';

    if (!fs.existsSync(pdfPath)) {
      console.log('❌ PDF not found:', pdfPath);
      return;
    }

    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Check all image fields organized by category
    const fieldGroups = {
      'Signup Vehicle Photos (Page 2)': [
        'driving_license_picture',
        'vehicle_picture_front',
        'vehicle_picture_driver_side',
        'vehicle_picture_passenger_side',
        'vehicle_picture_back'
      ],
      'Location Map (Page 4)': [
        'location_map_screenshot'
      ],
      'Scene Photos (Page 4a)': [
        'scene_photo_1_url',
        'scene_photo_2_url',
        'scene_photo_3_url'
      ],
      'Vehicle Damage Photos (Page 6)': [
        'vehicle_damage_photo_1_url',
        'vehicle_damage_photo_2_url',
        'vehicle_damage_photo_3_url',
        'vehicle_damage_photo_4_url',
        'vehicle_damage_photo_5_url'
      ],
      'Other Vehicle Photos (Page 8)': [
        'other_vehicle_photo_1_url',
        'other_vehicle_photo_2_url',
        'other_vehicle_photo_3_url',
        'other_vehicle_photo_4_url',
        'other_vehicle_photo_5_url'
      ]
    };

    let totalPopulated = 0;
    let totalEmpty = 0;
    let totalMissing = 0;

    for (const [groupName, fieldNames] of Object.entries(fieldGroups)) {
      console.log(`\n📸 ${groupName}:`);

      for (const fieldName of fieldNames) {
        try {
          const field = form.getTextField(fieldName);
          const value = field.getText();

          if (value && value.trim().length > 0) {
            console.log(`   ✅ ${fieldName}`);
            console.log(`      ${value.substring(0, 70)}...`);
            totalPopulated++;
          } else {
            console.log(`   ⚠️  ${fieldName} - EMPTY (field exists but no value)`);
            totalEmpty++;
          }
        } catch (error) {
          console.log(`   ❌ ${fieldName} - FIELD NOT FOUND IN PDF`);
          totalMissing++;
        }
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    VERIFICATION SUMMARY                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const totalFields = totalPopulated + totalEmpty + totalMissing;
    const successRate = ((totalPopulated / totalFields) * 100).toFixed(1);

    console.log(`📊 Total image fields checked: ${totalFields}`);
    console.log(`✅ Populated with URLs: ${totalPopulated}`);
    console.log(`⚠️  Empty (field exists, no data): ${totalEmpty}`);
    console.log(`❌ Missing from PDF: ${totalMissing}`);
    console.log(`📈 Success rate: ${successRate}%\n`);

    if (totalEmpty > 0) {
      console.log('⚠️  NOTES:');
      console.log('   - Empty fields may indicate missing data in database');
      console.log('   - Scene photos: User may not have uploaded any scene photos');
      console.log('   - Check database for actual image records\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

verifyAllImageFields().catch(console.error);
