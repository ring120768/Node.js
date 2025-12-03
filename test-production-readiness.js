#!/usr/bin/env node

/**
 * Production Readiness Test
 *
 * Tests all critical services for Railway production deployment:
 * 1. Health check endpoints
 * 2. Database connectivity
 * 3. Puppeteer/Chromium availability
 * 4. Email service (SMTP connection)
 * 5. OpenAI API
 * 6. Supabase Storage
 *
 * Usage:
 *   node test-production-readiness.js [environment]
 *
 * Arguments:
 *   environment - Optional: 'local' or 'production' (default: local)
 *                 Production mode requires PRODUCTION_URL env var
 *
 * Examples:
 *   node test-production-readiness.js              # Test local dev
 *   PRODUCTION_URL=https://your-app.railway.app \
 *     node test-production-readiness.js production  # Test production
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

// Determine environment
const environment = process.argv[2] || 'local';
const isProduction = environment === 'production';
const baseUrl = isProduction
  ? process.env.PRODUCTION_URL || 'https://your-app.railway.app'
  : 'http://localhost:3000';

log(`\n${'█'.repeat(70)}`, 'magenta');
log(`  🔍 PRODUCTION READINESS TEST`, 'magenta');
log(`  Environment: ${environment.toUpperCase()}`, 'cyan');
log(`  Base URL: ${baseUrl}`, 'cyan');
log(`${'█'.repeat(70)}`, 'magenta');

const results = {
  healthCheck: { passed: false, details: '' },
  database: { passed: false, details: '' },
  puppeteer: { passed: false, details: '' },
  email: { passed: false, details: '' },
  openai: { passed: false, details: '' },
  storage: { passed: false, details: '' }
};

/**
 * Test 1: Health Check Endpoints
 */
async function testHealthCheck() {
  printHeader('TEST 1: Health Check Endpoints');

  try {
    log('📡 Testing /api/health...', 'blue');

    // For production, use fetch; for local, use native http
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      log('✅ PASS - Health check endpoint responding', 'green');
      results.healthCheck.passed = true;
      results.healthCheck.details = `Status: ${data.status}`;
      return true;
    } else {
      log(`❌ FAIL - Unexpected response: ${JSON.stringify(data)}`, 'red');
      results.healthCheck.details = `Failed with status ${response.status}`;
      return false;
    }
  } catch (error) {
    log(`❌ FAIL - Health check error: ${error.message}`, 'red');
    results.healthCheck.details = error.message;
    return false;
  }
}

/**
 * Test 2: Database Connectivity (Supabase)
 */
async function testDatabase() {
  printHeader('TEST 2: Database Connectivity');

  try {
    log('🗄️  Testing Supabase connection...', 'blue');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Simple query to test connection
    const { data, error } = await supabase
      .from('user_signup')
      .select('count')
      .limit(1);

    if (error) throw error;

    log('✅ PASS - Database connection successful', 'green');
    log(`   Connected to: ${process.env.SUPABASE_URL}`, 'cyan');
    results.database.passed = true;
    results.database.details = 'Connection successful';
    return true;

  } catch (error) {
    log(`❌ FAIL - Database error: ${error.message}`, 'red');
    results.database.details = error.message;
    return false;
  }
}

/**
 * Test 3: Puppeteer/Chromium Availability
 */
async function testPuppeteer() {
  printHeader('TEST 3: Puppeteer/Chromium Availability');

  try {
    log('🌐 Testing Puppeteer browser launch...', 'blue');

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    log(`   Using executable path: ${executablePath || 'default'}`, 'cyan');

    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const version = await browser.version();
    await browser.close();

    log('✅ PASS - Puppeteer browser launched successfully', 'green');
    log(`   Browser version: ${version}`, 'cyan');
    results.puppeteer.passed = true;
    results.puppeteer.details = `Version: ${version}`;
    return true;

  } catch (error) {
    log(`❌ FAIL - Puppeteer error: ${error.message}`, 'red');
    results.puppeteer.details = error.message;

    if (error.message.includes('browser at the configured path')) {
      log('\n⚠️  DIAGNOSIS:', 'yellow');
      log('   Chromium binary not found at configured path', 'yellow');
      log('   For Railway deployment:', 'yellow');
      log('   1. Ensure find-chromium.sh is executable (chmod +x)', 'yellow');
      log('   2. Verify nixpacks.toml uses: ./scripts/find-chromium.sh npm start', 'yellow');
      log('   3. Check Railway logs for "✅ Found Chromium at: ..." message', 'yellow');
    }

    return false;
  }
}

/**
 * Test 4: Email Service (SMTP)
 */
async function testEmail() {
  printHeader('TEST 4: Email Service (SMTP)');

  try {
    if (process.env.EMAIL_ENABLED !== 'true') {
      log('⚠️  Email service disabled (EMAIL_ENABLED != true)', 'yellow');
      results.email.passed = true; // Not a failure if intentionally disabled
      results.email.details = 'Disabled by configuration';
      return true;
    }

    log('📧 Testing SMTP connection...', 'blue');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.verify();

    log('✅ PASS - SMTP connection successful', 'green');
    log(`   Host: ${process.env.SMTP_HOST}`, 'cyan');
    log(`   Port: ${process.env.SMTP_PORT}`, 'cyan');
    log(`   User: ${process.env.SMTP_USER}`, 'cyan');
    results.email.passed = true;
    results.email.details = 'SMTP connection verified';
    return true;

  } catch (error) {
    log(`❌ FAIL - SMTP error: ${error.message}`, 'red');
    results.email.details = error.message;
    return false;
  }
}

/**
 * Test 5: OpenAI API
 */
async function testOpenAI() {
  printHeader('TEST 5: OpenAI API');

  try {
    log('🤖 Testing OpenAI API connection...', 'blue');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Simple API key validation request
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();

    log('✅ PASS - OpenAI API connection successful', 'green');
    log(`   Available models: ${data.data.length}`, 'cyan');
    results.openai.passed = true;
    results.openai.details = `${data.data.length} models available`;
    return true;

  } catch (error) {
    log(`❌ FAIL - OpenAI API error: ${error.message}`, 'red');
    results.openai.details = error.message;
    return false;
  }
}

/**
 * Test 6: Supabase Storage
 */
async function testStorage() {
  printHeader('TEST 6: Supabase Storage');

  try {
    log('📦 Testing Supabase Storage access...', 'blue');

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // List buckets to verify storage access
    const { data, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    const buckets = data.map(b => b.name).join(', ');

    log('✅ PASS - Supabase Storage accessible', 'green');
    log(`   Available buckets: ${buckets}`, 'cyan');
    results.storage.passed = true;
    results.storage.details = `Buckets: ${buckets}`;
    return true;

  } catch (error) {
    log(`❌ FAIL - Storage error: ${error.message}`, 'red');
    results.storage.details = error.message;
    return false;
  }
}

/**
 * Print Test Summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(70));
  log('  📊 TEST SUMMARY', 'cyan');
  console.log('='.repeat(70));

  const tests = [
    { name: 'Health Check', key: 'healthCheck' },
    { name: 'Database', key: 'database' },
    { name: 'Puppeteer', key: 'puppeteer' },
    { name: 'Email Service', key: 'email' },
    { name: 'OpenAI API', key: 'openai' },
    { name: 'Storage', key: 'storage' }
  ];

  let passCount = 0;
  let failCount = 0;

  tests.forEach(test => {
    const result = results[test.key];
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${status} - ${test.name}`, color);
    log(`      ${result.details}`, 'cyan');

    if (result.passed) passCount++;
    else failCount++;
  });

  console.log('='.repeat(70));

  const allPassed = failCount === 0;

  if (allPassed) {
    console.log('\n' + '█'.repeat(70));
    log('  🎉 ALL TESTS PASSED!', 'green');
    log(`  ${environment.toUpperCase()} environment is production ready`, 'green');
    console.log('█'.repeat(70) + '\n');
  } else {
    console.log('\n' + '█'.repeat(70));
    log(`  ⚠️  ${failCount} TEST(S) FAILED`, 'yellow');
    log(`  ${passCount}/${tests.length} services operational`, 'yellow');
    log('  Review the output above for details', 'yellow');
    console.log('█'.repeat(70) + '\n');
  }

  return allPassed;
}

/**
 * Main Test Runner
 */
async function runTests() {
  const startTime = Date.now();

  try {
    // Run all tests
    await testHealthCheck();
    await testDatabase();
    await testPuppeteer();
    await testEmail();
    await testOpenAI();
    await testStorage();

    // Print summary
    const allPassed = printSummary();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\nTest execution completed in ${duration}s`, 'blue');

    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    log(`\n❌ Fatal error during test execution: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();
