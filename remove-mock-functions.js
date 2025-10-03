
#!/usr/bin/env node
/**
 * Script to safely remove all mock functions and test user references
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Removing mock functions and test user references...');

// Remove mock functions file if it exists
const mockFunctionsPath = path.join(__dirname, 'lib', 'mockFunctions.js');
if (fs.existsSync(mockFunctionsPath)) {
  fs.unlinkSync(mockFunctionsPath);
  console.log('✅ Removed lib/mockFunctions.js');
}

// Remove test user cleanup scripts
const testUserScripts = [
  'cleanup-test-user.js',
  'cleanup-persistent-test-user.js'
];

for (const script of testUserScripts) {
  if (fs.existsSync(script)) {
    // Rename instead of delete to preserve functionality if needed
    fs.renameSync(script, script + '.disabled');
    console.log(`✅ Disabled ${script}`);
  }
}

console.log('🎉 Mock function removal completed');
console.log('⚠️  Remember to test all functionality with real Typeform data');
