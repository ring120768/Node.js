
#!/usr/bin/env node

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
  // Start the new modular server
  require('./index.new.js');
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('💡 Trying fallback to original server...');
  
  try {
    require('./index.js');
  } catch (fallbackError) {
    console.error('❌ Fallback server also failed:', fallbackError.message);
    process.exit(1);
  }
}
