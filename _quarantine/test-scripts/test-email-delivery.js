#!/usr/bin/env node

/**
 * Email Delivery Test Script
 * Tests that emails are actually sent with PDF attachments
 * Uses existing production PDF from previous test
 */

// Load environment variables FIRST
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { sendEmails } = require('./lib/emailService');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEmailDelivery() {
  try {
    log('\n═══════════════════════════════════════════════════════════', 'cyan');
    log('        EMAIL DELIVERY TEST - PRODUCTION VERIFICATION        ', 'cyan');
    log('═══════════════════════════════════════════════════════════\n', 'cyan');

    // Test user details
    const testUserId = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
    const testUserEmail = 'ian.ring@sky.com';
    const pdfPath = path.join(__dirname, 'test-output', `filled-form-${testUserId}.pdf`);

    log('Test Configuration:', 'blue');
    log(`  User ID: ${testUserId}`, 'cyan');
    log(`  Email: ${testUserEmail}`, 'cyan');
    log(`  PDF: ${pdfPath}`, 'cyan');

    // Check if PDF exists
    log('\n📄 Step 1: Checking for existing PDF...', 'blue');
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF not found at ${pdfPath}. Run 'node test-form-filling.js ${testUserId}' first.`);
    }

    const pdfStats = fs.statSync(pdfPath);
    const pdfSizeKB = (pdfStats.size / 1024).toFixed(2);
    log(`✅ PDF found: ${pdfSizeKB} KB`, 'green');

    // Read PDF buffer
    log('\n📥 Step 2: Loading PDF buffer...', 'blue');
    const pdfBuffer = fs.readFileSync(pdfPath);
    log(`✅ PDF loaded: ${pdfBuffer.length} bytes`, 'green');

    // Check environment variables
    log('\n🔧 Step 3: Verifying SMTP configuration...', 'blue');
    const requiredEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing SMTP environment variables: ${missingVars.join(', ')}`);
    }

    log(`✅ SMTP Host: ${process.env.SMTP_HOST}`, 'green');
    log(`✅ SMTP Port: ${process.env.SMTP_PORT}`, 'green');
    log(`✅ SMTP User: ${process.env.SMTP_USER}`, 'green');
    log(`✅ SMTP Pass: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : 'NOT SET'}`, 'green');

    // Send test email
    log('\n📧 Step 4: Sending test email...', 'blue');
    log('  This will send to:', 'cyan');
    log(`    1. User: ${testUserEmail}`, 'cyan');
    log(`    2. Accounts: accounts@carcrashlawyerai.co.uk`, 'cyan');
    log('', 'cyan');
    log('  ⏳ Please wait... (this may take 10-30 seconds)', 'yellow');

    const startTime = Date.now();
    const emailResult = await sendEmails(testUserEmail, pdfBuffer, testUserId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Check result
    log(`\n📊 Step 5: Email delivery result (${duration}s):`, 'blue');

    if (emailResult.success) {
      log('✅ SUCCESS - Emails sent successfully!', 'green');
      log(`  User email ID: ${emailResult.userEmailId}`, 'cyan');
      log(`  Accounts email ID: ${emailResult.accountsEmailId}`, 'cyan');

      log('\n═══════════════════════════════════════════════════════════', 'green');
      log('                   ✅ EMAIL TEST PASSED                      ', 'green');
      log('═══════════════════════════════════════════════════════════', 'green');

      log('\nNext Steps:', 'blue');
      log('1. Check email inbox: ian.ring@sky.com', 'cyan');
      log('2. Check accounts inbox: accounts@carcrashlawyerai.co.uk', 'cyan');
      log('3. Verify PDF attachment opens correctly', 'cyan');
      log('4. Verify email content displays properly', 'cyan');

      return {
        success: true,
        userEmailId: emailResult.userEmailId,
        accountsEmailId: emailResult.accountsEmailId,
        pdfSize: pdfBuffer.length,
        duration: duration
      };

    } else {
      log('❌ FAILURE - Email delivery failed', 'red');
      log(`  Error: ${emailResult.error}`, 'red');

      log('\n═══════════════════════════════════════════════════════════', 'red');
      log('                   ❌ EMAIL TEST FAILED                      ', 'red');
      log('═══════════════════════════════════════════════════════════', 'red');

      log('\nTroubleshooting:', 'yellow');
      log('1. Verify SMTP credentials in .env file', 'cyan');
      log('2. Check if SMTP server is accessible', 'cyan');
      log('3. Verify email addresses are valid', 'cyan');
      log('4. Check server logs for detailed error messages', 'cyan');

      return {
        success: false,
        error: emailResult.error,
        pdfSize: pdfBuffer.length,
        duration: duration
      };
    }

  } catch (error) {
    log('\n❌ Test script error:', 'red');
    log(error.message, 'red');

    if (error.stack) {
      log('\nStack trace:', 'yellow');
      log(error.stack, 'yellow');
    }

    log('\n═══════════════════════════════════════════════════════════', 'red');
    log('                   ❌ EMAIL TEST FAILED                      ', 'red');
    log('═══════════════════════════════════════════════════════════', 'red');

    return {
      success: false,
      error: error.message
    };
  }
}

// Run test
if (require.main === module) {
  testEmailDelivery()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { testEmailDelivery };
