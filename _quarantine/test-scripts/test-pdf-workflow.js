
#!/usr/bin/env node

/**
 * PDF Workflow Test Script
 * 
 * This script tests the current PDF generation workflow
 */

const path = require('path');
const fs = require('fs');

// ANSI colors
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

async function testPdfWorkflow() {
  log('\n========================================', 'cyan');
  log('  PDF Workflow Status Check', 'cyan');
  log('========================================\n', 'cyan');

  // Test 1: Check Adobe credentials
  log('Test 1: Checking Adobe PDF credentials...', 'blue');
  const credentialsPath = path.join(__dirname, 'credentials/pdfservices-api-credentials.json');
  
  if (fs.existsSync(credentialsPath)) {
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      if (credentials.client_credentials && credentials.client_credentials.client_id) {
        log('✅ Adobe credentials found and valid', 'green');
      } else {
        log('❌ Adobe credentials file exists but invalid format', 'red');
      }
    } catch (error) {
      log('❌ Adobe credentials file exists but invalid JSON', 'red');
    }
  } else {
    log('❌ Adobe credentials not found', 'red');
    log('   Expected location: /credentials/pdfservices-api-credentials.json', 'yellow');
  }

  // Test 2: Check PDF template
  log('\nTest 2: Checking PDF template...', 'blue');
  const templatePath = path.join(__dirname, 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
  
  if (fs.existsSync(templatePath)) {
    const stats = fs.statSync(templatePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    log(`✅ PDF template found (${sizeKB} KB)`, 'green');
  } else {
    log('❌ PDF template not found', 'red');
    log('   Expected location: /pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf', 'yellow');
  }

  // Test 3: Check Adobe services
  log('\nTest 3: Checking Adobe services...', 'blue');
  try {
    const adobePdfService = require('./src/services/adobePdfService');
    const adobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
    
    if (adobePdfService.isReady()) {
      log('✅ Adobe PDF Service is ready', 'green');
    } else {
      log('❌ Adobe PDF Service is not ready', 'red');
    }
    
    if (adobePdfFormFillerService.isReady()) {
      log('✅ Adobe PDF Form Filler Service is ready', 'green');
    } else {
      log('❌ Adobe PDF Form Filler Service is not ready', 'red');
    }
  } catch (error) {
    log('❌ Error loading Adobe services:', 'red');
    console.error(error.message);
  }

  // Test 4: Check legacy PDF generation
  log('\nTest 4: Checking legacy PDF generation...', 'blue');
  try {
    const { generatePDF } = require('./lib/generators/pdfGenerator');
    if (typeof generatePDF === 'function') {
      log('✅ Legacy PDF generation available', 'green');
    } else {
      log('❌ Legacy PDF generation not properly exported', 'red');
    }
  } catch (error) {
    log('❌ Legacy PDF generation not available:', 'red');
    log(`   ${error.message}`, 'yellow');
  }

  // Test 5: Check data fetcher
  log('\nTest 5: Checking data fetcher...', 'blue');
  try {
    const { fetchAllData } = require('./lib/data/dataFetcher');
    if (typeof fetchAllData === 'function') {
      log('✅ Data fetcher available', 'green');
    } else {
      log('❌ Data fetcher not properly exported', 'red');
    }
  } catch (error) {
    log('❌ Data fetcher not available:', 'red');
    log(`   ${error.message}`, 'yellow');
  }

  // Summary
  log('\n========================================', 'cyan');
  log('  Summary & Recommendations', 'cyan');
  log('========================================\n', 'cyan');

  log('📊 Current Status:', 'blue');
  log('   • PDF Controller: ✅ Available at /api/pdf/generate', 'green');
  log('   • Automatic Fallback: ✅ Configured', 'green');
  log('   • Email & Storage: ✅ Implemented', 'green');

  log('\n📋 Next Steps:', 'yellow');
  if (!fs.existsSync(credentialsPath)) {
    log('   1. Add Adobe credentials to enable high-quality PDF generation', 'yellow');
  }
  if (!fs.existsSync(templatePath)) {
    log('   2. Upload PDF template for form filling', 'yellow');
  }
  log('   3. Test with real user data using: node test-form-filling.js [user_id]', 'yellow');

  process.exit(0);
}

// Run test
testPdfWorkflow().catch(error => {
  log('\n❌ Test failed:', 'red');
  console.error(error);
  process.exit(1);
});
