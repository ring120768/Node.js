#!/usr/bin/env node
/**
 * Test if Replit has the transcription fix deployed
 * Checks the transcription.controller.js code on Replit
 */

const https = require('https');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

console.log(colors.cyan, '\n🧪 Testing Replit Transcription Endpoint\n');

// Test 1: Check if server is running
console.log('1. Checking if Replit server is running...');
https.get('https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev/healthz', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const health = JSON.parse(data);
    console.log(colors.green, `✅ Server running (uptime: ${Math.floor(health.uptime)}s)`);
    console.log(colors.yellow, `   Commit: ${health.commit}`);
    console.log(colors.yellow, `   Version: ${health.version}`);
    console.log(colors.reset);

    // Test 2: Check what the transcription code looks like
    console.log('2. Checking deployed code version...');
    console.log(colors.yellow, '\n⚠️  Cannot directly check deployed code remotely.');
    console.log(colors.yellow, '   Please check Replit console for these log messages:');
    console.log(colors.reset);
    console.log('   - "Sending to OpenAI Whisper..."');
    console.log('   - "Stream created, calling OpenAI API..."');
    console.log('   - "OpenAI API error:" (with detailed error info)');
    console.log(colors.reset);

    // Test 3: Suggest checking git commit
    console.log('\n3. To verify fix is deployed, run in Replit shell:');
    console.log(colors.cyan, '   git log -1 --oneline');
    console.log(colors.reset);
    console.log('   Should show: 75ccd84 fix: Convert audio buffer to stream for OpenAI Whisper API');
    console.log(colors.reset);

    console.log('\n4. Check if file was updated:');
    console.log(colors.cyan, '   grep -n "Readable.from" src/controllers/transcription.controller.js');
    console.log(colors.reset);
    console.log('   Should show line 92: const audioStream = Readable.from(req.file.buffer);');
    console.log(colors.reset, '\n');
  });
}).on('error', (err) => {
  console.log(colors.red, `❌ Error: ${err.message}`);
  console.log(colors.reset);
});
