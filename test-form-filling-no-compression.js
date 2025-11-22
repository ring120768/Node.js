#!/usr/bin/env node

/**
 * Test: Production PDF Generation WITHOUT Adobe Compression
 *
 * Purpose: Isolate whether Adobe PDF Services compression causes XRef corruption
 *
 * Workflow:
 * 1. Fill form with real user data
 * 2. Set NeedAppearances flag
 * 3. Merge with Puppeteer pages
 * 4. SKIP Adobe compression ← KEY DIFFERENCE
 * 5. Check for XRef errors
 *
 * Expected Outcomes:
 * - If 0 XRef errors → Adobe compression is the culprit
 * - If still has XRef errors → Problem is elsewhere in the flow
 */

require('dotenv').config();

const adobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
const { fetchAllData } = require('./lib/dataFetcher');
const fs = require('fs');
const path = require('path');

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

async function testNoCompression() {
  log('\n━'.repeat(60), 'cyan');
  log('  🧪 PDF Generation WITHOUT Adobe Compression', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('\nGoal: Determine if Adobe compression causes XRef errors\n', 'yellow');

  const userId = process.argv[2];

  if (!userId) {
    log('⚠️ Usage: node test-form-filling-no-compression.js [user_id]', 'yellow');
    log('Example: node test-form-filling-no-compression.js 98b26465-4d34-43de-b5ee-158ca6be466a\n', 'yellow');
    process.exit(0);
  }

  try {
    // Step 1: Fetch real user data
    log('Step 1: Fetching real user data...', 'blue');
    const allData = await fetchAllData(userId);
    log(`✅ User: ${allData.user?.name || 'Unknown'} (${allData.user?.email || 'N/A'})`, 'green');
    log(`   Incidents: ${allData.metadata?.total_incidents || 0}`, 'green');
    log(`   Images: ${allData.metadata?.total_images || 0}\n`, 'green');

    // Step 2: Fill PDF form (includes NeedAppearances, NO flatten, merge with Puppeteer)
    log('Step 2: Filling PDF form (full production flow)...', 'blue');
    log('  - Fill form fields with real data', 'cyan');
    log('  - Set NeedAppearances flag', 'cyan');
    log('  - Skip form.flatten() (production pattern)', 'cyan');
    log('  - Merge with Puppeteer-generated pages 13-16', 'cyan');

    const pdfBuffer = await adobePdfFormFillerService.fillPdfForm(allData);
    const originalSizeKB = (pdfBuffer.length / 1024).toFixed(2);

    log(`✅ PDF filled successfully!`, 'green');
    log(`   Original size: ${originalSizeKB} KB\n`, 'green');

    // Step 3: SKIP COMPRESSION (this is the test)
    log('Step 3: SKIPPING Adobe PDF Services compression...', 'blue');
    log('  ⚠️  Using UNCOMPRESSED PDF for this test', 'yellow');
    log('  This isolates whether compression causes XRef errors\n', 'cyan');

    // Save uncompressed PDF
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `no-compression-${userId}.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);

    log('✅ Uncompressed PDF saved!\n', 'green');

    // Summary
    log('━'.repeat(60), 'cyan');
    log('  📊 TEST RESULTS', 'cyan');
    log('━'.repeat(60), 'cyan');

    log('\n📄 Generated File:', 'blue');
    log(`   ${outputPath}`, 'green');
    log(`   Size: ${originalSizeKB} KB (uncompressed)\n`, 'green');

    log('🔬 Next Steps:', 'yellow');
    log('   1. Check for XRef errors:', 'yellow');
    log(`      pdftotext ${outputPath} /dev/null 2>&1 | grep "XRef"\n`, 'cyan');

    log('   2. Extract text from pages 13-16:', 'yellow');
    log(`      pdftotext -f 13 -l 16 ${outputPath} - 2>/dev/null | head -20\n`, 'cyan');

    log('   3. Open PDF and verify pages 13-19 are visible\n', 'yellow');

    log('📈 Expected Outcomes:', 'yellow');
    log('   ✅ If 0 XRef errors → Adobe compression IS the root cause', 'yellow');
    log('   ❌ If XRef errors persist → Problem is elsewhere in the flow\n', 'yellow');

  } catch (error) {
    log('❌ Error during test:', 'red');
    console.error(error);
    process.exit(1);
  }
}

testNoCompression().catch(error => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
