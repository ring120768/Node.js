/**
 * Test requireAuth middleware loading
 */

console.log('Testing requireAuth middleware loading...\n');

require('dotenv').config();

try {
  const auth = require('./src/middleware/auth');
  console.log('✅ Auth middleware loaded');
  console.log('   Exports:', Object.keys(auth));
  console.log('   requireAuth type:', typeof auth.requireAuth);
  console.log('   requireAuth value:', auth.requireAuth ? 'defined' : 'UNDEFINED');

  if (!auth.requireAuth) {
    console.log('\n❌ ERROR: requireAuth is undefined!');
    process.exit(1);
  }

  console.log('\n✅ requireAuth is properly exported\n');

} catch (error) {
  console.log('❌ Error loading auth middleware:');
  console.log('   Message:', error.message);
  console.log('   Stack:', error.stack);
  process.exit(1);
}
