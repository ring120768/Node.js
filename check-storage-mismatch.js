#!/usr/bin/env node

/**
 * Check Storage Mismatch - Investigate missing vehicle_driver_side_image
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMismatch() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          STORAGE MISMATCH INVESTIGATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get the vehicle_driver_side_image record
    const { data: doc, error: docError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('document_type', 'vehicle_driver_side_image')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (docError || !doc) {
      console.log('❌ No vehicle_driver_side_image found in database');
      return;
    }

    console.log('📋 DATABASE RECORD:\n');
    console.log(`ID: ${doc.id}`);
    console.log(`User ID: ${doc.create_user_id}`);
    console.log(`Document Type: ${doc.document_type}`);
    console.log(`Status: ${doc.status}`);
    console.log(`Storage Path: ${doc.storage_path}`);
    console.log(`File Size: ${doc.file_size ? Math.round(doc.file_size / 1024) + ' KB' : 'N/A'}`);
    console.log(`Created: ${new Date(doc.created_at).toLocaleString()}`);
    console.log(`\nURL Fields:`);
    console.log(`- public_url: ${doc.public_url ? '✅ Present' : '❌ Missing'}`);
    console.log(`- signed_url: ${doc.signed_url ? '✅ Present' : '❌ Missing'}`);
    console.log(`- signed_url_expires_at: ${doc.signed_url_expires_at ? '✅ Present' : '❌ Missing'}`);

    // Try to check if file exists in Storage
    console.log('\n\n🔍 CHECKING STORAGE...\n');

    if (!doc.storage_path) {
      console.log('❌ No storage path in database record!');
      return;
    }

    // Try to get file metadata
    const { data: fileList, error: listError } = await supabase.storage
      .from('user-documents')
      .list(doc.storage_path.split('/').slice(0, -1).join('/'));

    if (listError) {
      console.log('❌ Error listing storage folder:', listError.message);
    } else {
      const fileName = doc.storage_path.split('/').pop();
      const fileExists = fileList.some(f => f.name === fileName);
      
      console.log(`Storage Path: ${doc.storage_path}`);
      console.log(`Folder Contents (${fileList.length} files):`);
      fileList.forEach(f => {
        const isTarget = f.name === fileName;
        console.log(`  ${isTarget ? '🎯' : '  '} ${f.name} (${Math.round(f.metadata?.size / 1024 || 0)} KB)`);
      });
      
      if (fileExists) {
        console.log('\n✅ File EXISTS in Storage!');
      } else {
        console.log('\n❌ File NOT FOUND in Storage!');
        console.log(`   Expected: ${fileName}`);
      }
    }

    // Try to download the file
    console.log('\n\n🔍 TESTING FILE DOWNLOAD...\n');

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('user-documents')
      .download(doc.storage_path);

    if (downloadError) {
      console.log('❌ Download failed:', downloadError.message);
      console.log('\n🔍 DIAGNOSIS:');
      console.log('   The database record exists but the actual file is missing from Storage.');
      console.log('   This could mean:');
      console.log('   1. File upload failed but database was updated');
      console.log('   2. File was manually deleted from Storage');
      console.log('   3. Path mismatch between database and Storage');
    } else {
      console.log('✅ File downloaded successfully!');
      console.log(`   Size: ${Math.round(downloadData.size / 1024)} KB`);
      console.log(`   Type: ${downloadData.type}`);
      console.log('\n💡 File exists in Storage but may not be visible in UI.');
    }

    // Check all vehicle images for this user
    console.log('\n\n📸 ALL VEHICLE IMAGES FOR THIS USER:\n');

    const { data: allDocs, error: allDocsError } = await supabase
      .from('user_documents')
      .select('document_type, storage_path, status, file_size')
      .eq('create_user_id', doc.create_user_id)
      .eq('document_category', 'signup')
      .order('created_at', { ascending: true });

    if (allDocsError) {
      console.log('❌ Error fetching all documents:', allDocsError.message);
    } else {
      for (const d of allDocs) {
        const fileName = d.storage_path?.split('/').pop() || 'N/A';
        console.log(`\n${d.document_type}:`);
        console.log(`  Status: ${d.status}`);
        console.log(`  File: ${fileName}`);
        console.log(`  Size: ${d.file_size ? Math.round(d.file_size / 1024) + ' KB' : 'N/A'}`);
        
        // Quick check if file exists
        if (d.storage_path) {
          const { error: checkError } = await supabase.storage
            .from('user-documents')
            .download(d.storage_path);
          
          console.log(`  Storage: ${checkError ? '❌ Missing' : '✅ Present'}`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

checkMismatch().catch(console.error);
