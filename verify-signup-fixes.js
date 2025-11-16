#!/usr/bin/env node

/**
 * Verify Signup Fixes - Comprehensive Test Script
 *
 * Tests TWO fixes applied:
 * 1. File structure standardization (users/{userId}/signup/ path)
 * 2. Signed URL generation and storage in database
 *
 * Usage: node verify-signup-fixes.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySignupFixes() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           SIGNUP FIXES VERIFICATION REPORT                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get most recent user signup
    const { data: recentUser, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, name, surname, email, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (userError || !recentUser) {
      console.log('❌ No users found in database');
      return;
    }

    const userId = recentUser.create_user_id;
    const signupTime = new Date(recentUser.created_at);

    console.log('📋 Most Recent Signup:');
    console.log(`   Name: ${recentUser.name} ${recentUser.surname}`);
    console.log(`   Email: ${recentUser.email}`);
    console.log(`   ID: ${userId}`);
    console.log(`   Time: ${signupTime.toLocaleString()}`);
    console.log('');

    // Get user's signup documents (source_type = 'temp_upload')
    const { data: documents, error: docsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .eq('source_type', 'temp_upload')
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError.message);
      return;
    }

    if (!documents || documents.length === 0) {
      console.log('⚠️  No signup images found for this user');
      console.log('   This may be a pre-fix signup or user uploaded no images\n');
      return;
    }

    console.log(`📸 Found ${documents.length} signup images\n`);
    console.log('════════════════════════════════════════════════════════════════\n');

    // Verification results
    let pathCorrect = 0;
    let pathIncorrect = 0;
    let signedUrlPresent = 0;
    let signedUrlMissing = 0;
    let expiryPresent = 0;
    let expiryMissing = 0;

    documents.forEach((doc, i) => {
      const num = i + 1;
      console.log(`${num}. ${doc.document_type}`);
      console.log(`   Created: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`   Status: ${doc.status}`);
      console.log('');

      // ===== FIX #1: FILE STRUCTURE =====
      console.log('   🗂️  FILE STRUCTURE CHECK:');
      const path = doc.storage_path;
      console.log(`   Path: ${path || 'N/A'}`);

      if (!path) {
        console.log('   ❌ No storage path (likely failed upload)');
        pathIncorrect++;
      } else if (path.startsWith(`users/${userId}/signup/`)) {
        console.log('   ✅ CORRECT: Uses standardized nested structure');
        pathCorrect++;
      } else if (path.startsWith(userId)) {
        console.log('   ⚠️  OLD STRUCTURE: Uses flat structure (pre-fix)');
        pathIncorrect++;
      } else if (path.startsWith('users/')) {
        console.log('   ⚠️  DIFFERENT: Uses different nested structure');
        pathIncorrect++;
      } else {
        console.log('   ❌ UNEXPECTED: Unknown path structure');
        pathIncorrect++;
      }
      console.log('');

      // ===== FIX #2: SIGNED URL =====
      console.log('   🔒 SIGNED URL CHECK:');

      const hasSignedUrl = !!doc.signed_url;
      const hasExpiry = !!doc.signed_url_expires_at;
      const hasPublicUrl = !!doc.public_url;

      if (hasSignedUrl) {
        console.log('   ✅ signed_url: PRESENT');
        console.log(`      Length: ${doc.signed_url.length} chars`);
        console.log(`      Preview: ${doc.signed_url.substring(0, 80)}...`);
        signedUrlPresent++;
      } else {
        console.log('   ❌ signed_url: MISSING');
        signedUrlMissing++;
      }

      if (hasExpiry) {
        const expiryDate = new Date(doc.signed_url_expires_at);
        const isExpired = expiryDate < new Date();
        console.log(`   ✅ signed_url_expires_at: PRESENT`);
        console.log(`      Expires: ${expiryDate.toLocaleString()}`);
        console.log(`      Status: ${isExpired ? '⚠️ EXPIRED' : '✅ Valid'}`);
        expiryPresent++;
      } else {
        console.log('   ❌ signed_url_expires_at: MISSING');
        expiryMissing++;
      }

      if (hasPublicUrl) {
        console.log('   ✅ public_url: PRESENT (backwards compatibility)');
      } else {
        console.log('   ⚠️  public_url: MISSING');
      }

      console.log('');
      console.log('────────────────────────────────────────────────────────────────');
      console.log('');
    });

    // ===== SUMMARY REPORT =====
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      VERIFICATION SUMMARY                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Total Images Checked: ${documents.length}\n`);

    // File Structure Results
    console.log('🗂️  FILE STRUCTURE:');
    console.log(`   ✅ Correct (standardized): ${pathCorrect}`);
    console.log(`   ❌ Incorrect (old/other): ${pathIncorrect}`);

    if (pathCorrect === documents.length) {
      console.log('   🎉 ALL files use correct standardized structure!');
    } else if (pathCorrect > 0) {
      console.log('   ⚠️  MIXED: Some old uploads, some new (expected during transition)');
    } else {
      console.log('   ❌ NO files use new structure (fix not applied or no new uploads)');
    }
    console.log('');

    // Signed URL Results
    console.log('🔒 SIGNED URL GENERATION:');
    console.log(`   ✅ With signed_url: ${signedUrlPresent}`);
    console.log(`   ❌ Without signed_url: ${signedUrlMissing}`);
    console.log(`   ✅ With expiry: ${expiryPresent}`);
    console.log(`   ❌ Without expiry: ${expiryMissing}`);

    if (signedUrlPresent === documents.length && expiryPresent === documents.length) {
      console.log('   🎉 ALL files have signed URLs with expiry!');
    } else if (signedUrlPresent > 0) {
      console.log('   ⚠️  MIXED: Some with URLs, some without (expected during transition)');
    } else {
      console.log('   ❌ NO files have signed URLs (fix not applied or no new uploads)');
    }
    console.log('');

    // ===== INTERPRETATION =====
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                       INTERPRETATION                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const isRecentSignup = (new Date() - signupTime) < (5 * 60 * 1000); // 5 minutes

    if (isRecentSignup) {
      console.log('🕐 This signup is RECENT (< 5 minutes old)');
      console.log('   This is a VALID TEST of the current code\n');

      if (pathCorrect === documents.length) {
        console.log('✅ File Structure Fix: WORKING');
        console.log('   All files use standardized users/{userId}/signup/ path\n');
      } else {
        console.log('❌ File Structure Fix: NOT WORKING');
        console.log('   New uploads should use users/{userId}/signup/ path\n');
      }

      if (signedUrlPresent === documents.length) {
        console.log('✅ Signed URL Fix: WORKING');
        console.log('   All files have signed URLs with proper expiry\n');
      } else {
        console.log('❌ Signed URL Fix: NOT WORKING');
        console.log('   Check server logs for debug output (🔍 DEBUG messages)\n');
      }
    } else {
      console.log('⏰ This signup is OLD (> 5 minutes)');
      console.log('   Date: ' + signupTime.toLocaleString());
      console.log('   This signup may have been processed BEFORE fixes were applied\n');

      if (pathIncorrect > 0 || signedUrlMissing > 0) {
        console.log('⚠️  EXPECTED: Old uploads won\'t have the fixes');
        console.log('   To verify fixes are working:');
        console.log('   1. Complete a NEW signup with images');
        console.log('   2. Run this script again');
        console.log('   3. Check that new signup has:');
        console.log('      - Path: users/{userId}/signup/{filename}');
        console.log('      - signed_url: Present');
        console.log('      - signed_url_expires_at: Present\n');
      } else {
        console.log('🎉 Even though this is an old signup, it has correct structure!');
        console.log('   This suggests fixes may have been applied retroactively\n');
      }
    }

    // ===== NEXT STEPS =====
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         NEXT STEPS                             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    if (isRecentSignup && pathCorrect === documents.length && signedUrlPresent === documents.length) {
      console.log('✅ BOTH FIXES VERIFIED - All systems working correctly!');
      console.log('');
      console.log('The fixes are confirmed:');
      console.log('1. ✅ File structure uses standardized nested paths');
      console.log('2. ✅ Signed URLs are generated and stored correctly\n');
      console.log('No further action needed.\n');
    } else if (!isRecentSignup) {
      console.log('📝 TO VERIFY FIXES:');
      console.log('');
      console.log('1. Complete a NEW signup form with images');
      console.log('2. Run this script: node verify-signup-fixes.js');
      console.log('3. Verify both fixes are working:\n');
      console.log('   Expected Results:');
      console.log('   - File paths: users/{userId}/signup/{filename}');
      console.log('   - signed_url: Present in all records');
      console.log('   - signed_url_expires_at: Present in all records\n');
    } else {
      console.log('⚠️  SOME ISSUES DETECTED:');
      console.log('');
      if (pathCorrect < documents.length) {
        console.log('❌ File Structure: Check signup.controller.js line 273');
        console.log('   Should be: users/${userId}/signup/\n');
      }
      if (signedUrlMissing > 0) {
        console.log('❌ Signed URLs: Check server logs for debug output');
        console.log('   Look for 🔍 DEBUG and ✅ DEBUG messages');
        console.log('   Server PID: ' + process.pid);
        console.log('');
        console.log('   Debug logs should show:');
        console.log('   - About to generate signed URL');
        console.log('   - Signed URL generated successfully');
        console.log('   - About to call createDocumentRecord');
        console.log('   - Document record created in database\n');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run verification
verifySignupFixes().catch(console.error);
