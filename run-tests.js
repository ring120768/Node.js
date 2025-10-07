
#!/usr/bin/env node

/**
 * Test Runner for Car Crash Lawyer AI
 * Runs comprehensive tests and updates migration log
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

async function updateMigrationLog(testResults) {
  const logPath = path.join(__dirname, 'MIGRATION_LOG.md');
  
  const testSection = `
## Comprehensive Test Results - ${new Date().toISOString()}

### Test Summary
- **Total Tests:** ${testResults.summary.total}
- **Passed:** ${testResults.summary.passed} ✅
- **Failed:** ${testResults.summary.failed} ❌
- **Success Rate:** ${testResults.summary.successRate}

### Service Status
${Object.entries(testResults.details).map(([test, result]) => 
  `- **${test}:** ${result.passed ? '✅ PASS' : '❌ FAIL'}${result.details ? ` (${result.details})` : ''}`
).join('\n')}

${testResults.errors.length > 0 ? `
### Failed Tests
${testResults.errors.map(error => `- **${error.test}:** ${error.error}`).join('\n')}
` : '### ✅ All Tests Passed'}

---

`;

  try {
    const currentLog = await fs.readFile(logPath, 'utf8');
    const updatedLog = currentLog + testSection;
    await fs.writeFile(logPath, updatedLog);
    console.log('✅ Migration log updated with test results');
  } catch (error) {
    console.error('❌ Failed to update migration log:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive test suite...');

  return new Promise((resolve, reject) => {
    const testProcess = spawn('node', ['test-comprehensive.js'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        BASE_URL: 'http://0.0.0.0:5000'
      }
    });

    testProcess.on('close', async (code) => {
      try {
        // Read test results
        const resultsPath = path.join(__dirname, 'test-results.json');
        const results = JSON.parse(await fs.readFile(resultsPath, 'utf8'));
        
        await updateMigrationLog(results);
        
        if (code === 0) {
          console.log('✅ All tests passed successfully!');
          resolve(results);
        } else {
          console.log(`❌ Tests failed with code ${code}`);
          resolve(results);
        }
      } catch (error) {
        console.error('Failed to process test results:', error.message);
        reject(error);
      }
    });

    testProcess.on('error', (error) => {
      console.error('Failed to start test process:', error.message);
      reject(error);
    });
  });
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
