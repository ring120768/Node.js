#!/usr/bin/env node

/**
 * Railway Configuration Verification
 *
 * Verifies Railway deployment configuration before pushing to production.
 * Checks:
 * 1. nixpacks.toml syntax and configuration
 * 2. find-chromium.sh exists and is executable
 * 3. railway.json configuration
 * 4. Environment variable setup
 *
 * Usage: node scripts/verify-railway-config.js
 */

const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log('\n' + '='.repeat(70));
log('  🔍 RAILWAY CONFIGURATION VERIFICATION', 'cyan');
console.log('='.repeat(70) + '\n');

let hasErrors = false;
let hasWarnings = false;

/**
 * Check if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

/**
 * Check if file is executable
 */
function isExecutable(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    const stats = fs.statSync(fullPath);
    // Check if owner has execute permission (mode & 0o100)
    return (stats.mode & 0o100) !== 0;
  } catch {
    return false;
  }
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
  } catch {
    return null;
  }
}

// Test 1: Check nixpacks.toml exists
log('📋 Checking nixpacks.toml...', 'blue');
if (!fileExists('nixpacks.toml')) {
  log('❌ FAIL - nixpacks.toml not found', 'red');
  hasErrors = true;
} else {
  log('✅ PASS - nixpacks.toml exists', 'green');

  // Read and verify content
  const content = readFile('nixpacks.toml');

  // Check for start command
  if (!content.includes('./scripts/find-chromium.sh npm start')) {
    log('❌ FAIL - Start command not using find-chromium.sh', 'red');
    log('   Expected: cmd = "./scripts/find-chromium.sh npm start"', 'yellow');
    hasErrors = true;
  } else {
    log('✅ PASS - Start command correctly configured', 'green');
  }

  // Check for Chromium in nixPkgs
  if (!content.includes('"chromium"')) {
    log('❌ FAIL - Chromium not in nixPkgs list', 'red');
    hasErrors = true;
  } else {
    log('✅ PASS - Chromium in nixPkgs', 'green');
  }

  // Check for PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
  if (!content.includes('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD')) {
    log('⚠️  WARNING - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD not set', 'yellow');
    hasWarnings = true;
  } else {
    log('✅ PASS - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD configured', 'green');
  }

  // Check that wildcard PUPPETEER_EXECUTABLE_PATH is NOT present (bug fix)
  if (content.includes('PUPPETEER_EXECUTABLE_PATH = "/nix/store/*')) {
    log('❌ FAIL - Wildcard PUPPETEER_EXECUTABLE_PATH still present (bug!)', 'red');
    log('   Remove: PUPPETEER_EXECUTABLE_PATH = "/nix/store/*-chromium-*/bin/chromium"', 'yellow');
    hasErrors = true;
  } else {
    log('✅ PASS - No wildcard PUPPETEER_EXECUTABLE_PATH (bug fixed)', 'green');
  }
}

console.log();

// Test 2: Check find-chromium.sh
log('📋 Checking scripts/find-chromium.sh...', 'blue');
if (!fileExists('scripts/find-chromium.sh')) {
  log('❌ FAIL - scripts/find-chromium.sh not found', 'red');
  hasErrors = true;
} else {
  log('✅ PASS - scripts/find-chromium.sh exists', 'green');

  // Check if executable
  if (!isExecutable('scripts/find-chromium.sh')) {
    log('❌ FAIL - scripts/find-chromium.sh not executable', 'red');
    log('   Run: chmod +x scripts/find-chromium.sh', 'yellow');
    hasErrors = true;
  } else {
    log('✅ PASS - scripts/find-chromium.sh is executable', 'green');
  }

  // Read and verify content
  const content = readFile('scripts/find-chromium.sh');
  if (content) {
    // Check for shebang
    if (!content.startsWith('#!/bin/bash')) {
      log('⚠️  WARNING - Missing #!/bin/bash shebang', 'yellow');
      hasWarnings = true;
    } else {
      log('✅ PASS - Shebang present', 'green');
    }

    // Check for find command
    if (!content.includes('find /nix/store')) {
      log('❌ FAIL - find command not present', 'red');
      hasErrors = true;
    } else {
      log('✅ PASS - find command present', 'green');
    }

    // Check for export
    if (!content.includes('export PUPPETEER_EXECUTABLE_PATH')) {
      log('❌ FAIL - export PUPPETEER_EXECUTABLE_PATH not present', 'red');
      hasErrors = true;
    } else {
      log('✅ PASS - export statement present', 'green');
    }

    // Check for exec
    if (!content.includes('exec "$@"')) {
      log('❌ FAIL - exec "$@" not present', 'red');
      hasErrors = true;
    } else {
      log('✅ PASS - exec statement present', 'green');
    }
  }
}

console.log();

// Test 3: Check railway.json
log('📋 Checking railway.json...', 'blue');
if (!fileExists('railway.json')) {
  log('⚠️  WARNING - railway.json not found (optional)', 'yellow');
  hasWarnings = true;
} else {
  log('✅ PASS - railway.json exists', 'green');

  try {
    const railwayConfig = JSON.parse(readFile('railway.json'));

    // Check builder
    if (railwayConfig.build?.builder !== 'NIXPACKS') {
      log('⚠️  WARNING - Builder not set to NIXPACKS', 'yellow');
      hasWarnings = true;
    } else {
      log('✅ PASS - Builder set to NIXPACKS', 'green');
    }
  } catch (error) {
    log('❌ FAIL - railway.json is not valid JSON', 'red');
    hasErrors = true;
  }
}

console.log();

// Test 4: Check application code
log('📋 Checking application code...', 'blue');

const htmlToPdfPath = 'src/services/htmlToPdfConverter.js';
if (!fileExists(htmlToPdfPath)) {
  log('⚠️  WARNING - htmlToPdfConverter.js not found', 'yellow');
  hasWarnings = true;
} else {
  const content = readFile(htmlToPdfPath);
  if (content) {
    // Check for executablePath configuration
    if (!content.includes('process.env.PUPPETEER_EXECUTABLE_PATH')) {
      log('⚠️  WARNING - executablePath not reading from env var', 'yellow');
      hasWarnings = true;
    } else {
      log('✅ PASS - Puppeteer reads PUPPETEER_EXECUTABLE_PATH', 'green');
    }

    // Check for Railway-specific args
    if (!content.includes('--no-sandbox')) {
      log('⚠️  WARNING - Missing --no-sandbox flag', 'yellow');
      hasWarnings = true;
    } else {
      log('✅ PASS - Railway-specific Puppeteer args present', 'green');
    }
  }
}

console.log();

// Test 5: Check environment variables (from .env.example or docs)
log('📋 Checking environment variable documentation...', 'blue');

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS'
];

const optionalEnvVars = [
  'PUPPETEER_EXECUTABLE_PATH',  // Auto-set by find-chromium.sh in production
  'PDF_SERVICES_CLIENT_ID',
  'PDF_SERVICES_CLIENT_SECRET',
  'WHAT3WORDS_API_KEY',
  'DVLA_API_KEY'
];

log('   Required environment variables for Railway:', 'cyan');
requiredEnvVars.forEach(varName => {
  log(`      - ${varName}`, 'cyan');
});

log('   Optional environment variables:', 'cyan');
optionalEnvVars.forEach(varName => {
  log(`      - ${varName}`, 'cyan');
});

log('\n   ⚠️  Remember to set these in Railway dashboard:', 'yellow');
log('      Settings → Environment → Variables', 'yellow');

console.log();

// Final Summary
console.log('='.repeat(70));
log('  📊 VERIFICATION SUMMARY', 'cyan');
console.log('='.repeat(70));

if (hasErrors) {
  log('  ❌ ERRORS FOUND - Configuration needs fixes before deployment', 'red');
  log('  Review the output above and fix all errors', 'red');
  console.log('='.repeat(70) + '\n');
  process.exit(1);
} else if (hasWarnings) {
  log('  ⚠️  WARNINGS FOUND - Configuration functional but could be improved', 'yellow');
  log('  Review warnings above (optional fixes)', 'yellow');
  console.log('='.repeat(70) + '\n');
  process.exit(0);
} else {
  log('  ✅ ALL CHECKS PASSED - Configuration ready for Railway deployment!', 'green');
  log('  Next steps:', 'green');
  log('     1. git add nixpacks.toml scripts/find-chromium.sh', 'cyan');
  log('     2. git commit -m "fix: Railway Puppeteer configuration"', 'cyan');
  log('     3. git push railway main', 'cyan');
  log('     4. Monitor Railway logs for "✅ Found Chromium at: ..."', 'cyan');
  console.log('='.repeat(70) + '\n');
  process.exit(0);
}
