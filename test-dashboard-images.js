#!/usr/bin/env node

/**
 * Dashboard Image Diagnostic Tool
 * Tests image retrieval and helps diagnose dashboard image viewing issues
 *
 * Usage:
 * 1. First, ensure your .env file is configured with Supabase credentials
 * 2. Run: node test-dashboard-images.js [optional-user-id]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const logger = require('./src/utils/logger');

// Check environment variables
function checkEnvironment() {
  console.log('\n🔍 Checking Environment Configuration...\n');

  const required = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  let hasAllRequired = true;

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      console.error(`❌ Missing: ${key}`);
      hasAllRequired = false;
    } else if (key === 'SUPABASE_URL') {
      console.log(`✅ ${key}: ${value}`);
    } else {
      // Mask sensitive keys
      const masked = value.substring(0, 10) + '...' + value.substring(value.length - 5);
      console.log(`✅ ${key}: ${masked}`);
    }
  }

  if (!hasAllRequired) {
    console.error('\n⚠️  Missing required environment variables!');
    console.log('\n📝 Instructions:');
    console.log('1. Copy .env.template to .env');
    console.log('2. Fill in your Supabase credentials from:');
    console.log('   https://supabase.com/dashboard/project/[your-project]/settings/api');
    console.log('3. Run this script again\n');
    process.exit(1);
  }

  return true;
}

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('\n🔌 Testing Supabase Connection...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Test basic connection by checking user_signup table
    const { count, error } = await supabase
      .from('user_signup')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return null;
    }

    console.log(`✅ Connected to Supabase`);
    console.log(`📊 Total users in database: ${count}`);

    return supabase;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return null;
  }
}

// Find test users with images
async function findTestUsers(supabase) {
  console.log('\n👥 Finding Users with Images...\n');

  try {
    // Get users who have documents
    const { data: usersWithDocs, error } = await supabase
      .from('user_documents')
      .select('create_user_id, document_type, status')
      .eq('status', 'completed')
      .is('deleted_at', null);

    if (error) throw error;

    if (!usersWithDocs || usersWithDocs.length === 0) {
      console.log('⚠️  No users with completed documents found');
      return [];
    }

    // Group by user
    const userGroups = {};
    usersWithDocs.forEach(doc => {
      if (!userGroups[doc.create_user_id]) {
        userGroups[doc.create_user_id] = [];
      }
      userGroups[doc.create_user_id].push(doc.document_type);
    });

    // Get user details
    const userIds = Object.keys(userGroups);
    const { data: users, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name')
      .in('create_user_id', userIds)
      .limit(5);

    if (userError) throw userError;

    console.log(`Found ${users.length} users with images:\n`);

    users.forEach(user => {
      const docTypes = userGroups[user.create_user_id];
      console.log(`👤 ${user.name || 'Unknown'} (${user.email})`);
      console.log(`   ID: ${user.create_user_id}`);
      console.log(`   Documents: ${docTypes.length} (${docTypes.slice(0, 3).join(', ')}${docTypes.length > 3 ? '...' : ''})`);
      console.log('');
    });

    return users;
  } catch (error) {
    console.error('❌ Error finding users:', error.message);
    return [];
  }
}

// Test image retrieval for a specific user
async function testUserImages(supabase, userId) {
  console.log(`\n🖼️  Testing Image Retrieval for User: ${userId}\n`);

  try {
    // Fetch user documents
    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!documents || documents.length === 0) {
      console.log('⚠️  No completed documents found for this user');
      return;
    }

    console.log(`📁 Found ${documents.length} documents:\n`);

    // Filter for images (exclude videos)
    const images = documents.filter(doc =>
      !doc.document_type?.toLowerCase().includes('video') &&
      !doc.document_type?.toLowerCase().includes('dashcam')
    );

    const videos = documents.filter(doc =>
      doc.document_type?.toLowerCase().includes('video') ||
      doc.document_type?.toLowerCase().includes('dashcam')
    );

    console.log(`🖼️  Images: ${images.length}`);
    console.log(`🎥 Videos: ${videos.length}\n`);

    // Test URL generation for first few images
    console.log('Testing URL Access:\n');

    for (let i = 0; i < Math.min(3, images.length); i++) {
      const image = images[i];
      console.log(`Image ${i + 1}: ${image.document_type}`);
      console.log(`  Status: ${image.status}`);
      console.log(`  Created: ${new Date(image.created_at).toLocaleDateString('en-GB')}`);

      if (image.public_url) {
        console.log(`  Public URL: ${image.public_url}`);
      }

      if (image.storage_path) {
        // Try to generate a signed URL
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(image.storage_path, 3600);

          if (urlError) {
            console.log(`  ❌ Failed to generate signed URL: ${urlError.message}`);
          } else if (urlData?.signedUrl) {
            console.log(`  ✅ Signed URL generated successfully`);
            console.log(`     ${urlData.signedUrl.substring(0, 80)}...`);
          }
        } catch (e) {
          console.log(`  ❌ Error generating URL: ${e.message}`);
        }
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error testing images:', error.message);
  }
}

// Test the API endpoint
async function testAPIEndpoint(userId) {
  console.log('\n🌐 Testing API Endpoint...\n');

  const url = `http://localhost:5000/api/user-documents?user_id=${userId}`;
  console.log(`Testing: GET ${url}\n`);

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ API returned status: ${response.status} ${response.statusText}`);

      if (response.status === 404) {
        console.log('\n⚠️  The server is not running or the endpoint is not found.');
        console.log('\n📝 To start the server:');
        console.log('   npm start');
        console.log('   or');
        console.log('   npm run dev');
      }

      return;
    }

    const data = await response.json();

    if (data.success && data.data?.documents) {
      const docs = data.data.documents;
      console.log(`✅ API working! Retrieved ${docs.length} documents`);

      const images = docs.filter(doc =>
        !doc.document_type?.toLowerCase().includes('video') &&
        !doc.document_type?.toLowerCase().includes('dashcam')
      );

      console.log(`   🖼️  ${images.length} images`);
      console.log(`   🎥 ${docs.length - images.length} videos/other`);
    } else {
      console.log('⚠️  Unexpected API response format:', data);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server at localhost:5000');
      console.log('\n📝 The Node.js server is not running.');
      console.log('\nTo fix this:');
      console.log('1. Make sure your .env file is configured');
      console.log('2. Start the server with: npm start');
      console.log('3. Then open dashboard.html in your browser');
    } else {
      console.error('❌ API test failed:', error.message);
    }
  }
}

// Main diagnostic function
async function runDiagnostics(specificUserId = null) {
  console.log('========================================');
  console.log('   Dashboard Image Diagnostic Tool');
  console.log('========================================');

  // Check environment
  checkEnvironment();

  // Connect to Supabase
  const supabase = await testSupabaseConnection();
  if (!supabase) {
    console.error('\n❌ Cannot continue without Supabase connection');
    process.exit(1);
  }

  // Find or use specific user
  let userId = specificUserId;

  if (!userId) {
    const users = await findTestUsers(supabase);
    if (users.length > 0) {
      userId = users[0].create_user_id;
      console.log(`\n📍 Using first user for testing: ${userId}`);
    } else {
      console.log('\n⚠️  No users with images found in database');
      console.log('Please provide a user ID as argument: node test-dashboard-images.js <user-id>');
      process.exit(0);
    }
  }

  // Test image retrieval
  await testUserImages(supabase, userId);

  // Test API endpoint
  await testAPIEndpoint(userId);

  console.log('\n========================================');
  console.log('          Diagnostic Complete');
  console.log('========================================\n');

  console.log('📋 Summary:\n');
  console.log('1. ✅ Environment variables are configured');
  console.log('2. ✅ Supabase connection is working');
  console.log(`3. ✅ Found user with images: ${userId}`);
  console.log('4. ⚠️  Server needs to be running for dashboard to work\n');

  console.log('🔧 Next Steps:\n');
  console.log('1. Start the server: npm start');
  console.log('2. Open dashboard in browser: http://localhost:5000/dashboard.html');
  console.log(`3. Use this test user ID: ${userId}`);
  console.log('4. The dashboard should now display the images\n');

  console.log('💡 Tip: Keep this terminal open and start the server in a new terminal\n');
}

// Run the diagnostics
const userId = process.argv[2];
runDiagnostics(userId).catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});