const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('=== INSPECTING URL FIELD PROPERTIES ===\n');

  const pdfPath = path.join(__dirname, 'test-output', 'filled-form-ee7cfcaf-5810-4c62-b99b-ab0f2291733e.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF not found:', pdfPath);
    return;
  }

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const urlFields = [
    // Page 3
    'driving_license_picture',
    'vehicle_picture_front',
    'vehicle_picture_driver_side',
    'vehicle_picture_passenger_side',
    'vehicle_picture_back',
    // Pages 11-12
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

  console.log('📋 Checking URL field properties:\n');

  for (const fieldName of urlFields) {
    try {
      const field = form.getTextField(fieldName);
      const text = field.getText();
      const fontSize = field.acroField.getDefaultAppearance()?.match(/\/F\d+\s+(\d+\.?\d*)\s+Tf/)?.[1];

      // Check if multiline is enabled by inspecting the field flags
      const fieldDict = field.acroField.dict;
      const flags = fieldDict.get(fieldDict.context.obj('Ff'));
      const isMultiline = flags ? (flags.asNumber() & (1 << 12)) !== 0 : false;
      const doNotScroll = flags ? (flags.asNumber() & (1 << 23)) !== 0 : false;
      const isScrollable = !doNotScroll; // Scrolling is enabled when doNotScroll is false

      // Get field dimensions
      const widgets = field.acroField.getWidgets();
      let width = 0, height = 0;
      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        width = rect.width;
        height = rect.height;
      }

      const textLength = text ? text.length : 0;
      const hasText = textLength > 0;

      console.log(`📄 ${fieldName}:`);
      console.log(`   Text: ${hasText ? text.substring(0, 80) + '...' : '(empty)'}`);
      console.log(`   Length: ${textLength} chars`);
      console.log(`   Font Size: ${fontSize || 'unknown'}`);
      console.log(`   Multiline: ${isMultiline ? '✅ Yes' : '❌ No'}`);
      console.log(`   Scrollable: ${isScrollable ? '✅ Yes' : '❌ No'}`);
      console.log(`   Dimensions: ${width.toFixed(0)}w × ${height.toFixed(0)}h`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${fieldName}: Field not found or error - ${error.message}\n`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total URL fields: ${urlFields.length}`);
})();
