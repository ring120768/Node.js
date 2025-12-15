#!/usr/bin/env node

/**
 * Test: Does merging a FILLED form cause corruption?
 * Compare: Filled form alone vs Filled form + Puppeteer merge
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testFilledFormMerge() {
  console.log('🧪 Testing Filled Form + Puppeteer Merge\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');

  // Test 1: Fill 30 fields WITHOUT merge (we know this works)
  console.log('Test 1: Fill 30 fields, NO merge...');
  const formBytes1 = await fs.readFile(formPath);
  const pdfDoc1 = await PDFDocument.load(formBytes1);
  const form1 = pdfDoc1.getForm();

  const fields = ['email', 'mobile', 'street', 'town', 'postcode', 'country',
    'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
    'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
    'policy_number', 'cover_type', 'recovery_breakdown_email', 'policy_holder',
    'medical_how_are_you_feeling', 'medical_attention_from_who', 'speed_limit', 'nearest_landmark',
    'other_driver_vehicle_marked_for_export', 'witness_name', 'street_name_optional',
    'vehicle_picture_front', 'driving_license_picture', 'vehicle_picture_driver_side',
    'vehicle_picture_passenger_side', 'vehicle_picture_back'];

  fields.forEach((fieldName, i) => {
    try {
      form1.getTextField(fieldName).setText(`Test ${i + 1}`);
    } catch (err) {}
  });

  const filled1 = await pdfDoc1.save();
  const output1 = path.join(__dirname, 'test-output', 'test-30-filled-no-merge.pdf');
  await fs.writeFile(output1, filled1);

  console.log(`✅ Saved: ${output1}`);
  console.log(`   Size: ${(filled1.length / 1024).toFixed(2)} KB\n`);

  // Test 2: Fill 30 fields + MERGE with Puppeteer page
  console.log('Test 2: Fill 30 fields + MERGE with Puppeteer...');
  const formBytes2 = await fs.readFile(formPath);
  const pdfDoc2 = await PDFDocument.load(formBytes2);
  const form2 = pdfDoc2.getForm();

  fields.forEach((fieldName, i) => {
    try {
      form2.getTextField(fieldName).setText(`Test ${i + 1}`);
    } catch (err) {}
  });

  // Now MERGE with a Puppeteer-generated page
  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);
  const page13Pdf = await PDFDocument.load(page13Bytes);

  // Create merged PDF
  const mergedPdf = await PDFDocument.create();

  // Copy first 12 pages from filled form
  const formPages = await mergedPdf.copyPages(pdfDoc2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer page 13
  const [htmlPage] = await mergedPdf.copyPages(page13Pdf, [0]);
  mergedPdf.addPage(htmlPage);

  // Add remaining form pages
  const totalFormPages = pdfDoc2.getPageCount();
  if (totalFormPages > 12) {
    const remainingPages = await mergedPdf.copyPages(pdfDoc2, [12, 13, 14, 15, 16, 17].slice(0, totalFormPages - 12));
    remainingPages.forEach(page => mergedPdf.addPage(page));
  }

  const merged = await mergedPdf.save();
  const output2 = path.join(__dirname, 'test-output', 'test-30-filled-with-merge.pdf');
  await fs.writeFile(output2, merged);

  console.log(`✅ Saved: ${output2}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB\n`);

  console.log('━'.repeat(60));
  console.log('📊 Test Complete\n');
  console.log('Check for XRef errors:');
  console.log('  pdftotext test-output/test-30-filled-no-merge.pdf /dev/null 2>&1');
  console.log('  pdftotext test-output/test-30-filled-with-merge.pdf /dev/null 2>&1\n');
  console.log('Expected result:');
  console.log('  - NO merge: ZERO errors (we already know this)');
  console.log('  - WITH merge: If errors appear, MERGE is the culprit!');
}

testFilledFormMerge().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
