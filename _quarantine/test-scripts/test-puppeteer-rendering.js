#!/usr/bin/env node

/**
 * Test Puppeteer Rendering
 * Diagnose why HTML pages are blank in PDF
 */

const fs = require('fs').promises;
const path = require('path');

async function testPuppeteerRendering() {
  console.log('🧪 Testing Puppeteer Rendering\n');

  // Test 1: Simple HTML with visible content
  console.log('Test 1: Rendering simple HTML...');

  const simpleHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      background: white;
    }
    h1 {
      color: red;
      font-size: 48px;
    }
    p {
      color: black;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <h1>TEST PAGE</h1>
  <p>If you can read this, Puppeteer is working.</p>
  <p>This is a test of PDF generation.</p>
</body>
</html>
  `;

  const htmlToPdfConverter = require('./src/services/htmlToPdfConverter');

  try {
    const pdfBuffer = await htmlToPdfConverter.convertHtmlToPdf(simpleHtml, {
      pageNumber: 'test-simple'
    });

    const outputPath = path.join(__dirname, 'test-output', 'test-simple.pdf');
    await fs.writeFile(outputPath, pdfBuffer);

    console.log(`✅ Simple PDF generated: ${outputPath}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Simple test failed:', error.message);
    return;
  }

  // Test 2: HTML with gradient background (like our templates)
  console.log('Test 2: Rendering HTML with gradient background...');

  const gradientHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #0E7490 0%, #0c6179 100%);
      min-height: 100vh;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .container {
      background: white;
      margin: 20px;
      padding: 40px;
      min-height: 90vh;
    }

    h1 {
      color: #0E7490;
      font-size: 36px;
      margin-bottom: 20px;
    }

    p {
      color: #1F2937;
      font-size: 18px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GRADIENT BACKGROUND TEST</h1>
    <p>This tests if gradient backgrounds render correctly in PDF.</p>
    <p>You should see a teal gradient outside the white container.</p>
    <p>The container should have a white background with black text.</p>
  </div>
</body>
</html>
  `;

  try {
    const pdfBuffer = await htmlToPdfConverter.convertHtmlToPdf(gradientHtml, {
      pageNumber: 'test-gradient'
    });

    const outputPath = path.join(__dirname, 'test-output', 'test-gradient.pdf');
    await fs.writeFile(outputPath, pdfBuffer);

    console.log(`✅ Gradient PDF generated: ${outputPath}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Gradient test failed:', error.message);
    return;
  }

  // Test 3: Load actual page13 template
  console.log('Test 3: Rendering actual Page 13 template...');

  try {
    const templatePath = path.join(__dirname, 'views/pdf/page13-transcription.html');
    let templateHtml = await fs.readFile(templatePath, 'utf8');

    // Replace template variables with test data
    templateHtml = templateHtml.replace(/\{\{voice_transcription\}\}/g, 'TEST TRANSCRIPTION: This is a test of the actual template rendering.');
    templateHtml = templateHtml.replace(/\{\{analysis_metadata\}\}/g, 'Test Metadata: 2025-11-22');
    templateHtml = templateHtml.replace(/\{\{quality_review\}\}/g, 'TEST QUALITY REVIEW: This is a test review.');

    // Handle {{#if}} blocks - set all to show content
    templateHtml = templateHtml.replace(/\{\{#if voice_transcription\}\}/g, '');
    templateHtml = templateHtml.replace(/\{\{#if analysis_metadata\}\}/g, '');
    templateHtml = templateHtml.replace(/\{\{#if quality_review\}\}/g, '');
    templateHtml = templateHtml.replace(/\{\{else\}\}/g, '<!--');
    templateHtml = templateHtml.replace(/\{\{\/if\}\}/g, '-->');

    const pdfBuffer = await htmlToPdfConverter.convertHtmlToPdf(templateHtml, {
      pageNumber: 'test-page13'
    });

    const outputPath = path.join(__dirname, 'test-output', 'test-page13-direct.pdf');
    await fs.writeFile(outputPath, pdfBuffer);

    console.log(`✅ Page 13 PDF generated: ${outputPath}`);
    console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB\n`);
  } catch (error) {
    console.error('❌ Page 13 test failed:', error.message);
    return;
  }

  console.log('📊 Test Summary:');
  console.log('   1. Check test-simple.pdf - Should show "TEST PAGE" in red');
  console.log('   2. Check test-gradient.pdf - Should show teal gradient background');
  console.log('   3. Check test-page13-direct.pdf - Should show actual Page 13 layout');
  console.log('\nIf all PDFs are blank, the issue is with Puppeteer/Chrome rendering.');
  console.log('If simple.pdf works but others are blank, the issue is with CSS.');

  // Close browser
  await htmlToPdfConverter.closeBrowser();
}

testPuppeteerRendering().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
