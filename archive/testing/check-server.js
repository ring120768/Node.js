
#!/usr/bin/env node

/**
 * Simple Server Health Check
 * Verifies the server is running and responding
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function checkServer() {
  console.log(`🔍 Checking server health at ${BASE_URL}...`);

  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    
    console.log('✅ Server is responding');
    console.log(`📊 Status: ${response.status}`);
    
    if (response.data.services) {
      console.log('🔧 Services:');
      Object.entries(response.data.services).forEach(([service, status]) => {
        const emoji = status === true || (typeof status === 'number' && status >= 0) ? '✅' : '❌';
        console.log(`   ${emoji} ${service}: ${status}`);
      });
    }

    return true;
  } catch (error) {
    console.log('❌ Server health check failed');
    console.log(`Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running on the correct port');
    }
    return false;
  }
}

if (require.main === module) {
  checkServer().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkServer };
