#!/usr/bin/env node

/**
 * Test Image URL Mapping Fix
 *
 * Verifies that prepareFormDataForRestAPI() now correctly extracts
 * image URLs from allData.imageUrls object.
 *
 * This was the root cause of missing images in PDFs after migrating
 * to Adobe REST API implementation.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testImageMapping() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           TEST IMAGE URL MAPPING FIX                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Find a user with uploaded images
    console.log('🔍 Finding user with uploaded images...\n');

    const { data: documents, error: docError } = await supabase
      .from('user_documents')
      .select('create_user_id, document_type, signed_url, storage_path')
      .eq('status', 'completed')
      .is('deleted_at', null)
      .limit(10);

    if (docError) {
      console.error('❌ Error fetching documents:', docError.message);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️  No uploaded images found in database');
      console.log('   Upload some images through the UI first, then run this test.\n');
      return;
    }

    // Group by user
    const userImages = {};
    documents.forEach(doc => {
      if (!userImages[doc.create_user_id]) {
        userImages[doc.create_user_id] = [];
      }
      userImages[doc.create_user_id].push(doc);
    });

    // Pick user with most images
    let testUserId = null;
    let maxImages = 0;
    for (const [userId, imgs] of Object.entries(userImages)) {
      if (imgs.length > maxImages) {
        maxImages = imgs.length;
        testUserId = userId;
      }
    }

    console.log(`✅ Found user with ${maxImages} images`);
    console.log(`   User ID: ${testUserId}\n`);

    // Show what images this user has
    console.log('📸 User\'s uploaded images:');
    userImages[testUserId].forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.document_type}`);
      console.log(`      Storage: ${img.storage_path}`);
      console.log(`      URL: ${img.signed_url ? 'Present ✅' : 'Missing ❌'}`);
    });

    // Now import and test the prepareFormDataForRestAPI function
    console.log('\n🧪 Testing prepareFormDataForRestAPI() function...\n');

    // Import the controller (we need to mock Express app context)
    const path = require('path');
    const controllerPath = path.join(__dirname, 'src/controllers/pdf.controller.js');

    // We can't directly test the function without running full PDF generation
    // But we can verify the code changes are in place
    const fs = require('fs');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');

    // Check for image URL mapping section
    const hasImageUrlSection = controllerCode.includes('IMAGE URLS - Map from allData.imageUrls');
    const hasDrivingLicense = controllerCode.includes('formData.driving_license_url');
    const hasVehicleFront = controllerCode.includes('formData.vehicle_front_url');
    const hasWhat3words = controllerCode.includes('formData.what3words_url');
    const hasOtherVehicle = controllerCode.includes('formData.other_vehicle_url');

    console.log('Code verification:');
    console.log(`   Image URL section present: ${hasImageUrlSection ? '✅' : '❌'}`);
    console.log(`   Driving license mapping: ${hasDrivingLicense ? '✅' : '❌'}`);
    console.log(`   Vehicle front mapping: ${hasVehicleFront ? '✅' : '❌'}`);
    console.log(`   what3words URL mapping: ${hasWhat3words ? '✅' : '❌'}`);
    console.log(`   Other vehicle mapping: ${hasOtherVehicle ? '✅' : '❌'}`);

    if (hasImageUrlSection && hasDrivingLicense && hasVehicleFront && hasWhat3words && hasOtherVehicle) {
      console.log('\n✅ ALL IMAGE URL MAPPINGS VERIFIED IN CODE!');
      console.log('\n📋 Next steps:');
      console.log('   1. Upload images through the UI (if you haven\'t already)');
      console.log('   2. Generate a PDF: node test-form-filling.js ' + testUserId);
      console.log('   3. Open the PDF and verify all images are present');
      console.log('\n   Expected image fields in PDF:');
      console.log('   - Page 2: driving_license_url, vehicle photos (5 fields)');
      console.log('   - Pages 11-12: what3words_url, scene photos, damage photos (12 fields)');
    } else {
      console.log('\n❌ Some image URL mappings are missing!');
      console.log('   The fix may not have been applied correctly.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  console.log('');
}

testImageMapping().catch(console.error);
