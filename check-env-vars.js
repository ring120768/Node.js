#!/usr/bin/env node
/**
 * Check Environment Variables
 * Diagnoses which API keys are configured
 *
 * Usage:
 *   node check-env-vars.js           # Check local .env file
 *   node check-env-vars.js --replit  # Check Replit environment (no .env loading)
 */

// Only load .env if not in Replit mode
const isReplit = process.argv.includes('--replit');
if (!isReplit) {
  require('dotenv').config();
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

console.log(colors.cyan, '\n🔍 Environment Variable Diagnostic\n', colors.reset);

if (isReplit) {
  console.log(colors.yellow, 'ℹ️  Running in Replit mode (checking environment variables only, not .env file)', colors.reset);
} else {
  console.log(colors.cyan, 'ℹ️  Running in local mode (loading .env file)', colors.reset);
}
console.log('');

// Check DVLA API Key
const dvlaKey = process.env.DVLA_API_KEY;
if (dvlaKey) {
  console.log(colors.green, '✅ DVLA_API_KEY is SET', colors.reset);
  console.log(`   Value: ${dvlaKey.substring(0, 15)}... (${dvlaKey.length} chars)`);
} else {
  console.log(colors.red, '❌ DVLA_API_KEY is NOT SET', colors.reset);
  console.log(colors.yellow, '   Expected environment variable: DVLA_API_KEY', colors.reset);
}

console.log('');

// Check Insurance API Key
const insuranceKey = process.env.INSURANCE_API_KEY;
if (insuranceKey) {
  console.log(colors.green, '✅ INSURANCE_API_KEY is SET', colors.reset);
  console.log(`   Value: ${insuranceKey.substring(0, 15)}... (${insuranceKey.length} chars)`);
} else {
  console.log(colors.yellow, '⚠️  INSURANCE_API_KEY is NOT SET', colors.reset);
  console.log('   (This is optional - add when you get the key)');
}

console.log('\n' + colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);

// Check for similar variable names
console.log('\n🔎 Checking for similar variable names:');
const dvlaRelated = Object.keys(process.env).filter(key =>
  key.toLowerCase().includes('dvla')
);

if (dvlaRelated.length > 0) {
  console.log(colors.cyan, '   Found DVLA-related variables:', colors.reset);
  dvlaRelated.forEach(key => {
    console.log(`   - ${key} = ${process.env[key].substring(0, 15)}...`);
  });
} else {
  console.log(colors.red, '   No DVLA-related variables found', colors.reset);
}

console.log('\n' + colors.cyan + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + colors.reset);

console.log('\n💡 If DVLA_API_KEY is not showing:');
console.log('');
console.log('   📝 Local Development (.env file):');
console.log('      1. Open .env file in your editor');
console.log('      2. Add or update line:');
console.log('         DVLA_API_KEY=7i76VHmDog2SkOftinOTPauFFH0oWTbZ4btBFW9q');
console.log('      3. Save the file');
console.log('      4. Restart your local server');
console.log('');
console.log('   🔧 Replit Production (Secrets):');
console.log('      1. In Replit: Go to Tools → Secrets');
console.log('      2. Click "New Secret"');
console.log('      3. Key: DVLA_API_KEY (exact spelling, case-sensitive)');
console.log('      4. Value: 7i76VHmDog2SkOftinOTPauFFH0oWTbZ4btBFW9q');
console.log('      5. Click "Add Secret"');
console.log('      6. Restart your Replit server');
console.log('      7. Run: node check-env-vars.js --replit');
console.log('');
