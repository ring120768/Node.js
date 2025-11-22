#!/usr/bin/env node

/**
 * Test: Does setting NeedAppearances flag cause XRef corruption?
 * Production code sets this flag via low-level PDF manipulation
 * Hypothesis: This internal context manipulation may corrupt XRef
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');

async function testNeedAppearancesFlag() {
  console.log('🧪 Testing NeedAppearances Flag Impact\n');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');

  // Test 1: Fill fields WITHOUT NeedAppearances flag
  console.log('Test 1: Fill fields WITHOUT NeedAppearances flag...');
  const formBytes1 = await fs.readFile(formPath);
  const pdfDoc1 = await PDFDocument.load(formBytes1);
  const form1 = pdfDoc1.getForm();

  // Fill some fields
  const fields = ['email', 'mobile', 'street', 'town', 'postcode'];
  fields.forEach((fieldName, i) => {
    try {
      form1.getTextField(fieldName).setText(`Test ${i + 1}`);
    } catch (err) {}
  });

  // Check some checkboxes
  try { form1.getCheckBox('weather_heavy_rain').check(); } catch (err) {}
  try { form1.getCheckBox('weather_dusk').check(); } catch (err) {}
  try { form1.getCheckBox('road_type_motorway').check(); } catch (err) {}

  const filled1 = await pdfDoc1.save();
  const output1 = path.join(__dirname, 'test-output', 'test-no-needappearances.pdf');
  await fs.writeFile(output1, filled1);

  console.log(`✅ Saved: ${output1}`);
  console.log(`   Size: ${(filled1.length / 1024).toFixed(2)} KB\n`);

  // Test 2: Fill fields WITH NeedAppearances flag (like production)
  console.log('Test 2: Fill fields WITH NeedAppearances flag (production pattern)...');
  const formBytes2 = await fs.readFile(formPath);
  const pdfDoc2 = await PDFDocument.load(formBytes2);
  const form2 = pdfDoc2.getForm();

  // Fill same fields
  fields.forEach((fieldName, i) => {
    try {
      form2.getTextField(fieldName).setText(`Test ${i + 1}`);
    } catch (err) {}
  });

  // Check same checkboxes
  try { form2.getCheckBox('weather_heavy_rain').check(); } catch (err) {}
  try { form2.getCheckBox('weather_dusk').check(); } catch (err) {}
  try { form2.getCheckBox('road_type_motorway').check(); } catch (err) {}

  // SET NEEDAPPEARANCES FLAG (like production)
  console.log('  🔧 Setting NeedAppearances flag...');
  try {
    const acroForm = pdfDoc2.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (acroForm) {
      acroForm.set(PDFName.of('NeedAppearances'), pdfDoc2.context.obj(true));
      console.log('  ✅ NeedAppearances flag set to true');
    }
  } catch (e) {
    console.log('  ⚠️ Failed to set NeedAppearances flag:', e.message);
  }

  const filled2 = await pdfDoc2.save();
  const output2 = path.join(__dirname, 'test-output', 'test-with-needappearances.pdf');
  await fs.writeFile(output2, filled2);

  console.log(`✅ Saved: ${output2}`);
  console.log(`   Size: ${(filled2.length / 1024).toFixed(2)} KB\n`);

  // Test 3: Fill + NeedAppearances + MERGE with Puppeteer (full production pattern)
  console.log('Test 3: Fill + NeedAppearances + MERGE with Puppeteer...');
  const formBytes3 = await fs.readFile(formPath);
  const pdfDoc3 = await PDFDocument.load(formBytes3);
  const form3 = pdfDoc3.getForm();

  // Fill same fields
  fields.forEach((fieldName, i) => {
    try {
      form3.getTextField(fieldName).setText(`Test ${i + 1}`);
    } catch (err) {}
  });

  // Check same checkboxes
  try { form3.getCheckBox('weather_heavy_rain').check(); } catch (err) {}
  try { form3.getCheckBox('weather_dusk').check(); } catch (err) {}
  try { form3.getCheckBox('road_type_motorway').check(); } catch (err) {}

  // SET NEEDAPPEARANCES FLAG
  console.log('  🔧 Setting NeedAppearances flag...');
  try {
    const acroForm = pdfDoc3.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict);
    if (acroForm) {
      acroForm.set(PDFName.of('NeedAppearances'), pdfDoc3.context.obj(true));
      console.log('  ✅ NeedAppearances flag set');
    }
  } catch (e) {
    console.log('  ⚠️ Failed to set NeedAppearances flag:', e.message);
  }

  // MERGE with Puppeteer using double copyPages pattern
  console.log('  🔄 Merging with double copyPages pattern...');
  const mergedPdf = await PDFDocument.create();

  // First copyPages
  const formPages1to12 = await mergedPdf.copyPages(pdfDoc3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  formPages1to12.forEach(page => mergedPdf.addPage(page));

  // Add Puppeteer page
  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);
  const page13Pdf = await PDFDocument.load(page13Bytes);
  const [htmlPage] = await mergedPdf.copyPages(page13Pdf, [0]);
  mergedPdf.addPage(htmlPage);

  // Second copyPages (same source)
  const formPages17to18 = await mergedPdf.copyPages(pdfDoc3, [16, 17]);
  formPages17to18.forEach(page => mergedPdf.addPage(page));

  const merged = await mergedPdf.save();
  const output3 = path.join(__dirname, 'test-output', 'test-needappearances-merged.pdf');
  await fs.writeFile(output3, merged);

  console.log(`✅ Saved: ${output3}`);
  console.log(`   Size: ${(merged.length / 1024).toFixed(2)} KB\n`);

  console.log('━'.repeat(60));
  console.log('📊 Check for XRef errors:\n');
  console.log('  pdftotext test-output/test-no-needappearances.pdf /dev/null 2>&1 | head -10');
  console.log('  pdftotext test-output/test-with-needappearances.pdf /dev/null 2>&1 | head -10');
  console.log('  pdftotext test-output/test-needappearances-merged.pdf /dev/null 2>&1 | head -10\n');
  console.log('Expected:');
  console.log('  - No flag: ZERO errors');
  console.log('  - With flag, no merge: If errors appear, flag is the culprit');
  console.log('  - With flag + merge: If XRef errors appear, we found the root cause!');
}

testNeedAppearancesFlag().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
