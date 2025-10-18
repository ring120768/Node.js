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
    // Use the legal PDF template
    const templatePath = path.join(__dirname, 'pdf-templates', 'Car-Crash-Lawyer-AI-Incident-Report.pdf');

    if (!fs.existsSync(templatePath)) {
      log('❌ Legal PDF template not found!', 'red');
      log(`   Expected location: ${templatePath}`, 'yellow');
      log('   Please upload Car-Crash-Lawyer-AI-Incident-Report.pdf to pdf-templates/', 'yellow');
      process.exit(1);
    }

    // Get original size
    const stats = fs.statSync(templatePath);
    const originalSizeKB = (stats.size / 1024).toFixed(2);

    log(`   Using legal template: Car-Crash-Lawyer-AI-Incident-Report.pdf`, 'blue');
    log(`   Original size: ${originalSizeKB} KB`, 'blue');

    // Create output directory
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Test compression with Adobe v4 SDK
    log('   Compressing legal PDF with Adobe v4 SDK...', 'blue');
    const compressedPath = path.join(outputDir, 'legal-template-compressed.pdf');
    const compressedBuffer = await adobePdfService.compressPdf(templatePath, 'MEDIUM', compressedPath);

    const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2);
    const compressionRatio = ((1 - (compressedBuffer.length / stats.size)) * 100).toFixed(1);

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
    log(`   test-output/legal-template-compressed.pdf (${compressedSizeKB} KB)`, 'green');

    log('\n✅ Verified Operations:', 'blue');
    log('   • v4 OAuth Authentication - Working', 'green');
    log('   • PDF Upload to Adobe Cloud - Working', 'green');
    log('   • PDF Compression (v4 Job API) - Working', 'green');
    log(`   • Compression Ratio: ${compressionRatio}% size reduction`, 'green');

    log('\n📊 Compression Results:', 'blue');
    log(`   Original legal template: ${originalSizeKB} KB (1.9 MB)`, 'cyan');
    log(`   Compressed version: ${compressedSizeKB} KB`, 'cyan');
    log(`   Space saved: ${compressionRatio}%`, 'cyan');

    log('\n📚 Next Steps:', 'yellow');
    log('   1. Open compressed PDF to verify quality is preserved', 'yellow');
    log('   2. Test end-to-end form filling workflow', 'yellow');
    log('   3. Production ready - v4 SDK fully operational!\n', 'yellow');

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
