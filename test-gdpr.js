
const GDPRService = require('./services/gdprService');

// Test that the service can be instantiated
console.log('Testing GDPR Service...');
console.log('✓ GDPRService loaded successfully');
console.log('Available methods:', Object.getOwnPropertyNames(GDPRService.prototype));

// Verify all required methods exist
const requiredMethods = [
  'hasValidConsent',
  'recordConsent', 
  'exportUserData',
  'deleteUserData',
  'deleteUserFiles',
  'logAction',
  'getUserGDPRHistory'
];

requiredMethods.forEach(method => {
  if (typeof GDPRService.prototype[method] === 'function') {
    console.log(`✓ ${method} is defined`);
  } else {
    console.log(`✗ ${method} is missing!`);
  }
});

console.log('\nGDPR Service verification complete!');
