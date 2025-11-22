#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLatestSignup() {
  console.log('\n📋 CHECKING LATEST SIGNUP...\n');

  // Get latest user
  const { data: user, error: userError } = await supabase
    .from('user_signup')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (userError || !user) {
    console.log('❌ No users found');
    return;
  }

  console.log(`👤 User: ${user.name} ${user.surname}`);
  console.log(`📧 Email: ${user.email}`);
  console.log(`🆔 ID: ${user.create_user_id}`);
  console.log(`📅 Created: ${new Date(user.created_at).toLocaleString()}\n`);

  // Get all documents for this user
  const { data: docs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', user.create_user_id)
    .eq('document_category', 'signup')
    .order('created_at', { ascending: true });

  if (docsError) {
    console.log('❌ Error fetching documents:', docsError.message);
    return;
  }

  console.log(`📸 Found ${docs.length} signup images in database:\n`);

  for (const doc of docs) {
    console.log(`\n${doc.document_type}:`);
    console.log(`  Created: ${new Date(doc.created_at).toLocaleString()}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Storage Path: ${doc.storage_path}`);
    
    // Try to download
    if (doc.storage_path) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('user-documents')
        .download(doc.storage_path);
      
      if (downloadError) {
        console.log(`  Storage: ❌ MISSING (${downloadError.message || 'Not found'})`);
      } else {
        console.log(`  Storage: ✅ EXISTS (${Math.round(fileData.size / 1024)} KB)`);
      }
    } else {
      console.log(`  Storage: ❌ NO PATH`);
    }
    
    console.log(`  Signed URL: ${doc.signed_url ? '✅' : '❌'}`);
  }

  // Summary
  const missingFiles = [];
  for (const doc of docs) {
    if (doc.storage_path) {
      const { error } = await supabase.storage
        .from('user-documents')
        .download(doc.storage_path);
      if (error) missingFiles.push(doc.document_type);
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         SUMMARY                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`Total images in database: ${docs.length}`);
  console.log(`Missing from Storage: ${missingFiles.length}`);
  
  if (missingFiles.length > 0) {
    console.log('\n❌ MISSING FILES:');
    missingFiles.forEach(type => console.log(`   - ${type}`));
    
    console.log('\n🔍 LIKELY CAUSE:');
    console.log('   Upload to Supabase Storage failed, but database record was created.');
    console.log('   This suggests the file upload step is failing silently.\n');
  } else {
    console.log('\n✅ All files present in Storage!\n');
  }
}

checkLatestSignup().catch(console.error);
