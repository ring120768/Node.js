#!/usr/bin/env node

/**
 * Test Image Download Links Email
 * Usage: node test-image-links-email.js <user-uuid>
 *
 * Tests the sendImageDownloadLinks function with a real user
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { sendImageDownloadLinks, calculateUrlExpiry } = require('./lib/emailService');

const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node test-image-links-email.js <user-uuid>');
  console.log('Example: node test-image-links-email.js e6708c56-f9bb-46f1-94d5-d5bea8db1d71');
  process.exit(1);
}

async function testImageLinksEmail() {
  console.log('🧪 Testing Image Download Links Email');
  console.log('=====================================\n');

  // Check environment variables
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // First, let's test the expiry calculation logic
    console.log('📊 Testing URL Expiry Logic:');
    console.log('----------------------------');

    const testCases = [
      { date: null, desc: 'No subscription' },
      { date: new Date(Date.now() - 86400000).toISOString(), desc: 'Expired (yesterday)' },
      { date: new Date(Date.now() + 30 * 86400000).toISOString(), desc: '30 days remaining (within 2 months)' },
      { date: new Date(Date.now() + 45 * 86400000).toISOString(), desc: '45 days remaining (within 2 months)' },
      { date: new Date(Date.now() + 90 * 86400000).toISOString(), desc: '90 days remaining (> 2 months)' },
      { date: new Date(Date.now() + 365 * 86400000).toISOString(), desc: '1 year remaining' }
    ];

    for (const tc of testCases) {
      const expiry = calculateUrlExpiry(tc.date);
      const days = Math.floor(expiry / 86400);
      console.log(`  ${tc.desc}: ${days} days (${Math.floor(days / 7)} weeks)`);
    }

    console.log('\n📋 Fetching user data...');

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, surname, subscription_end_date')
      .eq('create_user_id', userId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user:', userError.message);
      process.exit(1);
    }

    console.log(`  User: ${user.name} ${user.surname}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Subscription ends: ${user.subscription_end_date || 'N/A'}`);

    // Check how many images the user has
    const { data: images, error: imagesError } = await supabase
      .from('user_documents')
      .select('id, document_type, storage_path')
      .eq('create_user_id', userId)
      .eq('status', 'completed')
      .is('deleted_at', null);

    if (imagesError) {
      console.error('❌ Failed to fetch images:', imagesError.message);
      process.exit(1);
    }

    console.log(`  Images found: ${images.length}`);

    if (images.length > 0) {
      console.log('  Image types:');
      const typeCounts = {};
      images.forEach(img => {
        typeCounts[img.document_type] = (typeCounts[img.document_type] || 0) + 1;
      });
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`    - ${type}: ${count}`);
      });
    }

    console.log('\n📧 Sending image download links email...');

    const userName = [user.name, user.surname].filter(Boolean).join(' ') || 'Test User';
    const result = await sendImageDownloadLinks(supabase, userId, user.email, userName);

    if (result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log(`  Message ID: ${result.messageId}`);
      console.log(`  Total images: ${result.totalImages}`);
      console.log(`  Expiry date: ${new Date(result.expiryDate).toLocaleDateString('en-GB')}`);
      console.log(`  Expiry duration: ${result.expiryDuration}`);
    } else if (result.reason === 'no_images') {
      console.log('\n⚠️ No images to send - user has no completed images');
    } else {
      console.error('\n❌ Failed to send email:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testImageLinksEmail();
