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
      if (field.constructor.name === 'PDFCheckBox') {
        return field.isChecked() ? '✓ CHECKED' : '○ UNCHECKED';
      } else if (field.constructor.name === 'PDFTextField') {
        return field.getText() || '(empty)';
      }
      return '(unknown type)';
    } catch (e) {
      return '⚠️ Field not found';
    }
  }

  console.log('=== SAMPLE PDF FIELDS (By Page) ===\n');

  // Page 1 - Personal Info
  console.log('📄 PAGE 1: Personal Information');
  console.log('  name:', getFieldValue('name'));
  console.log('  surname:', getFieldValue('surname'));
  console.log('  email:', getFieldValue('email'));
  console.log('  mobile:', getFieldValue('mobile'));
  console.log('');

  // Page 2 - Dates
  console.log('📄 PAGE 2: Important Dates');
  console.log('  subscription_start_date:', getFieldValue('subscription_start_date'));
  console.log('  Date69_af_date:', getFieldValue('Date69_af_date'));
  console.log('');

  // Page 3 - Vehicle
  console.log('📄 PAGE 3: Vehicle Details');
  console.log('  license_plate:', getFieldValue('license_plate'));
  console.log('  vehicle_make:', getFieldValue('vehicle_make'));
  console.log('  vehicle_model:', getFieldValue('vehicle_model'));
  console.log('');

  // Page 4 - Safety Check
  console.log('📄 PAGE 4: Safety & Medical');
  console.log('  six_point_safety_check_completed:', getFieldValue('six_point_safety_check_completed'));
  console.log('');

  // Page 5 - Accident Details
  console.log('📄 PAGE 5: Accident Details');
  console.log('  accident_date:', getFieldValue('accident_date'));
  console.log('  accident_time:', getFieldValue('accident_time'));
  const location = getFieldValue('location');
  console.log('  location:', location.substring(0, Math.min(60, location.length)) + (location.length > 60 ? '...' : ''));
  console.log('');

  // Page 7 - Damage Description
  console.log('📄 PAGE 7: Vehicle Damage');
  const damage = getFieldValue('describle_the_damage');
  console.log('  describle_the_damage:', damage.substring(0, Math.min(80, damage.length)) + (damage.length > 80 ? '...' : ''));
  console.log('');

  console.log('=== NEW MOCK DATA FIELDS ===');
  console.log('✅ describle_the_damage: ' + (damage !== '(empty)' && damage !== '⚠️ Field not found' ? 'POPULATED (' + damage.length + ' chars)' : 'EMPTY'));
  console.log('✅ six_point_safety_check_completed:', getFieldValue('six_point_safety_check_completed'));
  console.log('✅ subscription_start_date:', getFieldValue('subscription_start_date'));
  console.log('✅ Date69_af_date:', getFieldValue('Date69_af_date'));
  console.log('');

  // Count total populated fields
  const fields = form.getFields();
  let populated = 0;
  let empty = 0;

  fields.forEach(field => {
    try {
      if (field.constructor.name === 'PDFCheckBox') {
        if (field.isChecked()) populated++;
        else empty++;
      } else if (field.constructor.name === 'PDFTextField') {
        const text = field.getText() || '';
        if (text.trim()) populated++;
        else empty++;
      }
    } catch (e) {
      // Ignore errors
    }
  });

  console.log('=== OVERALL STATISTICS ===');
  console.log('Total fields:', fields.length);
  console.log('Populated:', populated);
  console.log('Empty:', empty);
  console.log('Completion:', Math.round(populated / fields.length * 100) + '%');
})();
