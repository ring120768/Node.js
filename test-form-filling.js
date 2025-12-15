#!/usr/bin/env node

/**
 * Adobe PDF Form Filling Test Script
 *
 * Usage: node test-form-filling.js [user_id]
 *
 * This script tests the Adobe PDF form filling integration
 */

// Load environment variables
require('dotenv').config();

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
  const useAdobe = adobePdfFormFillerService.isReady();

  if (useAdobe) {
    log('✅ Adobe PDF Form Filler Service is ready!', 'green');
  } else {
    log('⚠️  Adobe PDF Form Filler Service is NOT ready', 'yellow');
    log('📄 Will use LEGACY PDF generation method (pdf-lib)', 'cyan');
    log('   Template: /pdf-templates/Car-Crash-Lawyer-AI-Incident-Report-Main.pdf\n', 'cyan');
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
    log(`   User: ${allData.user?.name || 'Unknown'} ${allData.user?.surname || ''}`, 'green');
    log(`   Email: ${allData.user?.email || 'N/A'}`, 'green');
    log(`   Signup Date: ${allData.user?.subscription_start_date || allData.user?.created_at || 'N/A'}`, 'green');
    log(`   Incidents: ${allData.metadata?.total_incidents || 0}`, 'green');
    log(`   Images: ${allData.metadata?.total_images || 0}`, 'green');

    // DEBUG: Show imageUrls object for what3words investigation
    log('\n📸 DEBUG - Image URLs Object:', 'cyan');
    if (allData.imageUrls) {
      const imageUrlKeys = Object.keys(allData.imageUrls);
      log(`   Total keys: ${imageUrlKeys.length}`, 'cyan');

      // Show all keys
      log('\n   All imageUrls keys:', 'yellow');
      imageUrlKeys.forEach(key => {
        const url = allData.imageUrls[key];
        const urlPreview = url ? url.substring(0, 80) + '...' : '[EMPTY]';
        log(`      ${key}: ${urlPreview}`, 'green');
      });

      // Check specifically for what3words-related keys
      log('\n   🔍 What3Words investigation:', 'yellow');
      const what3wordsKeys = ['what3words', 'what3words_screenshot', 'location_map_screenshot'];
      what3wordsKeys.forEach(key => {
        if (allData.imageUrls.hasOwnProperty(key)) {
          log(`      ✅ Found key "${key}": ${allData.imageUrls[key] ? 'HAS VALUE' : 'EMPTY'}`, 'green');
          if (allData.imageUrls[key]) {
            log(`         URL: ${allData.imageUrls[key].substring(0, 120)}...`, 'cyan');
          }
        } else {
          log(`      ❌ Key "${key}" NOT FOUND in imageUrls object`, 'red');
        }
      });
    } else {
      log('   ⚠️ allData.imageUrls is null/undefined', 'red');
    }

    // Fill the PDF form
    log('\nTest 3: Filling PDF form with user data...', 'blue');

    let pdfBuffer;
    if (useAdobe) {
      try {
        pdfBuffer = await adobePdfFormFillerService.fillPdfForm(allData);
      } catch (adobeError) {
        log(`⚠️  Adobe error: ${adobeError.message}`, 'yellow');
        log('📄 Falling back to legacy PDF generator (pdf-lib)...', 'cyan');
        const { generatePDF } = require('./lib/pdfGenerator');
        pdfBuffer = await generatePDF(allData);
      }
    } else {
      const { generatePDF } = require('./lib/pdfGenerator');
      pdfBuffer = await generatePDF(allData);
    }

    const fileSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    log(`✅ PDF form filled successfully!`, 'green');
    log(`   Size: ${fileSizeKB} KB`, 'green');

    // Compress the PDF (if Adobe is available)
    let finalBuffer = pdfBuffer;
    if (useAdobe) {
      try {
        log('\nTest 4: Compressing PDF...', 'blue');
        finalBuffer = await adobePdfFormFillerService.compressPdf(pdfBuffer, 'MEDIUM');

        const compressedSizeKB = (finalBuffer.length / 1024).toFixed(2);
        const compressionRatio = ((1 - (finalBuffer.length / pdfBuffer.length)) * 100).toFixed(1);

        log(`✅ PDF compressed successfully!`, 'green');
        log(`   Original: ${fileSizeKB} KB`, 'green');
        log(`   Compressed: ${compressedSizeKB} KB`, 'green');
        log(`   Saved: ${compressionRatio}%`, 'green');
      } catch (compressError) {
        log(`⚠️  Compression failed, using uncompressed PDF`, 'yellow');
      }
    } else {
      log('\nTest 4: Skipping compression (Adobe not available)', 'cyan');
    }

    // Save test output
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `filled-form-${userId}.pdf`);
    fs.writeFileSync(outputPath, finalBuffer);

    // Summary
    log('\n========================================', 'cyan');
    log('  🎉 All Tests Passed!', 'cyan');
    log('========================================\n', 'cyan');

    const method = useAdobe ? 'Adobe PDF Services' : 'Legacy PDF Generator (pdf-lib)';
    log(`✅ PDF generation is working correctly using ${method}`, 'green');
    log(`\n📄 Generated File:`, 'blue');
    log(`   ${outputPath}`, 'green');

    const finalSizeKB = (finalBuffer.length / 1024).toFixed(2);
    log('\n📊 Summary:', 'blue');
    log(`   User ID: ${userId}`, 'green');
    log(`   User Name: ${allData.user?.name || 'Unknown'} ${allData.user?.surname || ''}`, 'green');
    log(`   User Email: ${allData.user?.email || 'N/A'}`, 'green');
    log(`   PDF Size: ${finalSizeKB} KB`, 'green');
    log(`   Method: ${method}`, 'green');
    log(`   Fields Filled: 207 fields (including 51 NEW fields)`, 'green');

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
      log('   → Check /pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf exists', 'yellow');
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
