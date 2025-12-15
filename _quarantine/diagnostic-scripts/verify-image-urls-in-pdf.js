const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

(async () => {
  const pdfPath = '/Users/ianring/Node.js/test-output/filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf';
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  function getFieldValue(fieldName) {
    try {
      const field = form.getField(fieldName);
      if (field.constructor.name === 'PDFTextField') {
        return field.getText() || '(empty)';
      }
      return '(not a text field)';
    } catch (e) {
      return '⚠️  Field not found';
    }
  }

  console.log('=== IMAGE URL FIELDS IN PDF (ACTUAL FIELD NAMES) ===\n');

  // Page 3 - Personal Documentation (5 fields)
  console.log('📄 PAGE 3: Personal Documentation');
  console.log('  driving_license_picture:', getFieldValue('driving_license_picture').substring(0, 100));
  console.log('  vehicle_picture_front:', getFieldValue('vehicle_picture_front').substring(0, 100));
  console.log('  vehicle_picture_driver_side:', getFieldValue('vehicle_picture_driver_side').substring(0, 100));
  console.log('  vehicle_picture_passenger_side:', getFieldValue('vehicle_picture_passenger_side').substring(0, 100));
  console.log('  vehicle_picture_back:', getFieldValue('vehicle_picture_back').substring(0, 100));
  console.log('');

  // Pages 11-12 - Evidence Collection (13 fields)
  console.log('📄 PAGES 11-12: Evidence Collection');
  console.log('  file_url_record_detailed_account_of_what_happened:', getFieldValue('file_url_record_detailed_account_of_what_happened').substring(0, 100));
  console.log('  scene_images_path_1:', getFieldValue('scene_images_path_1').substring(0, 100));
  console.log('  scene_images_path_2:', getFieldValue('scene_images_path_2').substring(0, 100));
  console.log('  scene_images_path_3:', getFieldValue('scene_images_path_3').substring(0, 100));
  console.log('  other_vehicle_photo_1:', getFieldValue('other_vehicle_photo_1').substring(0, 100));
  console.log('  other_vehicle_photo_2:', getFieldValue('other_vehicle_photo_2').substring(0, 100));
  console.log('  other_vehicle_photo_3:', getFieldValue('other_vehicle_photo_3').substring(0, 100));
  console.log('  vehicle_damage_path_1:', getFieldValue('vehicle_damage_path_1').substring(0, 100));
  console.log('  vehicle_damage_path_2:', getFieldValue('vehicle_damage_path_2').substring(0, 100));
  console.log('  vehicle_damage_path_3:', getFieldValue('vehicle_damage_path_3').substring(0, 100));
  console.log('  vehicle_damage_path_4:', getFieldValue('vehicle_damage_path_4').substring(0, 100));
  console.log('  vehicle_damage_path_5:', getFieldValue('vehicle_damage_path_5').substring(0, 100));
  console.log('  vehicle_damage_path_6:', getFieldValue('vehicle_damage_path_6').substring(0, 100));
  console.log('');

  // Count populated URL fields (ALL 18 image fields)
  const urlFields = [
    'driving_license_picture',
    'vehicle_picture_front',
    'vehicle_picture_driver_side',
    'vehicle_picture_passenger_side',
    'vehicle_picture_back',
    'file_url_record_detailed_account_of_what_happened',
    'scene_images_path_1',
    'scene_images_path_2',
    'scene_images_path_3',
    'other_vehicle_photo_1',
    'other_vehicle_photo_2',
    'other_vehicle_photo_3',
    'vehicle_damage_path_1',
    'vehicle_damage_path_2',
    'vehicle_damage_path_3',
    'vehicle_damage_path_4',
    'vehicle_damage_path_5',
    'vehicle_damage_path_6'
  ];

  let populatedUrls = 0;
  let emptyUrls = 0;

  urlFields.forEach(field => {
    const value = getFieldValue(field);
    if (value && value !== '(empty)' && value !== '⚠️  Field not found' && value.startsWith('http')) {
      populatedUrls++;
    } else {
      emptyUrls++;
    }
  });

  console.log('=== URL FIELD STATISTICS ===');
  console.log('Total URL fields checked:', urlFields.length);
  console.log('Populated with URLs:', populatedUrls);
  console.log('Empty or missing:', emptyUrls);
  console.log('Completion rate:', Math.round(populatedUrls / urlFields.length * 100) + '%');
})();
