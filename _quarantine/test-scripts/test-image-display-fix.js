#!/usr/bin/env node
/**
 * Comprehensive test to verify dashboard image display is working
 * Tests all layers: Database → API → Frontend
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
const API_BASE = 'http://localhost:5001';

console.log('\n========================================');
console.log('   Dashboard Image Display Test');
console.log('========================================\n');

async function testImageDisplay() {
  let allTestsPassed = true;

  try {
    // Test 1: Database Check
    console.log('📊 Test 1: Database Check...');
    const { data: dbImages, error: dbError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', TEST_USER_ID)
      .in('document_type', [
        'driving_license_picture',
        'vehicle_picture_front',
        'vehicle_picture_back',
        'vehicle_picture_driver_side',
        'vehicle_picture_passenger_side'
      ]);

    if (dbError) {
      console.log(`  ❌ Database Error: ${dbError.message}`);
      allTestsPassed = false;
    } else {
      console.log(`  ✅ Found ${dbImages.length} images in database`);

      // Check each image has proper fields
      for (const img of dbImages) {
        if (!img.public_url) {
          console.log(`  ❌ Image ${img.document_type} missing public_url`);
          allTestsPassed = false;
        } else if (!img.public_url.includes('token=')) {
          console.log(`  ❌ Image ${img.document_type} has invalid URL (no token)`);
          allTestsPassed = false;
        } else {
          console.log(`  ✅ ${img.document_type}: Has valid signed URL`);
        }
      }
    }

    // Test 2: API Endpoint
    console.log('\n📡 Test 2: API Endpoint...');
    const apiUrl = `${API_BASE}/api/user-documents?user_id=${TEST_USER_ID}&document_type=image`;
    console.log(`  Testing: ${apiUrl}`);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.log(`  ❌ API Error: ${response.status} ${response.statusText}`);
      allTestsPassed = false;
    } else {
      const apiData = await response.json();
      const apiImages = apiData.data?.documents || [];
      console.log(`  ✅ API returned ${apiImages.length} images`);

      // Check API response structure
      if (apiImages.length > 0) {
        const firstImage = apiImages[0];
        if (!firstImage.public_url) {
          console.log('  ❌ API response missing public_url field');
          allTestsPassed = false;
        } else {
          console.log('  ✅ API response has public_url field');
        }
      }
    }

    // Test 3: URL Accessibility
    console.log('\n🔗 Test 3: URL Accessibility...');
    if (dbImages && dbImages.length > 0) {
      const testImage = dbImages[0];
      const testUrl = testImage.public_url;

      if (testUrl) {
        console.log(`  Testing URL: ${testUrl.substring(0, 100)}...`);
        const imgResponse = await fetch(testUrl);

        if (imgResponse.ok) {
          const contentType = imgResponse.headers.get('content-type');
          const contentLength = imgResponse.headers.get('content-length');

          if (contentType && contentType.startsWith('image/')) {
            console.log(`  ✅ URL accessible: ${contentType}, ${(contentLength/1024/1024).toFixed(2)}MB`);
          } else {
            console.log(`  ❌ Invalid content type: ${contentType}`);
            allTestsPassed = false;
          }
        } else {
          console.log(`  ❌ URL not accessible: ${imgResponse.status}`);
          allTestsPassed = false;
        }
      }
    }

    // Test 4: Dashboard HTML Check
    console.log('\n🖥️ Test 4: Dashboard HTML Check...');
    const dashboardResponse = await fetch(`${API_BASE}/dashboard.html`);

    if (dashboardResponse.ok) {
      const dashboardHtml = await dashboardResponse.text();

      // Check for correct field usage
      if (dashboardHtml.includes('image.signed_url')) {
        console.log('  ❌ Dashboard still references signed_url (should use public_url)');
        allTestsPassed = false;
      } else if (dashboardHtml.includes('image.public_url')) {
        console.log('  ✅ Dashboard correctly uses public_url field');
      } else {
        console.log('  ⚠️ Could not verify field usage in dashboard');
      }

      // Check for document_type parameter
      if (dashboardHtml.includes('document_type=image')) {
        console.log('  ✅ Dashboard includes document_type=image parameter');
      } else {
        console.log('  ❌ Dashboard missing document_type=image parameter');
        allTestsPassed = false;
      }
    } else {
      console.log(`  ❌ Could not fetch dashboard.html: ${dashboardResponse.status}`);
      allTestsPassed = false;
    }

    // Summary
    console.log('\n========================================');
    console.log('           Test Summary');
    console.log('========================================\n');

    if (allTestsPassed) {
      console.log('✨ All tests passed! Images should now display correctly.');
      console.log('\n📸 Open dashboard to verify:');
      console.log(`   ${API_BASE}/dashboard.html`);
      console.log('\n💡 Test user: ian.ring@sky.com');
    } else {
      console.log('❌ Some tests failed. Please review the errors above.');
      console.log('\nTroubleshooting steps:');
      console.log('1. Check if server is running on port 5001');
      console.log('2. Verify .env file has correct Supabase credentials');
      console.log('3. Run: node fix-storage-paths.js');
      console.log('4. Clear browser cache and reload dashboard');
    }

    // Additional diagnostic info
    console.log('\n========================================');
    console.log('        Diagnostic Information');
    console.log('========================================\n');

    console.log('Test files available:');
    console.log(`  • Single image test: ${API_BASE}/test-single-image.html`);
    console.log(`  • Dashboard test: ${API_BASE}/test-dashboard-images.html`);
    console.log(`  • Main dashboard: ${API_BASE}/dashboard.html`);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testImageDisplay();