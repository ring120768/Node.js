#!/usr/bin/env node
/**
 * Test Supabase Storage access methods
 * Compare signed URLs vs authenticated access
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Test with both service role (backend) and anon key (frontend)
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TEST_USER_ID = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c';
const TEST_IMAGE_PATH = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c/driving_license_picture/1760653683931_driving_license_picture.jpeg';

console.log('\n========================================');
console.log('  Supabase Storage Auth Test');
console.log('========================================\n');

async function testStorageAccess() {
  console.log('📦 Testing Supabase Storage Access Methods...\n');

  // Test 1: Check storage bucket policies
  console.log('1️⃣ Checking storage bucket policies...');
  try {
    const { data: buckets, error } = await supabaseService.storage.listBuckets();

    if (error) {
      console.log('   ❌ Error listing buckets:', error.message);
    } else {
      console.log('   ✅ Buckets found:', buckets.map(b => b.name).join(', '));

      // Check if user-documents bucket is public
      const userDocsBucket = buckets.find(b => b.name === 'user-documents');
      if (userDocsBucket) {
        console.log(`   📋 user-documents bucket is ${userDocsBucket.public ? 'PUBLIC' : 'PRIVATE'}`);
      }
    }
  } catch (err) {
    console.log('   ❌ Failed to check buckets:', err.message);
  }

  // Test 2: Try direct public URL (if bucket is public)
  console.log('\n2️⃣ Testing direct public URL access...');
  const publicUrl = supabaseAnon.storage
    .from('user-documents')
    .getPublicUrl(TEST_IMAGE_PATH);

  console.log('   Public URL:', publicUrl.data.publicUrl);

  // Test if URL is accessible
  try {
    const fetch = require('node-fetch');
    const response = await fetch(publicUrl.data.publicUrl);
    console.log(`   Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      console.log(`   ✅ Direct public access works! Content-Type: ${contentType}`);
    } else {
      console.log('   ❌ Direct public access failed');
    }
  } catch (err) {
    console.log('   ❌ Error accessing public URL:', err.message);
  }

  // Test 3: Create signed URL with service role
  console.log('\n3️⃣ Testing signed URL with service role...');
  try {
    const { data: signedUrl, error } = await supabaseService.storage
      .from('user-documents')
      .createSignedUrl(TEST_IMAGE_PATH, 3600); // 1 hour

    if (error) {
      console.log('   ❌ Error creating signed URL:', error.message);
    } else {
      console.log('   ✅ Signed URL created:', signedUrl.signedUrl.substring(0, 100) + '...');

      // Test accessibility
      const fetch = require('node-fetch');
      const response = await fetch(signedUrl.signedUrl);
      console.log(`   Response: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.log('   ❌ Failed:', err.message);
  }

  // Test 4: Try authenticated download with anon key
  console.log('\n4️⃣ Testing authenticated download with anon key...');
  try {
    const { data, error } = await supabaseAnon.storage
      .from('user-documents')
      .download(TEST_IMAGE_PATH);

    if (error) {
      console.log('   ❌ Download error:', error.message);
      console.log('   Details:', error);
    } else {
      console.log('   ✅ Download successful! File size:', data.size, 'bytes');
    }
  } catch (err) {
    console.log('   ❌ Failed:', err.message);
  }

  // Test 5: Check RLS policies on user_documents table
  console.log('\n5️⃣ Checking RLS policies on user_documents table...');
  try {
    // Try with anon key (simulates frontend)
    const { data, error } = await supabaseAnon
      .from('user_documents')
      .select('id, document_type, public_url')
      .eq('create_user_id', TEST_USER_ID)
      .limit(1);

    if (error) {
      console.log('   ❌ Cannot read with anon key:', error.message);
    } else {
      console.log('   ✅ Can read with anon key:', data?.length, 'records');
    }
  } catch (err) {
    console.log('   ❌ Failed:', err.message);
  }

  // Test 6: Alternative - Create a download token
  console.log('\n6️⃣ Testing download token approach...');
  try {
    const { data: signedUrls, error } = await supabaseService.storage
      .from('user-documents')
      .createSignedUrls([TEST_IMAGE_PATH], 60 * 60 * 24 * 7); // 7 days

    if (error) {
      console.log('   ❌ Error creating signed URLs:', error.message);
    } else if (signedUrls && signedUrls.length > 0) {
      console.log('   ✅ Batch signed URL created');
      console.log('   URL valid for 7 days');
    }
  } catch (err) {
    console.log('   ❌ Failed:', err.message);
  }

  // Summary and Recommendations
  console.log('\n========================================');
  console.log('  Summary & Recommendations');
  console.log('========================================\n');

  console.log('🔍 Analysis:');
  console.log('1. Current approach uses signed URLs from backend');
  console.log('2. Dashboard has no Supabase client authentication');
  console.log('3. Images require valid signed URLs to display');

  console.log('\n💡 Recommended Solutions:');
  console.log('\n🅰️ Option A: Add Supabase Auth to Dashboard (BEST)');
  console.log('   - Include Supabase client library');
  console.log('   - Authenticate user with Supabase');
  console.log('   - Access images directly with auth context');
  console.log('   - No need for signed URLs');

  console.log('\n🅱️ Option B: Make Storage Bucket Public');
  console.log('   - Change bucket to public in Supabase dashboard');
  console.log('   - Use getPublicUrl() instead of signed URLs');
  console.log('   - Simple but less secure');

  console.log('\n🅲 Option C: Fix Current Signed URL Approach');
  console.log('   - Ensure backend generates fresh signed URLs');
  console.log('   - Use longer expiration times (7+ days)');
  console.log('   - Store signed URLs in database');

  console.log('\n🅳️ Option D: Proxy Images Through Backend');
  console.log('   - Create /api/images/:id endpoint');
  console.log('   - Backend fetches and streams images');
  console.log('   - Most secure but adds latency');
}

// Run the test
testStorageAccess().catch(console.error);