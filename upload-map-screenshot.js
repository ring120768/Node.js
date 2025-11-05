/**
 * Upload what3words map screenshot to Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadMapScreenshot() {
  console.log('📸 Uploading what3words map screenshot to Supabase Storage...\n');

  try {
    // Read the screenshot file
    const screenshotPath = path.join(__dirname, '.playwright-mcp', 'what3words-map-screenshot.png');

    if (!fs.existsSync(screenshotPath)) {
      throw new Error(`Screenshot not found at: ${screenshotPath}`);
    }

    const fileBuffer = fs.readFileSync(screenshotPath);
    const fileName = `screenshots/what3words-map-${Date.now()}.png`;

    console.log(`📁 File: ${screenshotPath}`);
    console.log(`📦 Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`🎯 Uploading to: ${fileName}\n`);

    // Upload to Supabase Storage (user-documents bucket)
    const { data, error } = await supabase.storage
      .from('user-documents')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw error;
    }

    console.log('✅ Upload successful!');
    console.log(`📍 Path: ${data.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(data.path);

    console.log(`🌐 Public URL: ${urlData.publicUrl}\n`);

    // Save URL to a file for easy access
    const urlFile = path.join(__dirname, 'map-screenshot-url.txt');
    fs.writeFileSync(urlFile, `Public URL: ${urlData.publicUrl}\nPath: ${data.path}\n`);
    console.log(`💾 URL saved to: ${urlFile}`);

    return {
      path: data.path,
      publicUrl: urlData.publicUrl
    };

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

// Run the upload
uploadMapScreenshot()
  .then(result => {
    console.log('\n🎉 Screenshot successfully uploaded to Supabase Storage!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Upload failed:', error);
    process.exit(1);
  });
