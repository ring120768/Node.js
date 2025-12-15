#!/usr/bin/env node

/**
 * Test Form Filling Only (No Merge)
 * Diagnose if PDFLib form filling corrupts XRef table
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testFormFillingOnly() {
  console.log('🧪 Testing PDFLib Form Filling\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');

  // Test 1: Load form and save WITHOUT filling (control)
  console.log('Test 1: Load and save unfilled form (control)...');
  const formBytes1 = await fs.readFile(formPath);
  const pdfDoc1 = await PDFDocument.load(formBytes1);

  const unfilled = await pdfDoc1.save();
  const unfilledPath = path.join(__dirname, 'test-output', 'test-unfilled-control.pdf');
  await fs.writeFile(unfilledPath, unfilled);

  console.log(`✅ Saved unfilled: ${unfilledPath}`);
  console.log(`   Size: ${(unfilled.length / 1024).toFixed(2)} KB\n`);

  // Test 2: Fill ONE field and save
  console.log('Test 2: Fill ONE field only...');
  const formBytes2 = await fs.readFile(formPath);
  const pdfDoc2 = await PDFDocument.load(formBytes2);
  const form2 = pdfDoc2.getForm();

  const nameField = form2.getTextField('name');
  nameField.setText('Test User');

  const oneFilled = await pdfDoc2.save();
  const oneFilledPath = path.join(__dirname, 'test-output', 'test-one-field-filled.pdf');
  await fs.writeFile(oneFilledPath, oneFilled);

  console.log(`✅ Saved one-field-filled: ${oneFilledPath}`);
  console.log(`   Size: ${(oneFilled.length / 1024).toFixed(2)} KB\n`);

  // Test 3: Fill MULTIPLE fields and save
  console.log('Test 3: Fill MULTIPLE fields...');
  const formBytes3 = await fs.readFile(formPath);
  const pdfDoc3 = await PDFDocument.load(formBytes3);
  const form3 = pdfDoc3.getForm();

  form3.getTextField('name').setText('Test User');
  form3.getTextField('email').setText('test@example.com');
  form3.getTextField('driver_surname').setText('Dashboard');
  form3.getTextField('driver_dob').setText('01/01/1990');
  form3.getTextField('driver_mobile').setText('+447700900000');

  const multipleFilled = await pdfDoc3.save();
  const multipleFilledPath = path.join(__dirname, 'test-output', 'test-multiple-fields-filled.pdf');
  await fs.writeFile(multipleFilledPath, multipleFilled);

  console.log(`✅ Saved multiple-fields-filled: ${multipleFilledPath}`);
  console.log(`   Size: ${(multipleFilled.length / 1024).toFixed(2)} KB\n`);

  console.log('━'.repeat(60));
  console.log('📊 Test Complete\n');
  console.log('Now run pdftotext to check for XRef errors:');
  console.log('  pdftotext test-output/test-unfilled-control.pdf - 2>&1 | head -20');
  console.log('  pdftotext test-output/test-one-field-filled.pdf - 2>&1 | head -20');
  console.log('  pdftotext test-output/test-multiple-fields-filled.pdf - 2>&1 | head -20\n');
  console.log('Expected result:');
  console.log('  - Unfilled: ZERO XRef errors (control)');
  console.log('  - One field: If errors appear, form filling is the culprit');
  console.log('  - Multiple fields: If more errors, they scale with fields filled');
}

testFormFillingOnly().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
