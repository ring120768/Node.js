#!/usr/bin/env node

/**
 * Test: Multiple copyPages() calls on same source
 * Production code calls copyPages() TWICE on the filled form
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testMultipleCopyPages() {
  console.log('🧪 Testing Multiple copyPages() Calls\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const pdfDoc = await PDFDocument.load(formBytes);
  const form = pdfDoc.getForm();

  // Fill 100 fields
  const fields = ['email', 'mobile', 'street', 'town', 'postcode', 'country',
    'driving_license_number', 'car_registration_number', 'vehicle_model', 'vehicle_colour',
    'vehicle_condition', 'recovery_company', 'recovery_breakdown_number', 'insurance_company',
    'policy_number', 'cover_type', 'name', 'surname', 'id', 'date_of_birth'];

  console.log('Filling 20 fields...');
  fields.forEach((fieldName, i) => {
    try {
      form.getTextField(fieldName).setText(`Test value ${i + 1}`);
    } catch (err) {}
  });

  console.log('✅ Fields filled\n');

  // Create merged PDF using EXACTLY the production pattern
  console.log('Merging with PRODUCTION pattern (multiple copyPages calls)...');
  const mergedPdf = await PDFDocument.create();

  // FIRST copyPages() call - pages 1-12
  console.log('  📄 First copyPages(): pages 1-12...');
  const formPages1to12 = await mergedPdf.copyPages(pdfDoc, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages1to12.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer pages (4 separate PDFs!)
  console.log('  🎨 Adding Puppeteer pages...');
  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);

  // Load FOUR separate times (like production)
  const page13Pdf = await PDFDocument.load(page13Bytes);
  const page14Pdf = await PDFDocument.load(page13Bytes); // Reusing same PDF for test
  const page15Pdf = await PDFDocument.load(page13Bytes);
  const page16Pdf = await PDFDocument.load(page13Bytes);

  const [htmlPage13] = await mergedPdf.copyPages(page13Pdf, [0]);
  const [htmlPage14] = await mergedPdf.copyPages(page14Pdf, [0]);
  const [htmlPage15] = await mergedPdf.copyPages(page15Pdf, [0]);
  const [htmlPage16] = await mergedPdf.copyPages(page16Pdf, [0]);

  mergedPdf.addPage(htmlPage13);
  mergedPdf.addPage(htmlPage14);
  mergedPdf.addPage(htmlPage15);
  mergedPdf.addPage(htmlPage16);

  // SECOND copyPages() call on THE SAME SOURCE - pages 17-18
  console.log('  📄 Second copyPages() (SAME SOURCE): pages 17-18...');
  const formPages17to18 = await mergedPdf.copyPages(pdfDoc, [16, 17]);
  formPages17to18.forEach(page => mergedPdf.addPage(page));

  const merged = await mergedPdf.save();
  const output = path.join(__dirname, 'test-output', 'test-production-pattern.pdf');
  await fs.writeFile(output, merged);

  console.log(`\n✅ Saved: ${output}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: ${mergedPdf.getPageCount()}\n`);

  console.log('━'.repeat(60));
  console.log('\n📊 Check for errors:');
  console.log('  pdftotext test-output/test-production-pattern.pdf /dev/null 2>&1 | head -20\n');
  console.log('Expected: If XRef errors appear, multiple copyPages() is the issue!');
}

testMultipleCopyPages().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
