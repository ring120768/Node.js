#!/usr/bin/env node

/**
 * Test Dashboard Image Display
 * Verifies that the dashboard API returns valid image URLs
 */

const fetch = require('node-fetch');

const USER_ID = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
const API_URL = `http://localhost:5001/api/user-documents?user_id=${USER_ID}&document_type=image`;

async function testDashboardImages() {
  console.log('\n🖼️  Testing Dashboard Image Display\n');
  console.log('========================================\n');

  try {
    // 1. Fetch images from API
    console.log('📡 Fetching images from API...');
    const response = await fetch(API_URL);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${data.error || 'Unknown error'}`);
    }

    const images = data.data?.documents || [];
    console.log(`✅ Found ${images.length} images\n`);

    // 2. Check each image has a valid URL
    let successCount = 0;
    for (const image of images) {
      const imageUrl = image.signed_url || image.public_url;

      console.log(`\n📷 ${image.document_type}`);
      console.log(`   Status: ${image.status}`);
      console.log(`   Has signed_url: ${!!image.signed_url}`);
      console.log(`   Has public_url: ${!!image.public_url}`);

      if (imageUrl) {
        // Try to fetch the image headers to verify it's accessible
        try {
          const imgResponse = await fetch(imageUrl, { method: 'HEAD' });
          if (imgResponse.ok) {
            console.log(`   ✅ Image accessible (${imgResponse.status})`);
            successCount++;
          } else {
            console.log(`   ❌ Image not accessible (${imgResponse.status})`);
          }
        } catch (err) {
          console.log(`   ❌ Failed to access image: ${err.message}`);
        }
      } else {
        console.log(`   ❌ No URL available`);
      }
    }

    // 3. Summary
    console.log('\n========================================');
    console.log('                SUMMARY');
    console.log('========================================\n');

    console.log(`📊 Results:`);
    console.log(`   Total images: ${images.length}`);
    console.log(`   Accessible: ${successCount}`);
    console.log(`   Failed: ${images.length - successCount}`);

    if (successCount === images.length) {
      console.log('\n✅ SUCCESS: All images are accessible!');
      console.log('🎉 The dashboard should display images correctly.');
    } else if (successCount > 0) {
      console.log('\n⚠️  PARTIAL SUCCESS: Some images are accessible.');
      console.log('📝 Check the failed images above for details.');
    } else {
      console.log('\n❌ FAILURE: No images are accessible.');
      console.log('🔧 Need to fix the image URLs or storage.');
    }

    console.log('\n🌐 Test the dashboard at:');
    console.log('   http://localhost:5001/dashboard.html');
    console.log('   http://localhost:5001/test-images.html\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the test
testDashboardImages().catch(console.error);
