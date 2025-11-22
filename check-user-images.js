#!/usr/bin/env node

/**
 * Check User Images - Helper script to view uploaded images
 * Usage: node check-user-images.js [user_id]
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserImages(userId) {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              USER IMAGES & SIGNED URLS                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    if (!userId) {
      // Get most recent user
      const { data: recentUser } = await supabase
        .from('user_signup')
        .select('create_user_id, name, surname, email, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!recentUser) {
        console.log('❌ No users found in database');
        return;
      }

      userId = recentUser.create_user_id;
      console.log('📋 Most Recent User:');
      console.log(`   Name: ${recentUser.name} ${recentUser.surname}`);
      console.log(`   Email: ${recentUser.email}`);
      console.log(`   ID: ${userId}`);
      console.log(`   Created: ${new Date(recentUser.created_at).toLocaleString()}\n`);
    }

    // Get user's documents
    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching documents:', error.message);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️  No images found for this user');
      console.log(`   User ID: ${userId}\n`);
      return;
    }

    console.log(`\n📸 Found ${documents.length} images for user:\n`);

    documents.forEach((doc, i) => {
      const hasSignedUrl = !!doc.signed_url;
      const hasExpiresAt = !!doc.signed_url_expires_at;
      const hasPublicUrl = !!doc.public_url;
      const expiresAt = doc.signed_url_expires_at ? new Date(doc.signed_url_expires_at) : null;
      const isExpired = expiresAt ? expiresAt < new Date() : false;

      console.log(`${i + 1}. ${doc.document_type}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Source: ${doc.source_type}`);
      console.log(`   Storage: ${doc.storage_path || 'N/A'}`);
      console.log(`   File Size: ${doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A'}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`   `);
      console.log(`   URL Status:`);
      console.log(`   - signed_url: ${hasSignedUrl ? '✅ Present' : '❌ Missing'}`);
      console.log(`   - signed_url_expires_at: ${hasExpiresAt ? '✅ Present' : '❌ Missing'}`);
      console.log(`   - public_url: ${hasPublicUrl ? '✅ Present' : '❌ Missing'}`);

      if (hasExpiresAt) {
        console.log(`   - Expires: ${expiresAt.toLocaleString()} ${isExpired ? '⚠️ EXPIRED' : '✅ Valid'}`);
      }

      if (hasSignedUrl) {
        console.log(`   - URL Preview: ${doc.signed_url.substring(0, 80)}...`);
      }

      console.log('');
    });

    // Summary
    const withUrls = documents.filter(d => d.signed_url).length;
    const withoutUrls = documents.filter(d => !d.signed_url).length;
    const directUploads = documents.filter(d => d.source_type === 'temp_upload').length;

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`Total Images: ${documents.length}`);
    console.log(`With Signed URLs: ${withUrls} ✅`);
    console.log(`Without URLs: ${withoutUrls} ${withoutUrls > 0 ? '⚠️' : ''}`);
    console.log(`Direct Uploads: ${directUploads}`);

    if (withoutUrls > 0 && directUploads > 0) {
      console.log('\n⚠️  Some direct uploads are missing signed URLs.');
      console.log('   These may have been uploaded BEFORE the fix was applied.');
      console.log('   Test with a NEW upload to verify the fix works.\n');
    } else if (withUrls === documents.length) {
      console.log('\n✅ All images have signed URLs! The fix is working correctly.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Get user ID from command line argument
const userId = process.argv[2];
checkUserImages(userId).catch(console.error);
