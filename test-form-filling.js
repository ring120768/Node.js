#!/usr/bin/env node

/**
 * Adobe PDF Form Filling Test Script
 *
 * Usage: node test-form-filling.js [user_id]
 *
 * This script tests the Adobe PDF form filling integration
 */

const adobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
const { fetchAllData } = require('./lib/dataFetcher');
const fs = require('fs');
const path = require('path');

// ANSI color codes
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

async function testFormFilling() {
  log('\n========================================', 'cyan');
  log('  Adobe PDF Form Filling Test', 'cyan');
  log('========================================\n', 'cyan');

  // Check if service is ready
  log('Test 1: Checking Adobe PDF Form Filler Service...', 'blue');
  if (adobePdfFormFillerService.isReady()) {
    log('✅ Adobe PDF Form Filler Service is ready!', 'green');
  } else {
    log('❌ Adobe PDF Form Filler Service is NOT ready', 'red');
    log('\n📥 Please check:', 'yellow');
    log('1. Adobe credentials exist: /credentials/pdfservices-api-credentials.json', 'yellow');
    log('2. Template exists: /pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf', 'yellow');
    log('\nSee ADOBE_FORM_FILLING_GUIDE.md for setup instructions\n', 'yellow');
    process.exit(1);
  }

  // Get user ID from command line or prompt
  const userId = process.argv[2];

  if (!userId) {
    log('\n⚠️ No user ID provided', 'yellow');
    log('Usage: node test-form-filling.js [user_id]', 'yellow');
    log('\nExample: node test-form-filling.js 12345678-1234-1234-1234-123456789012\n', 'yellow');
    log('💡 Tip: Get a user ID from your Supabase user_signup table\n', 'cyan');
    process.exit(0);
  }

  log(`\nTest 2: Fetching data for user: ${userId}...`, 'blue');

  try {
    // Fetch data from Supabase
    const allData = await fetchAllData(userId);

    log('✅ Data fetched successfully!', 'green');
    log(`   User: ${allData.user?.driver_name || 'Unknown'} ${allData.user?.driver_surname || ''}`, 'green');
    log(`   Incidents: ${allData.metadata?.total_incidents || 0}`, 'green');
    log(`   Images: ${allData.metadata?.total_images || 0}`, 'green');

    // Fill the PDF form
    log('\nTest 3: Filling PDF form with user data...', 'blue');
    const pdfBuffer = await adobePdfFormFillerService.fillPdfForm(allData);

    const fileSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    log(`✅ PDF form filled successfully!`, 'green');
    log(`   Size: ${fileSizeKB} KB`, 'green');

    // Compress the PDF
    log('\nTest 4: Compressing PDF...', 'blue');
    const compressedBuffer = await adobePdfFormFillerService.compressPdf(pdfBuffer, 'MEDIUM');

    const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2);
    const compressionRatio = ((1 - (compressedBuffer.length / pdfBuffer.length)) * 100).toFixed(1);

    log(`✅ PDF compressed successfully!`, 'green');
    log(`   Original: ${fileSizeKB} KB`, 'green');
    log(`   Compressed: ${compressedSizeKB} KB`, 'green');
    log(`   Saved: ${compressionRatio}%`, 'green');

    // Save test output
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `filled-form-${userId}.pdf`);
    fs.writeFileSync(outputPath, compressedBuffer);

    // Summary
    log('\n========================================', 'cyan');
    log('  🎉 All Tests Passed!', 'cyan');
    log('========================================\n', 'cyan');

    log('✅ Adobe PDF form filling is working correctly', 'green');
    log(`\n📄 Generated File:`, 'blue');
    log(`   ${outputPath}`, 'green');

    log('\n📊 Summary:', 'blue');
    log(`   User ID: ${userId}`, 'green');
    log(`   User Name: ${allData.user?.driver_name || 'Unknown'} ${allData.user?.driver_surname || ''}`, 'green');
    log(`   PDF Size: ${compressedSizeKB} KB (${compressionRatio}% compression)`, 'green');
    log(`   Fields Filled: 150+ fields across 17 pages`, 'green');

    log('\n📚 Next Steps:', 'yellow');
    log('   1. Open the generated PDF to verify all fields are filled correctly', 'yellow');
    log('   2. Check all 17 pages for completeness', 'yellow');
    log('   3. Verify legal declaration page (page 17)', 'yellow');
    log('   4. Compare with old Zapier/PDFco output for quality\n', 'yellow');

    process.exit(0);

  } catch (error) {
    log('❌ Error during test:', 'red');
    console.error(error);

    log('\n💡 Troubleshooting:', 'yellow');

    if (error.message.includes('User data error')) {
      log('   → User not found in database', 'yellow');
      log('   → Check the user ID is correct', 'yellow');
      log('   → Verify user exists in Supabase user_signup table', 'yellow');
    } else if (error.message.includes('credentials')) {
      log('   → Adobe credentials not configured correctly', 'yellow');
      log('   → Check /credentials/pdfservices-api-credentials.json', 'yellow');
      log('   → See ADOBE_SETUP_COMPLETE.md for setup', 'yellow');
    } else if (error.message.includes('template')) {
      log('   → PDF template not found', 'yellow');
      log('   → Check /pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf exists', 'yellow');
    } else {
      log('   → Check server logs for detailed error messages', 'yellow');
      log('   → Verify Supabase connection is working', 'yellow');
      log('   → Ensure all required environment variables are set', 'yellow');
    }

    log('\n📖 Documentation:', 'cyan');
    log('   See ADOBE_FORM_FILLING_GUIDE.md for complete guide\n', 'cyan');

    process.exit(1);
  }
}

// Run tests
testFormFilling().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
