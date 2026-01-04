#!/usr/bin/env node
/**
 * Test PDF Health Check Endpoint
 * Usage: node test-pdf-health.js [optional-api-key]
 */

require('dotenv').config();

const RAILWAY_URL = 'https://car-crash-lawyer-ai-production.up.railway.app';
const API_KEY = process.argv[2] ||
                process.env.WEBHOOK_API_KEY ||
                process.env.TYPEFORM_X_API_KEY ||
                process.env.ZAPIER_SHARED_KEY;

async function testPdfHealth() {
  console.log('\n=== PDF PIPELINE HEALTH CHECK ===\n');

  if (!API_KEY) {
    console.log('❌ No API key found!');
    console.log('   Set WEBHOOK_API_KEY, TYPEFORM_X_API_KEY, or ZAPIER_SHARED_KEY in .env');
    console.log('   Or pass it as: node test-pdf-health.js YOUR_API_KEY\n');
    process.exit(1);
  }

  console.log(`Target: ${RAILWAY_URL}/api/debug/pdf-health`);
  console.log(`API Key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  try {
    const response = await fetch(`${RAILWAY_URL}/api/debug/pdf-health`, {
      method: 'GET',
      headers: {
        'X-Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log(`Overall Status: ${data.overall === 'HEALTHY' ? '✅ HEALTHY' : '⚠️  ' + data.overall}`);
    console.log(`Environment: ${data.environment}`);
    console.log(`Timestamp: ${data.timestamp}\n`);

    if (data.summary) {
      console.log(`Summary: ${data.summary.passed}/${data.summary.total} checks passed (${data.summary.percentage})\n`);
    }

    console.log('Component Results:');
    console.log('─'.repeat(50));

    for (const [name, result] of Object.entries(data.components || {})) {
      const statusIcon = result.status === 'PASS' ? '✅' :
                        result.status === 'WARN' ? '⚠️ ' : '❌';
      console.log(`${statusIcon} ${name}: ${result.status}`);

      if (result.message) {
        console.log(`   ${result.message}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.counts) {
        console.log(`   Queue: ${JSON.stringify(result.counts)}`);
      }
      if (result.warning) {
        console.log(`   Warning: ${result.warning}`);
      }
      if (result.action_required) {
        console.log(`   ACTION: ${result.action_required}`);
      }
    }

    console.log('─'.repeat(50));

    // Return exit code based on health status
    if (data.overall === 'HEALTHY') {
      console.log('\n✅ All PDF pipeline components are healthy!\n');
      console.log('You can proceed with a manual test submission.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some issues detected - review the results above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Failed to reach health endpoint:', error.message);

    if (error.message.includes('401')) {
      console.log('\n   Check that your API key is correct.');
    } else if (error.message.includes('404')) {
      console.log('\n   The pdf-health endpoint may not be deployed yet.');
      console.log('   Wait for Railway deployment to complete.');
    }

    process.exit(1);
  }
}

testPdfHealth();
