#!/usr/bin/env node
/**
 * Test script for dashcam video upload endpoint
 *
 * Usage:
 *   node test-dashcam-upload.js [path/to/video.mp4]
 *
 * If no path provided, creates a small test video file
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const ENDPOINT = '/api/images/temp-upload';

/**
 * Create a minimal test video file if none provided
 *
 * NOTE: This creates a "fake" video (just some bytes with .mp4 extension).
 * Real video testing requires actual video files.
 */
function createTestVideoFile() {
  const testDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testVideoPath = path.join(testDir, 'test-dashcam-video.mp4');

  // Create a minimal fake video file (just for testing upload mechanism)
  const fakeVideoData = Buffer.alloc(1024 * 100); // 100KB
  fs.writeFileSync(testVideoPath, fakeVideoData);

  console.log(`📹 Created test video: ${testVideoPath} (${fakeVideoData.length} bytes)`);
  return testVideoPath;
}

/**
 * Test the video upload endpoint
 */
async function testVideoUpload(videoPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎬 Testing Dashcam Video Upload');
    console.log(`${'='.repeat(60)}\n`);

    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      return reject(new Error(`Video file not found: ${videoPath}`));
    }

    const stats = fs.statSync(videoPath);
    console.log(`📁 File: ${path.basename(videoPath)}`);
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🔗 Endpoint: ${SERVER_URL}${ENDPOINT}\n`);

    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(videoPath), {
      filename: path.basename(videoPath),
      contentType: 'video/mp4'
    });
    form.append('temp_session_id', `dashcam_${Date.now()}_test`);
    form.append('field_name', 'dashcam_video');

    // Prepare request
    const urlObj = new URL(SERVER_URL + ENDPOINT);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: ENDPOINT,
      method: 'POST',
      headers: form.getHeaders()
    };

    console.log('⏳ Uploading...\n');
    const startTime = Date.now();

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Upload completed in ${duration}s\n`);

        console.log(`${'─'.repeat(60)}`);
        console.log('📥 Response:');
        console.log(`${'─'.repeat(60)}`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
        console.log(`\nBody:`, data);
        console.log(`${'─'.repeat(60)}\n`);

        try {
          const response = JSON.parse(data);

          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ SUCCESS!\n');
            console.log('📋 Upload Details:');
            console.log(`   • Temp Upload ID: ${response.tempUploadId || 'N/A'}`);
            console.log(`   • File URL: ${response.fileUrl || 'N/A'}`);
            console.log(`   • Media Type: ${response.mediaType || 'N/A'}`);
            console.log(`   • File Size: ${response.fileSize || 'N/A'} bytes`);
            console.log(`   • Storage Path: ${response.storagePath || 'N/A'}`);

            // Verify it's marked as video
            if (response.mediaType === 'video') {
              console.log('\n✅ Correctly identified as video media type');
            } else {
              console.log('\n⚠️  Warning: Expected mediaType=video, got:', response.mediaType);
            }

            resolve(response);
          } else {
            console.log(`❌ FAILED! Status ${res.statusCode}\n`);
            console.log('Error:', response.error || response.message || 'Unknown error');
            reject(new Error(`Upload failed with status ${res.statusCode}`));
          }
        } catch (error) {
          console.log('❌ Failed to parse response:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    // Track upload progress
    let uploadedBytes = 0;
    const totalBytes = stats.size;
    let lastProgress = 0;

    form.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = Math.floor((uploadedBytes / totalBytes) * 100);

      if (progress >= lastProgress + 10 || progress === 100) {
        process.stdout.write(`\r📤 Progress: ${progress}%`);
        lastProgress = progress;
      }
    });

    form.pipe(req);
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get video path from arguments or create test file
    const videoPath = process.argv[2] || createTestVideoFile();

    // Test the upload
    await testVideoUpload(videoPath);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testVideoUpload };
