#!/usr/bin/env node

/**
 * Debug Script: Test Email and PDF Generation
 *
 * Tests:
 * 1. Image download links email sending
 * 2. PDF generation with signed URLs
 *
 * Usage: node test-email-and-pdf-debug.js <user-uuid> <incident-uuid>
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { sendImageDownloadLinks } = require('./lib/emailService');
const { fetchAllData } = require('./lib/dataFetcher');

const userId = process.argv[2];
const incidentId = process.argv[3];

if (!userId || !incidentId) {
  console.log('Usage: node test-email-and-pdf-debug.js <user-uuid> <incident-uuid>');
  console.log('');
  console.log('Example:');
  console.log('  node test-email-and-pdf-debug.js e6708c56-f9bb-46f1-94d5-d5bea8db1d71 3d92a38e-a381-490e-9e0e-42c01e35b4c3');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmailAndPdf() {
  console.log('🧪 Debug: Email & PDF Generation');
  console.log('=================================\n');
  console.log(`User ID: ${userId}`);
  console.log(`Incident ID: ${incidentId}\n`);

  try {
    // ========================================
    // TEST 1: Fetch User Data
    // ========================================
    console.log('📋 Step 1: Fetching user data...');
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, surname, subscription_end_date')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ User fetch failed:', userError?.message || 'User not found');
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name} ${user.surname} (${user.email})`);
    console.log(`   Subscription ends: ${user.subscription_end_date || 'N/A'}\n`);

    // ========================================
    // TEST 2: Check User Documents
    // ========================================
    console.log('📷 Step 2: Checking user_documents table...');
    const { data: userDocs, error: docsError } = await supabase
      .from('user_documents')
      .select('id, document_type, storage_path, signed_url, signed_url_expires_at, incident_id, created_at')
      .eq('create_user_id', userId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .or(`incident_id.eq.${incidentId},incident_id.is.null`)
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('❌ Documents fetch failed:', docsError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${userDocs.length} documents:`);
    userDocs.forEach((doc, idx) => {
      const hasSignedUrl = !!doc.signed_url;
      const urlExpiry = doc.signed_url_expires_at ? new Date(doc.signed_url_expires_at) : null;
      const isExpired = urlExpiry && urlExpiry < new Date();

      console.log(`   ${idx + 1}. ${doc.document_type} (incident: ${doc.incident_id || 'signup'})`);
      console.log(`      - Storage: ${doc.storage_path || 'N/A'}`);
      console.log(`      - Signed URL: ${hasSignedUrl ? '✅' : '❌'}`);
      if (urlExpiry) {
        console.log(`      - Expires: ${urlExpiry.toLocaleString()} ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
      }
    });
    console.log('');

    // ========================================
    // TEST 3: Send Image Download Links Email
    // ========================================
    console.log('📧 Step 3: Testing image download links email...');
    const userName = [user.name, user.surname].filter(Boolean).join(' ') || 'Test User';

    const imageResult = await sendImageDownloadLinks(supabase, userId, user.email, userName, incidentId);

    if (imageResult.success) {
      console.log('✅ Image email sent successfully!');
      console.log(`   Message ID: ${imageResult.messageId}`);
      console.log(`   Total images: ${imageResult.totalImages}`);
      console.log(`   Expiry: ${imageResult.expiryDuration}`);
    } else if (imageResult.reason === 'no_images') {
      console.log('⚠️  No images to send (user has no completed images)');
    } else {
      console.log('❌ Image email failed:', imageResult.error);
    }
    console.log('');

    // ========================================
    // TEST 4: Fetch All Data (PDF Generation)
    // ========================================
    console.log('📄 Step 4: Testing fetchAllData for PDF generation...');
    const allData = await fetchAllData(userId, { incidentId });

    if (!allData.user) {
      console.error('❌ fetchAllData failed: user not found');
      process.exit(1);
    }

    console.log('✅ fetchAllData successful:');
    console.log(`   User: ${allData.user.name} ${allData.user.surname}`);
    console.log(`   Current incident: ${allData.currentIncident?.id || 'N/A'}`);

    // Check imageUrls
    if (allData.imageUrls) {
      const urlCount = Object.keys(allData.imageUrls).length;
      console.log(`   Image URLs populated: ${urlCount} URLs`);

      if (urlCount > 0) {
        console.log('   Image URL keys:');
        Object.entries(allData.imageUrls).forEach(([key, url]) => {
          const urlPreview = url ? `${url.substring(0, 60)}...` : 'N/A';
          console.log(`      - ${key}: ${urlPreview}`);
        });
      } else {
        console.log('   ⚠️  WARNING: No image URLs generated!');
        console.log('   This means PDF will be missing all images.');
      }
    } else {
      console.log('   ❌ ERROR: allData.imageUrls is null/undefined!');
      console.log('   PDF generation will fail or have no images.');
    }

    console.log('\n✅ All tests complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEmailAndPdf();
