#!/usr/bin/env node

/**
 * Test Signed URL Generation Fix
 *
 * Verifies that signup.controller.js now correctly generates
 * signed URLs when moving files from temp to permanent storage.
 *
 * This fix ensures URL columns are populated in user_documents
 * table after direct uploads (not just Typeform webhooks).
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSignedUrlGeneration() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        TEST SIGNED URL GENERATION FIX                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Verify code changes in signup.controller.js
    console.log('🔍 Step 1: Verifying code changes in signup.controller.js...\n');

    const signupControllerPath = path.join(__dirname, 'src/controllers/signup.controller.js');
    const signupCode = fs.readFileSync(signupControllerPath, 'utf8');

    const hasSignedUrlGeneration = signupCode.includes('createSignedUrl(permanentPath, signedUrlExpirySeconds)');
    const hasExpiryCalculation = signupCode.includes('new Date(Date.now() + (signedUrlExpirySeconds * 1000))');
    const passesSignedUrl = signupCode.includes('signed_url: signedUrl');
    const passesExpiresAt = signupCode.includes('signed_url_expires_at: signedUrlExpiresAt.toISOString()');
    const passesPublicUrl = signupCode.includes('public_url: signedUrl');

    console.log('Code verification (signup.controller.js):');
    console.log(`   Signed URL generation: ${hasSignedUrlGeneration ? '✅' : '❌'}`);
    console.log(`   Expiry calculation: ${hasExpiryCalculation ? '✅' : '❌'}`);
    console.log(`   Passes signed_url parameter: ${passesSignedUrl ? '✅' : '❌'}`);
    console.log(`   Passes signed_url_expires_at: ${passesExpiresAt ? '✅' : '❌'}`);
    console.log(`   Passes public_url parameter: ${passesPublicUrl ? '✅' : '❌'}`);

    // Step 2: Verify code changes in imageProcessorV2.js
    console.log('\n🔍 Step 2: Verifying code changes in imageProcessorV2.js...\n');

    const imageProcessorPath = path.join(__dirname, 'src/services/imageProcessorV2.js');
    const imageProcessorCode = fs.readFileSync(imageProcessorPath, 'utf8');

    const acceptsPublicUrl = imageProcessorCode.includes('public_url = null');
    const acceptsSignedUrl = imageProcessorCode.includes('signed_url = null');
    const acceptsExpiresAt = imageProcessorCode.includes('signed_url_expires_at = null');
    const storesPublicUrl = /documentRecord\s*=\s*{[^}]*public_url,/.test(imageProcessorCode);
    const storesSignedUrl = /documentRecord\s*=\s*{[^}]*signed_url,/.test(imageProcessorCode);
    const storesExpiresAt = /documentRecord\s*=\s*{[^}]*signed_url_expires_at,/.test(imageProcessorCode);

    console.log('Code verification (imageProcessorV2.js):');
    console.log(`   Accepts public_url parameter: ${acceptsPublicUrl ? '✅' : '❌'}`);
    console.log(`   Accepts signed_url parameter: ${acceptsSignedUrl ? '✅' : '❌'}`);
    console.log(`   Accepts signed_url_expires_at: ${acceptsExpiresAt ? '✅' : '❌'}`);
    console.log(`   Stores public_url in record: ${storesPublicUrl ? '✅' : '❌'}`);
    console.log(`   Stores signed_url in record: ${storesSignedUrl ? '✅' : '❌'}`);
    console.log(`   Stores signed_url_expires_at: ${storesExpiresAt ? '✅' : '❌'}`);

    // Step 3: Check database for recent uploads
    console.log('\n🔍 Step 3: Checking database for recent uploads...\n');

    const { data: recentDocs, error: docsError } = await supabase
      .from('user_documents')
      .select('create_user_id, document_type, signed_url, signed_url_expires_at, public_url, created_at, source_type')
      .order('created_at', { ascending: false })
      .limit(5);

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError.message);
      return;
    }

    if (!recentDocs || recentDocs.length === 0) {
      console.log('⚠️  No documents found in database');
      console.log('   Upload some images through the signup form to test.');
    } else {
      console.log(`Found ${recentDocs.length} recent documents:\n`);

      recentDocs.forEach((doc, i) => {
        const hasSignedUrl = !!doc.signed_url;
        const hasExpiresAt = !!doc.signed_url_expires_at;
        const hasPublicUrl = !!doc.public_url;
        const isDirectUpload = doc.source_type === 'temp_upload';

        console.log(`${i + 1}. ${doc.document_type} (${doc.source_type})`);
        console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
        console.log(`   User ID: ${doc.create_user_id.substring(0, 8)}...`);
        console.log(`   signed_url: ${hasSignedUrl ? '✅ Present' : '❌ Missing'}`);
        console.log(`   signed_url_expires_at: ${hasExpiresAt ? '✅ Present' : '❌ Missing'}`);
        console.log(`   public_url: ${hasPublicUrl ? '✅ Present' : '❌ Missing'}`);

        if (isDirectUpload && !hasSignedUrl) {
          console.log(`   ⚠️  WARNING: Direct upload missing signed URL!`);
        }

        console.log('');
      });

      // Check if any direct uploads are missing signed URLs
      const directUploadsWithoutUrls = recentDocs.filter(
        doc => doc.source_type === 'temp_upload' && !doc.signed_url
      );

      if (directUploadsWithoutUrls.length > 0) {
        console.log(`⚠️  Found ${directUploadsWithoutUrls.length} direct uploads without signed URLs`);
        console.log('   These were likely uploaded BEFORE the fix was applied.');
        console.log('   Test with a NEW upload to verify the fix works.\n');
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       TEST SUMMARY                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const allSignupChecks = hasSignedUrlGeneration && hasExpiryCalculation && passesSignedUrl && passesExpiresAt && passesPublicUrl;
    const allProcessorChecks = acceptsPublicUrl && acceptsSignedUrl && acceptsExpiresAt && storesPublicUrl && storesSignedUrl && storesExpiresAt;

    if (allSignupChecks && allProcessorChecks) {
      console.log('✅ ALL CODE CHANGES VERIFIED!');
      console.log('\n📋 Next steps:');
      console.log('   1. Run a manual test signup through the UI');
      console.log('   2. Upload images during signup');
      console.log('   3. Check database to verify signed URLs are populated');
      console.log('   4. Run this test again to see the new uploads\n');
    } else {
      console.log('❌ Some code changes missing!');
      if (!allSignupChecks) {
        console.log('   ⚠️  signup.controller.js needs attention');
      }
      if (!allProcessorChecks) {
        console.log('   ⚠️  imageProcessorV2.js needs attention');
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testSignedUrlGeneration().catch(console.error);
