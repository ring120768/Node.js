#!/usr/bin/env node
/**
 * Test Script: Session Persistence Fix Verification
 * Purpose: Verify cookie settings are consistent between login and session refresh
 * Usage: node test-session-persistence.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

console.log(colors.cyan, '\n🧪 Testing Session Persistence Fix\n', colors.reset);

// Test 1: Verify cookie settings in auth.controller.js
console.log('Test 1: Checking login controller cookie settings...');
const authControllerPath = path.join(__dirname, 'src/controllers/auth.controller.js');
const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');

let loginSameSite = null;
let loginSecure = null;

// Find the first res.cookie('access_token' occurrence in signup or login functions
const accessTokenCookieRegex = /res\.cookie\('access_token'[^;]*{([^}]+)}/g;
const matches = [...authControllerContent.matchAll(accessTokenCookieRegex)];

if (matches.length > 0) {
  // Extract from first match (should be in signup function)
  const cookieSettings = matches[0][1];

  const sameSiteMatch = cookieSettings.match(/sameSite:\s*'([^']+)'/);
  const secureMatch = cookieSettings.match(/secure:\s*true/);
  const secureConditionalMatch = cookieSettings.match(/secure:\s*process\.env/);

  loginSameSite = sameSiteMatch ? sameSiteMatch[1] : null;

  if (secureMatch) {
    loginSecure = 'true';
  } else if (secureConditionalMatch) {
    loginSecure = 'process.env.NODE_ENV === \'production\'';
  } else {
    loginSecure = null;
  }

  console.log(`  Found ${matches.length} res.cookie('access_token') calls in auth controller`);
} else {
  console.log('  ⚠️  Could not find res.cookie(\'access_token\') in auth controller');
}

console.log(`  Login/Signup Cookie Settings:`);
console.log(`    sameSite: '${loginSameSite}'`);
console.log(`    secure: ${loginSecure}`);

// Test 2: Verify cookie settings in authMiddleware.js
console.log('\nTest 2: Checking auth middleware cookie settings...');
const middlewarePath = path.join(__dirname, 'src/middleware/authMiddleware.js');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

// Find all cookie settings in refresh sections
const refreshSections = middlewareContent.split('if (!refreshError && data.session)');
const middlewareCookieSettings = [];

refreshSections.slice(1).forEach((section, idx) => {
  const sameSiteMatch = section.match(/sameSite:\s*'([^']+)'/);
  const secureMatch = section.match(/secure:\s*(true|false|process\.env[^,]+)/);

  if (sameSiteMatch && secureMatch) {
    middlewareCookieSettings.push({
      location: idx === 0 ? 'requireAuth' : 'optionalAuth',
      sameSite: sameSiteMatch[1],
      secure: secureMatch[1]
    });
  }
});

console.log(`  Found ${middlewareCookieSettings.length} refresh cookie settings in middleware`);
middlewareCookieSettings.forEach(setting => {
  console.log(`  ${setting.location}:`);
  console.log(`    sameSite: '${setting.sameSite}'`);
  console.log(`    secure: ${setting.secure}`);
});

// Test 3: Verify consistency
console.log('\nTest 3: Verifying cookie settings consistency...');
let allConsistent = true;
const issues = [];

middlewareCookieSettings.forEach(setting => {
  if (setting.sameSite !== loginSameSite) {
    allConsistent = false;
    issues.push(`  ❌ ${setting.location}: sameSite mismatch - login='${loginSameSite}' vs middleware='${setting.sameSite}'`);
  } else {
    console.log(`  ✅ ${setting.location}: sameSite matches ('${setting.sameSite}')`);
  }

  const middlewareIsAlwaysTrue = setting.secure === 'true';
  const loginIsAlwaysTrue = loginSecure === 'true';

  if (middlewareIsAlwaysTrue !== loginIsAlwaysTrue) {
    allConsistent = false;
    issues.push(`  ❌ ${setting.location}: secure setting mismatch - login=${loginSecure} vs middleware=${setting.secure}`);
  } else {
    console.log(`  ✅ ${setting.location}: secure matches (${setting.secure})`);
  }
});

// Test 4: Verify sameSite='none' requires secure=true
console.log('\nTest 4: Verifying sameSite=none security requirements...');
middlewareCookieSettings.forEach(setting => {
  if (setting.sameSite === 'none') {
    const isSecureTrue = setting.secure === 'true';
    if (isSecureTrue) {
      console.log(`  ✅ ${setting.location}: sameSite='none' with secure=true (correct for Replit)`);
    } else {
      allConsistent = false;
      issues.push(`  ❌ ${setting.location}: sameSite='none' requires secure=true (browser requirement)`);
    }
  }
});

// Test 5: Check for conditional secure settings
console.log('\nTest 5: Checking for problematic conditional secure settings...');
const hasConditionalSecure = middlewareContent.includes('process.env.NODE_ENV');
if (hasConditionalSecure) {
  console.log(colors.yellow, '  ⚠️  WARNING: Found conditional secure settings (process.env.NODE_ENV)', colors.reset);
  console.log('     This could cause issues in production vs development');
  issues.push('  ⚠️  Consider using secure:true always for Replit deployment');
} else {
  console.log(colors.green, '  ✅ No conditional secure settings found', colors.reset);
}

// Final Results
console.log('\n' + '='.repeat(60));
console.log('FINAL RESULTS');
console.log('='.repeat(60));

if (allConsistent && issues.length === 0) {
  console.log(colors.green);
  console.log('✅ ALL TESTS PASSED!');
  console.log('✅ Cookie settings are consistent between login and middleware');
  console.log('✅ Session should persist correctly across navigation');
  console.log(colors.reset);

  console.log('\n📋 Summary:');
  console.log(`  - sameSite: '${loginSameSite}' (consistent across all locations)`);
  console.log(`  - secure: true (consistent across all locations)`);
  console.log(`  - Tested: requireAuth and optionalAuth middleware functions`);

  process.exit(0);
} else {
  console.log(colors.red);
  console.log('❌ TESTS FAILED - Issues found:');
  issues.forEach(issue => console.log(issue));
  console.log(colors.reset);

  console.log('\n💡 Recommendations:');
  console.log('  1. Ensure all cookie settings use sameSite: \'none\'');
  console.log('  2. Ensure all cookie settings use secure: true (not conditional)');
  console.log('  3. These settings are required for Replit subdomain cookies');

  process.exit(1);
}
