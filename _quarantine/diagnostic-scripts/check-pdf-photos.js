const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function checkPhotoFields() {
  const pdfPath = './test-output/filled-form-1048b3ac-11ec-4e98-968d-9de28183a84d.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.log('❌ PDF not found at:', pdfPath);
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  console.log('\n📸 Photo URL Fields in PDF:\n');
  console.log('═'.repeat(80));

  const photoFields = [
    'scene_photo_1_url',
    'scene_photo_2_url',
    'scene_photo_3_url',
    'location_map_screenshot',
    'vehicle_damage_photo_1_url',
    'vehicle_damage_photo_2_url',
    'vehicle_damage_photo_3_url',
    'vehicle_damage_photo_4_url',
    'other_vehicle_photo_1_url',
    'other_vehicle_photo_2_url',
    'other_vehicle_photo_3_url'
  ];

  let hasPhotos = false;
  let emptyPhotos = 0;

  for (const fieldName of photoFields) {
    try {
      const field = form.getTextField(fieldName);
      const value = field.getText() || '';

      if (value.trim()) {
        hasPhotos = true;
        const truncated = value.length > 70 ? value.substring(0, 70) + '...' : value;
        console.log(`✅ ${fieldName}`);
        console.log(`   ${truncated}\n`);
      } else {
        emptyPhotos++;
        console.log(`⚠️  ${fieldName}: (empty)\n`);
      }
    } catch (error) {
      console.log(`❌ ${fieldName}: Field not found\n`);
    }
  }

  console.log('═'.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total photo fields: ${photoFields.length}`);
  console.log(`   Fields with URLs: ${photoFields.length - emptyPhotos}`);
  console.log(`   Empty fields: ${emptyPhotos}`);
  console.log(`   Status: ${hasPhotos ? '✅ Photos present in PDF' : '❌ No photos in PDF'}`);
}

checkPhotoFields().catch(console.error);
