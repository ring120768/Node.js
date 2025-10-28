#!/usr/bin/env node

/**
 * WebSocket System Test Script
 * Tests the real-time notification system end-to-end
 *
 * Usage:
 * node test-websocket-system.js [user-id]
 *
 * If no user-id provided, uses a test UUID
 */

const WebSocket = require('ws');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m'
};

const TEST_USER_ID = process.argv[2] || 'test-user-' + Date.now();
const WS_URL = process.env.WS_URL || 'ws://localhost:5000';

let messageCount = 0;
let connectionTime = null;

console.log(colors.cyan, '\n🧪 WebSocket Real-Time Notifications Test\n');
console.log(colors.gray, `WebSocket URL: ${WS_URL}`);
console.log(colors.gray, `User ID: ${TEST_USER_ID}\n`);

/**
 * Test WebSocket connection and message handling
 */
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout after 10 seconds'));
      ws.close();
    }, 10000);

    ws.on('open', () => {
      clearTimeout(timeout);
      connectionTime = Date.now();

      console.log(colors.green, '✅ Step 1: Connected to WebSocket server');
      console.log(colors.gray, `   Connection established in ${Date.now() - connectionTime}ms\n`);

      // Subscribe to user updates
      console.log(colors.cyan, '📡 Step 2: Subscribing to user updates...');
      ws.send(JSON.stringify({
        type: 'subscribe',
        userId: TEST_USER_ID
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messageCount++;

        console.log(colors.green, `\n📨 Message ${messageCount}: ${message.type}`);
        console.log(colors.gray, JSON.stringify(message, null, 2));

        // Track specific message types
        switch (message.type) {
          case 'subscribed':
            console.log(colors.green, '   ✅ Subscription confirmed!');
            console.log(colors.yellow, '\n⚠️  Waiting for real-time updates...');
            console.log(colors.gray, '   Trigger an image upload or PDF generation to see notifications');
            console.log(colors.gray, '   Press Ctrl+C to exit\n');
            break;

          case 'image_processed':
            console.log(colors.green, `   ✅ Image processed: ${message.documentType}`);
            if (message.signedUrl) {
              console.log(colors.gray, `   URL: ${message.signedUrl.substring(0, 80)}...`);
            }
            break;

          case 'pdf_generated':
            console.log(colors.green, `   ✅ PDF generated!`);
            if (message.pdfUrl) {
              console.log(colors.gray, `   URL: ${message.pdfUrl.substring(0, 80)}...`);
            }
            break;

          case 'transcription_complete':
            console.log(colors.green, `   ✅ Transcription complete!`);
            break;

          case 'image_processing_failed':
          case 'pdf_generation_failed':
          case 'transcription_failed':
            console.log(colors.red, `   ❌ Operation failed: ${message.error || 'Unknown error'}`);
            break;

          case 'pong':
            console.log(colors.gray, '   💓 Heartbeat acknowledged');
            break;

          case 'error':
            console.log(colors.red, `   ❌ Server error: ${message.message}`);
            break;
        }

      } catch (error) {
        console.error(colors.red, '❌ Error parsing message:', error.message);
        console.log(colors.gray, 'Raw data:', data.toString());
      }
    });

    ws.on('error', (error) => {
      console.error(colors.red, '\n❌ WebSocket error:', error.message);
      reject(error);
    });

    ws.on('close', (code, reason) => {
      console.log(colors.yellow, `\n🔌 Connection closed`);
      console.log(colors.gray, `   Code: ${code}`);
      console.log(colors.gray, `   Reason: ${reason || 'No reason provided'}`);
      console.log(colors.gray, `   Messages received: ${messageCount}`);
      console.log(colors.gray, `   Connection duration: ${Math.floor((Date.now() - connectionTime) / 1000)}s\n`);
      resolve();
    });

    // Test heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log(colors.gray, '💓 Sending heartbeat...');
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log(colors.yellow, '\n\n👋 Shutting down...');
      clearInterval(heartbeatInterval);
      ws.close(1000, 'Client disconnect');
    });

    process.on('SIGTERM', () => {
      clearInterval(heartbeatInterval);
      ws.close(1000, 'Client disconnect');
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testWebSocketConnection();
    console.log(colors.green, '\n✅ All tests completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error(colors.red, '\n❌ Test failed:', error.message);
    console.error(colors.gray, error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
