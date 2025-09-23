#!/usr/bin/env node
/**
 * Integration Verification Script
 * Checks if the module integration was successful without making changes
 * 
 * Usage: node verifyIntegration.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

class IntegrationVerifier {
  constructor() {
    this.checks = {
      files: { passed: 0, failed: 0, tests: [] },
      code: { passed: 0, failed: 0, tests: [] },
      server: { passed: 0, failed: 0, tests: [] },
      endpoints: { passed: 0, failed: 0, tests: [] }
    };
    this.serverProcess = null;
    this.serverPort = process.env.PORT || 3000;
    this.apiKey = process.env.ZAPIER_SHARED_KEY || process.env.WEBHOOK_API_KEY || 'test-key';
  }

  // Check 1: Verify all required files exist
  checkFiles() {
    logSection('1. Checking Required Files');

    const requiredFiles = [
      { name: 'index.js', type: 'main' },
      { name: 'constants.js', type: 'module' },
      { name: 'consentManager.js', type: 'module' },
      { name: 'webhookDebugger.js', type: 'module' },
      { name: 'testModules.js', type: 'test' },
      { name: '.env', type: 'config', optional: true }
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file.name);
      const exists = fs.existsSync(filePath);

      if (exists) {
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        log(`✅ ${file.name} (${size} KB)`, 'green');
        this.checks.files.passed++;
        this.checks.files.tests.push({
          name: file.name,
          passed: true,
          size: size
        });
      } else if (file.optional) {
        log(`⚠️  ${file.name} (optional - not found)`, 'yellow');
        this.checks.files.tests.push({
          name: file.name,
          passed: true,
          optional: true
        });
      } else {
        log(`❌ ${file.name} - NOT FOUND`, 'red');
        this.checks.files.failed++;
        this.checks.files.tests.push({
          name: file.name,
          passed: false
        });
      }
    });

    // Check for backup files
    const backupFiles = fs.readdirSync(process.cwd())
      .filter(f => f.startsWith('index.backup'));

    if (backupFiles.length > 0) {
      log(`\n📦 Found ${backupFiles.length} backup file(s):`, 'blue');
      backupFiles.forEach(f => log(`   - ${f}`, 'blue'));
    }
  }

  // Check 2: Verify code integration
  checkCodeIntegration() {
    logSection('2. Checking Code Integration');

    const indexPath = path.join(process.cwd(), 'index.js');
    if (!fs.existsSync(indexPath)) {
      log('❌ index.js not found - cannot check integration', 'red');
      return;
    }

    const content = fs.readFileSync(indexPath, 'utf8');

    const codeChecks = [
      {
        name: 'Enhanced Constants Import',
        pattern: /const\s*{\s*CONSTANTS:\s*ENHANCED_CONSTANTS/,
        critical: true
      },
      {
        name: 'ConsentManager Import',
        pattern: /const\s+ConsentManager\s*=\s*require/,
        critical: true
      },
      {
        name: 'WebhookDebugger Import',
        pattern: /const\s+WebhookDebugger\s*=\s*require/,
        critical: true
      },
      {
        name: 'Constants Replacement',
        pattern: /const\s+CONSTANTS\s*=\s*ENHANCED_CONSTANTS/,
        critical: false
      },
      {
        name: 'ConsentManager Initialization',
        pattern: /consentManager\s*=\s*new\s+ConsentManager/,
        critical: false
      },
      {
        name: 'WebhookDebugger Initialization',
        pattern: /webhookDebugger\s*=\s*new\s+WebhookDebugger/,
        critical: false
      },
      {
        name: 'Module Success Logs',
        pattern: /Logger\.success.*Consent Manager initialized/,
        critical: false
      }
    ];

    codeChecks.forEach(check => {
      const found = check.pattern.test(content);

      if (found) {
        log(`✅ ${check.name}`, 'green');
        this.checks.code.passed++;
        this.checks.code.tests.push({
          name: check.name,
          passed: true,
          critical: check.critical
        });
      } else {
        if (check.critical) {
          log(`❌ ${check.name} - MISSING (Critical)`, 'red');
          this.checks.code.failed++;
        } else {
          log(`⚠️  ${check.name} - Not found (Optional)`, 'yellow');
        }
        this.checks.code.tests.push({
          name: check.name,
          passed: false,
          critical: check.critical
        });
      }
    });

    // Check for potential conflicts
    const oldConstantsPattern = /const\s+CONSTANTS\s*=\s*{[\s\S]*?TRANSCRIPTION_STATUS/;
    if (oldConstantsPattern.test(content)) {
      log('\n⚠️  Warning: Old CONSTANTS object might still be present', 'yellow');
    }
  }

  // Check 3: Test server startup
  async checkServerStartup() {
    logSection('3. Testing Server Startup');

    return new Promise((resolve) => {
      log('🚀 Attempting to start server...', 'cyan');

      // Set environment to avoid conflicts
      const env = { ...process.env, PORT: this.serverPort };

      // Start the server
      this.serverProcess = spawn('node', ['index.js'], {
        env: env,
        cwd: process.cwd()
      });

      let startupOutput = '';
      let hasError = false;
      let serverStarted = false;

      // Timeout for server startup
      const timeout = setTimeout(() => {
        if (!serverStarted) {
          log('⚠️  Server startup timeout (10 seconds)', 'yellow');
          this.killServer();
          resolve();
        }
      }, 10000);

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;

        // Check for success indicators
        if (output.includes('Server running on port')) {
          serverStarted = true;
          clearTimeout(timeout);
          log('✅ Server started successfully', 'green');
          this.checks.server.passed++;
        }

        // Check for module initialization
        if (output.includes('Consent Manager initialized')) {
          log('✅ Consent Manager initialized', 'green');
          this.checks.server.passed++;
        }
        if (output.includes('Webhook Debugger initialized')) {
          log('✅ Webhook Debugger initialized', 'green');
          this.checks.server.passed++;
        }

        // If we see the success message, test is complete
        if (output.includes('All systems operational')) {
          setTimeout(() => {
            this.testEndpoints().then(() => {
              this.killServer();
              resolve();
            });
          }, 2000); // Wait 2 seconds for server to be fully ready
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        hasError = true;

        // Check for common errors
        if (error.includes('Cannot find module')) {
          const moduleMatch = error.match(/Cannot find module '(.+?)'/);
          if (moduleMatch) {
            log(`❌ Missing module: ${moduleMatch[1]}`, 'red');
            this.checks.server.failed++;
          }
        } else if (error.includes('SyntaxError')) {
          log('❌ Syntax error in code', 'red');
          log(error.substring(0, 200), 'red');
          this.checks.server.failed++;
        } else {
          log(`❌ Server error: ${error.substring(0, 200)}`, 'red');
          this.checks.server.failed++;
        }

        clearTimeout(timeout);
        this.killServer();
        resolve();
      });

      this.serverProcess.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          log(`❌ Server exited with code ${code}`, 'red');
          this.checks.server.failed++;
        }
        resolve();
      });
    });
  }

  // Check 4: Test endpoints
  async testEndpoints() {
    logSection('4. Testing Endpoints');

    const endpoints = [
      {
        name: 'Health Check',
        method: 'GET',
        path: '/health',
        requiresAuth: false
      },
      {
        name: 'Enhanced Webhook Debug',
        method: 'POST',
        path: '/api/debug/webhook-test',
        requiresAuth: true,
        body: { test: 'data', create_user_id: 'test123' }
      },
      {
        name: 'Webhook History',
        method: 'GET',
        path: '/api/debug/webhook-history',
        requiresAuth: true
      },
      {
        name: 'Consent Test Extraction',
        method: 'POST',
        path: '/api/consent/test-extraction',
        requiresAuth: true,
        body: { legal_support: 'Yes', gdpr_consent: true }
      }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
  }

  // Test individual endpoint
  testEndpoint(endpoint) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: this.serverPort,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      };

      if (endpoint.requiresAuth) {
        options.headers['X-Api-Key'] = this.apiKey;
      }

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            log(`✅ ${endpoint.name} (${res.statusCode})`, 'green');
            this.checks.endpoints.passed++;

            // Check for enhanced features in response
            try {
              const json = JSON.parse(data);
              if (endpoint.path.includes('webhook-test') && json.analysis) {
                log(`   ✓ Enhanced webhook analysis present`, 'green');
              }
              if (endpoint.path.includes('consent') && json.extraction) {
                log(`   ✓ Consent extraction working`, 'green');
              }
            } catch (e) {
              // Not JSON, that's okay
            }
          } else if (res.statusCode === 503 && endpoint.path.includes('consent')) {
            log(`⚠️  ${endpoint.name} (503) - Module not initialized`, 'yellow');
          } else {
            log(`❌ ${endpoint.name} (${res.statusCode})`, 'red');
            this.checks.endpoints.failed++;
          }
          resolve();
        });
      });

      req.on('error', (error) => {
        log(`❌ ${endpoint.name} - ${error.message}`, 'red');
        this.checks.endpoints.failed++;
        resolve();
      });

      req.on('timeout', () => {
        log(`⚠️  ${endpoint.name} - Timeout`, 'yellow');
        req.destroy();
        resolve();
      });

      if (endpoint.body) {
        req.write(JSON.stringify(endpoint.body));
      }

      req.end();
    });
  }

  // Kill the server process
  killServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  // Generate summary report
  generateReport() {
    logSection('Verification Summary');

    const categories = ['files', 'code', 'server', 'endpoints'];
    let totalPassed = 0;
    let totalFailed = 0;

    categories.forEach(category => {
      const check = this.checks[category];
      totalPassed += check.passed;
      totalFailed += check.failed;

      const status = check.failed === 0 ? '✅' : check.passed > 0 ? '⚠️' : '❌';
      log(`${status} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${check.passed} passed, ${check.failed} failed`);
    });

    log('\n' + '─'.repeat(50));
    log(`Total: ${totalPassed} passed, ${totalFailed} failed`, totalFailed > 0 ? 'yellow' : 'green');

    // Integration status
    logSection('Integration Status');

    const hasModuleFiles = this.checks.files.tests.filter(t => t.name.includes('.js') && !t.optional).every(t => t.passed);
    const hasImports = this.checks.code.tests.filter(t => t.critical).some(t => t.passed);
    const serverRuns = this.checks.server.passed > 0;

    if (hasModuleFiles && hasImports && serverRuns) {
      log('🎉 Integration appears SUCCESSFUL!', 'green');
      log('\nThe enhanced modules are integrated and working.', 'green');
    } else if (hasModuleFiles && hasImports) {
      log('⚠️  Partial Integration Detected', 'yellow');
      log('\nModules are integrated but may not be fully initialized.', 'yellow');
      log('This is okay if Supabase is not configured.', 'yellow');
    } else if (hasModuleFiles) {
      log('📦 Module Files Present - Integration Pending', 'blue');
      log('\nModule files are present but not yet integrated into index.js', 'blue');
      log('Run the migration script: node migrate.js', 'blue');
    } else {
      log('❌ Integration Not Complete', 'red');
      log('\nPlease ensure all module files are present and run the migration.', 'red');
    }

    // Recommendations
    if (totalFailed > 0) {
      logSection('Recommendations');

      if (this.checks.files.failed > 0) {
        log('1. Ensure all module files are in the same directory as index.js', 'yellow');
      }
      if (this.checks.code.failed > 0) {
        log('2. Run the migration script: node migrate.js', 'yellow');
      }
      if (this.checks.server.failed > 0) {
        log('3. Check server logs for specific errors', 'yellow');
      }
      if (this.checks.endpoints.failed > 0) {
        log('4. Verify API key is set in .env file', 'yellow');
      }
    }
  }

  // Main verification function
  async verify() {
    log('\n' + '='.repeat(50), 'cyan');
    log('Car Crash Lawyer AI - Integration Verification', 'cyan');
    log('='.repeat(50), 'cyan');

    // Run all checks
    this.checkFiles();
    this.checkCodeIntegration();

    // Only test server if files and basic integration exist
    const hasBasicIntegration = this.checks.files.passed > 0 && this.checks.code.passed > 0;
    if (hasBasicIntegration) {
      await this.checkServerStartup();
    } else {
      log('\n⚠️  Skipping server test - basic integration not found', 'yellow');
    }

    // Generate report
    this.generateReport();

    // Ensure server is stopped
    this.killServer();
  }
}

// Run verification
async function main() {
  const verifier = new IntegrationVerifier();

  try {
    await verifier.verify();
  } catch (error) {
    log(`\n❌ Verification error: ${error.message}`, 'red');
    verifier.killServer();
  }

  process.exit(0);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  log('\n\nInterrupted - cleaning up...', 'yellow');
  process.exit(0);
});

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = IntegrationVerifier;