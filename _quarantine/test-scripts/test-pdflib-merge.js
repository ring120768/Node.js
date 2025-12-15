#!/usr/bin/env node

/**
 * Test PDFLib Merge Process
 * Check if copying pages with PDFLib corrupts content
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function testPdfLibMerge() {
  console.log('🧪 Testing PDFLib Page Copying\n');

  // Step 1: Load the working test-simple.pdf (we know this has content)
  console.log('Step 1: Loading test-simple.pdf (known to work)...');

  const sourcePath = path.join(__dirname, 'test-output', 'test-simple.pdf');
  const sourceBytes = await fs.readFile(sourcePath);
  const sourcePdf = await PDFDocument.load(sourceBytes);

  console.log(`✅ Loaded source PDF: ${(sourceBytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: ${sourcePdf.getPageCount()}\n`);

  // Step 2: Create a new PDF and copy the page using PDFLib
  console.log('Step 2: Creating new PDF and copying page with PDFLib...');

  const newPdf = await PDFDocument.create();
  const [copiedPage] = await newPdf.copyPages(sourcePdf, [0]);
  newPdf.addPage(copiedPage);

  console.log(`✅ Copied page to new PDF\n`);

  // Step 3: Save the merged PDF
  console.log('Step 3: Saving merged PDF...');

  const mergedBytes = await newPdf.save();
  const outputPath = path.join(__dirname, 'test-output', 'test-merged-simple.pdf');
  await fs.writeFile(outputPath, mergedBytes);

  console.log(`✅ Saved merged PDF: ${outputPath}`);
  console.log(`   Size: ${(mergedBytes.length / 1024).toFixed(2)} KB\n`);

  // Step 4: Test with actual Page 13
  console.log('Step 4: Testing with actual Page 13 direct PDF...');

  const page13Path = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
  const page13Bytes = await fs.readFile(page13Path);
  const page13Pdf = await PDFDocument.load(page13Bytes);

  const newPdf2 = await PDFDocument.create();
  const [copiedPage13] = await newPdf2.copyPages(page13Pdf, [0]);
  newPdf2.addPage(copiedPage13);

  const merged13Bytes = await newPdf2.save();
  const output13Path = path.join(__dirname, 'test-output', 'test-merged-page13.pdf');
  await fs.writeFile(output13Path, merged13Bytes);

  console.log(`✅ Saved merged Page 13: ${output13Path}`);
  console.log(`   Original: ${(page13Bytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Merged: ${(merged13Bytes.length / 1024).toFixed(2)} KB\n`);

  // Step 5: Test with Adobe form page (to see if mixing works)
  console.log('Step 5: Testing hybrid merge (Adobe + Puppeteer)...');

  const formPath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-incident-report-main.pdf');
  const formBytes = await fs.readFile(formPath);
  const formPdf = await PDFDocument.load(formBytes);

  const hybridPdf = await PDFDocument.create();

  // Copy first page from Adobe form
  const [formPage1] = await hybridPdf.copyPages(formPdf, [0]);
  hybridPdf.addPage(formPage1);

  // Copy page from Puppeteer PDF
  const [puppeteerPage] = await hybridPdf.copyPages(page13Pdf, [0]);
  hybridPdf.addPage(puppeteerPage);

  // Copy another Adobe form page
  const [formPage2] = await hybridPdf.copyPages(formPdf, [1]);
  hybridPdf.addPage(formPage2);

  const hybridBytes = await hybridPdf.save();
  const hybridPath = path.join(__dirname, 'test-output', 'test-hybrid-merge.pdf');
  await fs.writeFile(hybridPath, hybridBytes);

  console.log(`✅ Saved hybrid PDF: ${hybridPath}`);
  console.log(`   Size: ${(hybridBytes.length / 1024).toFixed(2)} KB`);
  console.log(`   Pages: Form page 1 + Puppeteer page 13 + Form page 2\n`);

  console.log('━'.repeat(60));
  console.log('📊 Test Results:\n');
  console.log('Please check these PDFs:');
  console.log('1. test-merged-simple.pdf - Should show "TEST PAGE" in red');
  console.log('2. test-merged-page13.pdf - Should show Page 13 layout');
  console.log('3. test-hybrid-merge.pdf - Should show Form + Page13 + Form\n');
  console.log('If any are blank, PDFLib.copyPages() is corrupting the content.');
  console.log('If all work, the issue is specific to the full merge process.');
}

testPdfLibMerge().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
