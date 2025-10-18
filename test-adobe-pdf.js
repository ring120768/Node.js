#!/usr/bin/env node

/**
 * Adobe PDF Services Test Script
 *
 * Usage: node test-adobe-pdf.js
 *
 * This script tests your Adobe PDF Services integration
 */

const adobePdfService = require('./src/services/adobePdfService');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAdobePdfServices() {
  log('\n========================================', 'cyan');
  log('  Adobe PDF Services Test Suite', 'cyan');
  log('========================================\n', 'cyan');

  // Test 1: Check if service is initialized
  log('Test 1: Checking Adobe PDF Services initialization...', 'blue');
  if (adobePdfService.isReady()) {
    log('✅ Adobe PDF Services is initialized and ready!', 'green');
  } else {
    log('❌ Adobe PDF Services is NOT initialized', 'red');
    log('\n📥 Setup Instructions:', 'yellow');
    log('1. Go to: https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html', 'yellow');
    log('2. Sign in with your Adobe ID', 'yellow');
    log('3. Create new PDF Services API credentials', 'yellow');
    log('4. Download the credentials ZIP file', 'yellow');
    log('5. Extract and copy pdfservices-api-credentials.json to /credentials/', 'yellow');
    log('\nFor detailed instructions, see: /credentials/README.md\n', 'yellow');
    process.exit(1);
  }

  // Test 2: Test PDF compression (v4 SDK)
  log('\nTest 2: Testing PDF compression (v4 SDK)...', 'blue');
  try {
    // Create output directory
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a test PDF using pdf-lib
    log('   Creating test PDF with pdf-lib...', 'blue');
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add multiple pages with content to make it compressible
    for (let i = 1; i <= 5; i++) {
      const page = pdfDoc.addPage([600, 800]);
      const { height } = page.getSize();

      page.drawText(`Adobe PDF Services v4 Test - Page ${i}`, {
        x: 50,
        y: height - 50,
        size: 24,
        font: helveticaFont,
        color: rgb(0.13, 0.59, 0.95),
      });

      page.drawText('This is a test PDF document created with pdf-lib.', {
        x: 50,
        y: height - 100,
        size: 14,
        font: timesRomanFont,
      });

      // Add some repetitive content to make compression effective
      for (let j = 0; j < 20; j++) {
        page.drawText(`Line ${j + 1}: Testing PDF compression with Adobe PDF Services v4 SDK`, {
          x: 50,
          y: height - 140 - (j * 25),
          size: 12,
          font: timesRomanFont,
        });
      }
    }

    const testPdfBytes = await pdfDoc.save();
    const testPdfPath = path.join(outputDir, 'test-original.pdf');
    fs.writeFileSync(testPdfPath, testPdfBytes);

    const originalSizeKB = (testPdfBytes.length / 1024).toFixed(2);
    log(`   ✅ Test PDF created: ${originalSizeKB} KB`, 'green');

    // Test compression with Adobe v4 SDK
    log('   Compressing PDF with Adobe v4 SDK...', 'blue');
    const compressedPath = path.join(outputDir, 'test-compressed.pdf');
    const compressedBuffer = await adobePdfService.compressPdf(testPdfBytes, 'MEDIUM', compressedPath);

    const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2);
    const compressionRatio = ((1 - (compressedBuffer.length / testPdfBytes.length)) * 100).toFixed(1);

    log(`✅ PDF compressed successfully!`, 'green');
    log(`   Original: ${originalSizeKB} KB`, 'green');
    log(`   Compressed: ${compressedSizeKB} KB`, 'green');
    log(`   Saved: ${compressionRatio}%`, 'green');

    // Summary
    log('\n========================================', 'cyan');
    log('  🎉 All Tests Passed!', 'cyan');
    log('========================================\n', 'cyan');

    log('✅ Adobe PDF Services v4 is working correctly', 'green');
    log('\n📄 Generated Files:', 'blue');
    log(`   1. test-output/test-original.pdf (${originalSizeKB} KB)`, 'green');
    log(`   2. test-output/test-compressed.pdf (${compressedSizeKB} KB)`, 'green');

    log('\n✅ Verified Operations:', 'blue');
    log('   • v4 OAuth Authentication - Working', 'green');
    log('   • PDF Compression (v4 Job API) - Working', 'green');
    log(`   • Compression Ratio: ${compressionRatio}% size reduction`, 'green');

    log('\n📚 Next Steps:', 'yellow');
    log('   1. Open test PDFs in test-output/ to verify quality', 'yellow');
    log('   2. Test end-to-end form filling workflow', 'yellow');
    log('   3. Verify compression works in production\n', 'yellow');

    process.exit(0);

  } catch (error) {
    log('❌ Error during PDF operations:', 'red');
    console.error(error);
    log('\n💡 Troubleshooting:', 'yellow');
    log('   1. Verify credentials file exists and is valid', 'yellow');
    log('   2. Check your Adobe API quota hasn\'t been exceeded', 'yellow');
    log('   3. Ensure you have internet connection', 'yellow');
    log('   4. Check server logs for detailed error messages\n', 'yellow');
    process.exit(1);
  }
}

// Run tests
testAdobePdfServices().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
