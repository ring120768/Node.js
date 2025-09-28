
// Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Disable logging during tests
process.env.LOG_LEVEL = 'error';
