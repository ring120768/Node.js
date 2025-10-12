
#!/usr/bin/env node

/**
 * Performance Comparison: Old vs New Server Structure
 * Tests startup time, memory usage, response times, and WebSocket stability
 */

const { spawn, exec } = require('child_process');
const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const TEST_RESULTS = {
  old_structure: {},
  new_structure: {},
  comparison: {}
};

/**
 * Utility functions
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kill any existing server processes
 */
async function killExistingServers() {
  return new Promise((resolve) => {
    exec('pkill -f "node.*index"', (error) => {
      // Ignore errors - process might not exist
      setTimeout(resolve, 2000); // Wait for cleanup
    });
  });
}

/**
 * Start server and measure startup time
 */
async function startServerAndMeasure(serverFile, structureName) {
  log(`Starting ${structureName} server (${serverFile})...`);
  
  const startTime = Date.now();
  let serverProcess;
  let startupTime = null;
  let memoryUsage = null;

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [serverFile], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '5000' }
    });

    let serverReady = false;
    let healthCheckInterval;

    // Capture server output
    let serverOutput = '';
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Check for server ready indicators
      if (output.includes('Server ready!') || 
          output.includes('Server running on') ||
          output.includes('listening on')) {
        if (!serverReady) {
          startupTime = Date.now() - startTime;
          serverReady = true;
          log(`${structureName} server started in ${startupTime}ms`, 'success');
          
          // Start health check polling
          healthCheckInterval = setInterval(async () => {
            try {
              const response = await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
              if (response.status === 200) {
                clearInterval(healthCheckInterval);
                
                // Get memory usage
                const memInfo = process.memoryUsage();
                memoryUsage = {
                  rss: memInfo.rss,
                  heapUsed: memInfo.heapUsed,
                  heapTotal: memInfo.heapTotal,
                  external: memInfo.external
                };
                
                resolve({
                  process: serverProcess,
                  startupTime,
                  memoryUsage,
                  serverOutput
                });
              }
            } catch (error) {
              // Server not ready yet
            }
          }, 500);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('EADDRINUSE')) {
        reject(new Error('Port already in use'));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        if (healthCheckInterval) clearInterval(healthCheckInterval);
        serverProcess.kill();
        reject(new Error(`${structureName} server failed to start within 30 seconds`));
      }
    }, 30000);

    serverProcess.on('error', (error) => {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      if (healthCheckInterval) clearInterval(healthCheckInterval);
      if (!serverReady) {
        reject(new Error(`${structureName} server exited with code ${code}`));
      }
    });
  });
}

/**
 * Test endpoint response times
 */
async function testEndpointPerformance(endpoints) {
  const results = {};
  
  for (const [name, url] of Object.entries(endpoints)) {
    log(`Testing endpoint: ${name}`);
    const times = [];
    
    // Run 5 tests per endpoint
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now();
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Performance-Test'
          }
        });
        const duration = Date.now() - start;
        
        if (response.status === 200) {
          times.push(duration);
        }
      } catch (error) {
        log(`Endpoint ${name} failed: ${error.message}`, 'warn');
      }
      
      await sleep(200); // Small delay between requests
    }
    
    if (times.length > 0) {
      results[name] = {
        average: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        min: Math.min(...times),
        max: Math.max(...times),
        successful_requests: times.length
      };
    } else {
      results[name] = {
        average: null,
        min: null,
        max: null,
        successful_requests: 0
      };
    }
  }
  
  return results;
}

/**
 * Test WebSocket connections and check for memory leaks
 */
async function testWebSocketPerformance() {
  log('Testing WebSocket performance and memory leak detection...');
  
  const results = {
    connections_created: 0,
    connections_successful: 0,
    connection_times: [],
    memory_before: null,
    memory_after: null,
    memory_leak_detected: false
  };

  // Get initial memory usage
  const initialMemory = process.memoryUsage();
  results.memory_before = initialMemory;

  const connections = [];
  const connectionPromises = [];

  // Create 10 WebSocket connections
  for (let i = 0; i < 10; i++) {
    const connectionPromise = new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(`ws://localhost:5000`);
      
      ws.on('open', () => {
        const connectionTime = Date.now() - startTime;
        results.connections_successful++;
        results.connection_times.push(connectionTime);
        connections.push(ws);
        resolve({ success: true, time: connectionTime });
      });
      
      ws.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          resolve({ success: false, error: 'Connection timeout' });
        }
      }, 5000);
    });
    
    connectionPromises.push(connectionPromise);
    results.connections_created++;
  }

  // Wait for all connection attempts
  await Promise.all(connectionPromises);
  
  // Send test messages
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', test: true }));
    }
  }

  await sleep(2000); // Let messages process

  // Close all connections
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  await sleep(3000); // Wait for cleanup

  // Check final memory usage
  const finalMemory = process.memoryUsage();
  results.memory_after = finalMemory;
  
  // Detect potential memory leak (simple heuristic)
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  results.memory_leak_detected = memoryIncrease > (5 * 1024 * 1024); // 5MB threshold

  return results;
}

/**
 * Run comprehensive performance test
 */
async function runPerformanceTest(serverFile, structureName) {
  log(`\n🚀 Testing ${structureName} performance...`);
  
  try {
    // Start server and measure startup
    const serverInfo = await startServerAndMeasure(serverFile, structureName);
    
    // Wait for server to stabilize
    await sleep(3000);
    
    // Test endpoint performance
    const endpoints = {
      health: `${BASE_URL}/health`,
      config: `${BASE_URL}/api/config`,
      auth_status: `${BASE_URL}/api/auth/session`
    };
    
    const endpointResults = await testEndpointPerformance(endpoints);
    
    // Test WebSocket performance
    const websocketResults = await testWebSocketPerformance();
    
    // Compile results
    const results = {
      startup_time_ms: serverInfo.startupTime,
      memory_usage: {
        rss_mb: Math.round(serverInfo.memoryUsage.rss / 1024 / 1024),
        heap_used_mb: Math.round(serverInfo.memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(serverInfo.memoryUsage.heapTotal / 1024 / 1024)
      },
      endpoint_performance: endpointResults,
      websocket_performance: websocketResults,
      server_output_lines: serverInfo.serverOutput.split('\n').length
    };
    
    // Stop server
    serverInfo.process.kill();
    await sleep(2000);
    
    return results;
    
  } catch (error) {
    log(`Error testing ${structureName}: ${error.message}`, 'error');
    return {
      error: error.message,
      startup_time_ms: null,
      memory_usage: null,
      endpoint_performance: null,
      websocket_performance: null
    };
  }
}

/**
 * Generate comparison analysis
 */
function generateComparison(oldResults, newResults) {
  const comparison = {
    startup_improvement: null,
    memory_improvement: null,
    endpoint_improvement: {},
    websocket_improvement: null,
    overall_score: null
  };

  // Startup time comparison
  if (oldResults.startup_time_ms && newResults.startup_time_ms) {
    const improvement = oldResults.startup_time_ms - newResults.startup_time_ms;
    comparison.startup_improvement = {
      old_ms: oldResults.startup_time_ms,
      new_ms: newResults.startup_time_ms,
      improvement_ms: improvement,
      improvement_percent: Math.round((improvement / oldResults.startup_time_ms) * 100)
    };
  }

  // Memory usage comparison
  if (oldResults.memory_usage && newResults.memory_usage) {
    const oldMemory = oldResults.memory_usage.heap_used_mb;
    const newMemory = newResults.memory_usage.heap_used_mb;
    const improvement = oldMemory - newMemory;
    
    comparison.memory_improvement = {
      old_mb: oldMemory,
      new_mb: newMemory,
      improvement_mb: improvement,
      improvement_percent: Math.round((improvement / oldMemory) * 100)
    };
  }

  // Endpoint performance comparison
  if (oldResults.endpoint_performance && newResults.endpoint_performance) {
    for (const endpoint in oldResults.endpoint_performance) {
      const oldAvg = oldResults.endpoint_performance[endpoint]?.average;
      const newAvg = newResults.endpoint_performance[endpoint]?.average;
      
      if (oldAvg && newAvg) {
        const improvement = oldAvg - newAvg;
        comparison.endpoint_improvement[endpoint] = {
          old_ms: oldAvg,
          new_ms: newAvg,
          improvement_ms: improvement,
          improvement_percent: Math.round((improvement / oldAvg) * 100)
        };
      }
    }
  }

  // WebSocket performance comparison
  if (oldResults.websocket_performance && newResults.websocket_performance) {
    const oldConnections = oldResults.websocket_performance.connections_successful;
    const newConnections = newResults.websocket_performance.connections_successful;
    const oldLeaks = oldResults.websocket_performance.memory_leak_detected;
    const newLeaks = newResults.websocket_performance.memory_leak_detected;
    
    comparison.websocket_improvement = {
      old_successful_connections: oldConnections,
      new_successful_connections: newConnections,
      connection_improvement: newConnections - oldConnections,
      old_memory_leaks: oldLeaks,
      new_memory_leaks: newLeaks,
      memory_leak_fixed: oldLeaks && !newLeaks
    };
  }

  // Calculate overall score (simple heuristic)
  let score = 0;
  let factors = 0;
  
  if (comparison.startup_improvement?.improvement_percent) {
    score += Math.max(-50, Math.min(50, comparison.startup_improvement.improvement_percent));
    factors++;
  }
  
  if (comparison.memory_improvement?.improvement_percent) {
    score += Math.max(-50, Math.min(50, comparison.memory_improvement.improvement_percent));
    factors++;
  }
  
  if (comparison.websocket_improvement?.memory_leak_fixed) {
    score += 25;
    factors++;
  }
  
  comparison.overall_score = factors > 0 ? Math.round(score / factors) : 0;
  
  return comparison;
}

/**
 * Update migration log with results
 */
async function updateMigrationLog(results) {
  const logPath = path.join(__dirname, 'MIGRATION_LOG.md');
  
  const performanceSection = `
## Performance Comparison Results - ${new Date().toISOString()}

### 🚀 Startup Performance
${results.comparison.startup_improvement ? `
- **Old Structure:** ${results.comparison.startup_improvement.old_ms}ms
- **New Structure:** ${results.comparison.startup_improvement.new_ms}ms
- **Improvement:** ${results.comparison.startup_improvement.improvement_ms}ms (${results.comparison.startup_improvement.improvement_percent}%)
` : '- **Status:** Could not compare startup times'}

### 💾 Memory Usage
${results.comparison.memory_improvement ? `
- **Old Structure:** ${results.comparison.memory_improvement.old_mb}MB heap
- **New Structure:** ${results.comparison.memory_improvement.new_mb}MB heap
- **Improvement:** ${results.comparison.memory_improvement.improvement_mb}MB (${results.comparison.memory_improvement.improvement_percent}%)
` : '- **Status:** Could not compare memory usage'}

### 🌐 Endpoint Performance
${Object.entries(results.comparison.endpoint_improvement).map(([endpoint, data]) => 
  `- **${endpoint}:** ${data.old_ms}ms → ${data.new_ms}ms (${data.improvement_percent}% improvement)`
).join('\n') || '- **Status:** Could not compare endpoint performance'}

### 🔌 WebSocket Performance
${results.comparison.websocket_improvement ? `
- **Connection Success Rate:** Old: ${results.comparison.websocket_improvement.old_successful_connections}/10, New: ${results.comparison.websocket_improvement.new_successful_connections}/10
- **Memory Leak Detection:** Old: ${results.comparison.websocket_improvement.old_memory_leaks ? '❌ Detected' : '✅ None'}, New: ${results.comparison.websocket_improvement.new_memory_leaks ? '❌ Detected' : '✅ None'}
${results.comparison.websocket_improvement.memory_leak_fixed ? '- **Memory Leak Status:** ✅ Fixed in new structure' : ''}
` : '- **Status:** Could not compare WebSocket performance'}

### 📊 Overall Performance Score
**Score:** ${results.comparison.overall_score}/100
${results.comparison.overall_score > 20 ? '✅ **Significant improvement**' : 
  results.comparison.overall_score > 0 ? '🔄 **Moderate improvement**' : 
  results.comparison.overall_score === 0 ? '➡️ **No significant change**' : 
  '⚠️ **Performance regression detected**'}

### 🔍 Detailed Results

#### Old Structure (index.js)
\`\`\`json
${JSON.stringify(results.old_structure, null, 2)}
\`\`\`

#### New Structure (index.new.js)
\`\`\`json
${JSON.stringify(results.new_structure, null, 2)}
\`\`\`

---

`;

  try {
    const currentLog = await fs.readFile(logPath, 'utf8');
    const updatedLog = currentLog + performanceSection;
    await fs.writeFile(logPath, updatedLog);
    log('Migration log updated with performance results', 'success');
  } catch (error) {
    log(`Failed to update migration log: ${error.message}`, 'error');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n========================================');
  console.log('🔬 PERFORMANCE COMPARISON ANALYSIS');
  console.log('========================================\n');

  try {
    // Kill any existing servers
    await killExistingServers();

    // Test old structure
    log('Phase 1: Testing old server structure (index.js)');
    TEST_RESULTS.old_structure = await runPerformanceTest('index.js', 'Old Structure');
    
    // Wait between tests
    await sleep(5000);
    await killExistingServers();

    // Test new structure
    log('\nPhase 2: Testing new server structure (index.new.js)');
    TEST_RESULTS.new_structure = await runPerformanceTest('index.new.js', 'New Structure');

    // Generate comparison
    log('\nPhase 3: Analyzing results...');
    TEST_RESULTS.comparison = generateComparison(TEST_RESULTS.old_structure, TEST_RESULTS.new_structure);

    // Save results
    await fs.writeFile('performance-results.json', JSON.stringify(TEST_RESULTS, null, 2));
    
    // Update migration log
    await updateMigrationLog(TEST_RESULTS);

    // Display summary
    console.log('\n========================================');
    console.log('📊 PERFORMANCE COMPARISON SUMMARY');
    console.log('========================================');
    
    if (TEST_RESULTS.comparison.startup_improvement) {
      console.log(`🚀 Startup: ${TEST_RESULTS.comparison.startup_improvement.improvement_percent}% improvement`);
    }
    
    if (TEST_RESULTS.comparison.memory_improvement) {
      console.log(`💾 Memory: ${TEST_RESULTS.comparison.memory_improvement.improvement_percent}% improvement`);
    }
    
    console.log(`📈 Overall Score: ${TEST_RESULTS.comparison.overall_score}/100`);
    console.log('\n✅ Performance analysis complete!');
    console.log('📄 Detailed results saved to MIGRATION_LOG.md');

  } catch (error) {
    log(`Performance comparison failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
