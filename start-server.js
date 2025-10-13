
/**
 * Server Startup Script
 * Ensures proper server initialization with error handling
 */

const path = require('path');
const fs = require('fs');

// Check for required files
const requiredFiles = [
  'src/app.js',
  'src/config/index.js',
  'src/utils/logger.js'
];

console.log('🔍 Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(__dirname, file))) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}
console.log('✅ All required files present');

// Load environment
require('dotenv').config();

// Set default port if not specified
if (!process.env.PORT) {
  process.env.PORT = '5000';
}

console.log('🚀 Starting Car Crash Lawyer AI Server...');
console.log(`📍 Port: ${process.env.PORT}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

try {
  require('./index.new.js');
} catch (e) {
  console.warn('Falling back to legacy index.js (modular entry not found).');
  require('./index.js');
}
