#!/usr/bin/env node

/**
 * Comprehensive Storage Integrity Check
 *
 * Purpose: Diagnose Storage/database mismatches for all user documents
 *
 * This script:
 * 1. Gets ALL user_documents records (no category filter)
 * 2. Checks Storage existence for each
 * 3. Identifies which images have DB records but missing files
 * 4. Analyzes document_category distribution
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseStorageIntegrity() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          COMPREHENSIVE STORAGE INTEGRITY CHECK                 ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
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

    console.log('📋 LATEST USER:\n');
    console.log(`Name: ${user.name} ${user.surname}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.create_user_id}`);
    console.log(`Created: ${new Date(user.created_at).toLocaleString()}\n`);

    // Get ALL documents for this user (NO FILTERS)
    const { data: allDocs, error: allDocsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', user.create_user_id)
      .order('created_at', { ascending: true });

    if (allDocsError) {
      console.log('❌ Error fetching documents:', allDocsError.message);
      return;
    }

    console.log(`📸 FOUND ${allDocs.length} TOTAL RECORDS IN user_documents:\n`);
    console.log('═'.repeat(70) + '\n');

    // Analyze by category
    const byCategory = {};
    allDocs.forEach(doc => {
      const cat = doc.document_category || 'NULL';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(doc);
    });

    console.log('📊 BREAKDOWN BY CATEGORY:\n');
    Object.keys(byCategory).forEach(cat => {
      console.log(`${cat}: ${byCategory[cat].length} records`);
    });
    console.log('\n' + '═'.repeat(70) + '\n');

    // Check each document
    const missingFiles = [];
    const presentFiles = [];

    for (const doc of allDocs) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`📄 ${doc.document_type}`);
      console.log(`${'─'.repeat(70)}`);
      console.log(`ID: ${doc.id}`);
      console.log(`Category: ${doc.document_category || 'NULL'}`);
      console.log(`Status: ${doc.status}`);
      console.log(`Created: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`Storage Path: ${doc.storage_path || 'NULL'}`);
      console.log(`File Size (DB): ${doc.file_size ? Math.round(doc.file_size / 1024) + ' KB' : 'NULL'}`);
      console.log(`\nMetadata Fields:`);
      console.log(`  - public_url: ${doc.public_url ? '✅' : '❌'}`);
      console.log(`  - signed_url: ${doc.signed_url ? '✅' : '❌'}`);
      console.log(`  - signed_url_expires_at: ${doc.signed_url_expires_at ? '✅' : '❌'}`);

      // Check Storage existence
      if (doc.storage_path) {
        console.log(`\n🔍 Checking Storage...`);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('user-documents')
          .download(doc.storage_path);

        if (downloadError) {
          console.log(`❌ STORAGE: MISSING`);
          console.log(`   Error: ${downloadError.message || 'File not found'}`);
          missingFiles.push({
            type: doc.document_type,
            category: doc.document_category,
            path: doc.storage_path,
            dbSize: doc.file_size
          });
        } else {
          console.log(`✅ STORAGE: PRESENT`);
          console.log(`   Actual Size: ${Math.round(fileData.size / 1024)} KB`);
          console.log(`   File Type: ${fileData.type}`);
          presentFiles.push({
            type: doc.document_type,
            category: doc.document_category,
            path: doc.storage_path,
            actualSize: fileData.size,
            dbSize: doc.file_size
          });
        }
      } else {
        console.log(`\n⚠️  STORAGE: NO PATH IN DATABASE`);
      }
    }

    // Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         SUMMARY                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Records: ${allDocs.length}`);
    console.log(`Files Present in Storage: ${presentFiles.length}`);
    console.log(`Files Missing from Storage: ${missingFiles.length}\n`);

    if (missingFiles.length > 0) {
      console.log('❌ MISSING FILES:\n');
      missingFiles.forEach(file => {
        console.log(`   ${file.type}`);
        console.log(`      Category: ${file.category || 'NULL'}`);
        console.log(`      DB Size: ${file.dbSize ? Math.round(file.dbSize / 1024) + ' KB' : 'NULL'}`);
        console.log(`      Path: ${file.path}\n`);
      });
    }

    if (presentFiles.length > 0) {
      console.log('✅ PRESENT FILES:\n');
      presentFiles.forEach(file => {
        console.log(`   ${file.type}`);
        console.log(`      Category: ${file.category || 'NULL'}`);
        console.log(`      Actual Size: ${Math.round(file.actualSize / 1024)} KB`);
        console.log(`      DB Size: ${file.dbSize ? Math.round(file.dbSize / 1024) + ' KB' : 'NULL'}\n`);
      });
    }

    // Root cause analysis
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ROOT CAUSE ANALYSIS                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (missingFiles.length > 0) {
      console.log('🔍 DIAGNOSIS:\n');
      console.log('Database records exist with complete metadata (storage_path, file_size,');
      console.log('signed_url) but the actual files are missing from Supabase Storage.\n');

      console.log('💡 LIKELY CAUSES:\n');
      console.log('1. File upload to Storage failed but database transaction succeeded');
      console.log('2. Upload process isn\'t properly waiting for Storage upload to complete');
      console.log('3. Temporary files aren\'t being moved to permanent storage correctly');
      console.log('4. Storage upload timeout or permission issue\n');

      console.log('🔧 RECOMMENDED ACTIONS:\n');
      console.log('1. Review signup controller upload logic (src/controllers/signup.controller.js)');
      console.log('2. Check server logs for Storage upload errors');
      console.log('3. Verify temp-to-permanent file move in signup submit endpoint');
      console.log('4. Add proper error handling and rollback for failed Storage uploads');
      console.log('5. Consider implementing atomic transactions (DB update only if Storage succeeds)\n');
    } else {
      console.log('✅ All database records have corresponding files in Storage!\n');
    }

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

diagnoseStorageIntegrity().catch(console.error);
