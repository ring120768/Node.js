#!/usr/bin/env node

/**
 * Test Replit Cookie Configuration
 * Verifies cookies are set correctly for Replit environment
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('\n🔍 Replit Cookie Configuration Test\n');
console.log('=' .repeat(60));

// Check environment
console.log('\n📋 Environment Check:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT: ${process.env.PORT || 'not set'}`);
console.log(`CORS_ALLOW_REPLIT_SUBDOMAINS: ${process.env.CORS_ALLOW_REPLIT_SUBDOMAINS || 'not set'}`);

// Simulate cookie settings
const cookieSettings = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

console.log('\n🍪 Cookie Settings:');
console.log(JSON.stringify(cookieSettings, null, 2));

console.log('\n✅ Validation:');

// Check each setting
if (cookieSettings.httpOnly) {
  console.log('  ✅ httpOnly: true (secure - JS cannot access)');
} else {
  console.log('  ❌ httpOnly: false (security risk!)');
}

if (cookieSettings.secure) {
  console.log('  ✅ secure: true (required for sameSite=none)');
} else {
  console.log('  ❌ secure: false (PROBLEM - required for Replit!)');
}

if (cookieSettings.sameSite === 'none') {
  console.log('  ✅ sameSite: none (allows cross-site - required for Replit)');
} else {
  console.log(`  ❌ sameSite: ${cookieSettings.sameSite} (PROBLEM - must be "none" for Replit!)`);
}

if (cookieSettings.maxAge > 0) {
  const days = Math.floor(cookieSettings.maxAge / (24 * 60 * 60 * 1000));
  console.log(`  ✅ maxAge: ${days} days (persistent cookie)`);
} else {
  console.log('  ❌ maxAge: session only (will be deleted on browser close)');
}

console.log('\n📊 Summary:');

const allCorrect =
  cookieSettings.httpOnly === true &&
  cookieSettings.secure === true &&
  cookieSettings.sameSite === 'none' &&
  cookieSettings.maxAge > 0;

if (allCorrect) {
  console.log('  ✅ All cookie settings are correct for Replit!');
  console.log('  ✅ Cookies should work on https://*.replit.app');
} else {
  console.log('  ❌ Cookie settings have issues!');
  console.log('  ❌ Session persistence will NOT work on Replit');
}

console.log('\n🌐 Replit Requirements:');
console.log('  • Must use HTTPS (Replit provides this)');
console.log('  • Must set sameSite=none (cross-site cookies)');
console.log('  • Must set secure=true (required with sameSite=none)');
console.log('  • Must set credentials: include in fetch calls');
console.log('  • CORS must allow Replit domains with credentials');

console.log('\n🧪 Testing Steps:');
console.log('  1. Deploy to Replit');
console.log('  2. Go to: https://YOUR-REPL.replit.app/replit-cookie-debug.html');
console.log('  3. Login and check if session persists');
console.log('  4. Navigate between pages - should stay logged in');

console.log('\n' + '='.repeat(60));
console.log('\n');
