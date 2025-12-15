/**
 * Test safety controller module loading
 * Reproduces the exact loading sequence to find the issue
 */

console.log('1️⃣ Starting test...\n');

// Step 1: Load dotenv (like index.js does at line 38)
console.log('2️⃣ Loading dotenv...');
require('dotenv').config();
console.log('   ✅ dotenv loaded');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET (' + process.env.SUPABASE_URL.substring(0, 30) + '...)' : 'NOT SET');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');
console.log('');

// Step 2: Try to load the controller
console.log('3️⃣ Loading safety.controller...');
try {
  const safetyController = require('./src/controllers/safety.controller');
  console.log('   ✅ Controller loaded successfully');
  console.log('   Exports:', Object.keys(safetyController));
  console.log('   updateSafetyStatus:', typeof safetyController.updateSafetyStatus);
  console.log('');

  // Step 3: Try to load the routes
  console.log('4️⃣ Loading safety.routes...');
  const safetyRoutes = require('./src/routes/safety.routes');
  console.log('   ✅ Routes loaded successfully');
  console.log('');

  console.log('✅ TEST PASSED: All modules load successfully\n');

} catch (error) {
  console.log('   ❌ Error loading controller:');
  console.log('   Message:', error.message);
  console.log('   Stack:', error.stack);
  console.log('');
  console.log('❌ TEST FAILED\n');
  process.exit(1);
}
