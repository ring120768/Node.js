#!/usr/bin/env node
/**
 * Check Dashboard Data
 * Diagnose why dashboard shows empty content
 * Tests all data sources that dashboard relies on
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '199d9251-b2e0-40a5-80bf-fc1529d9bf6c'; // From dashboard.html hardcoded

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

async function checkDashboardData() {
  console.log(colors.cyan, '\n🔍 Dashboard Data Diagnostic\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    // 1. Check user_signup record
    console.log(colors.cyan, '1️⃣  Checking user_signup table...');
    const { data: userSignup, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', TEST_USER_ID)
      .single();

    if (userError || !userSignup) {
      console.log(colors.red, '   ❌ User not found in user_signup table');
      console.log(colors.dim, `   Error: ${userError?.message || 'No data'}\n`);
    } else {
      console.log(colors.green, '   ✅ User found:', userSignup.email);
      console.log(colors.dim, `   Name: ${userSignup.name} ${userSignup.surname}`);
      console.log(colors.dim, `   Created: ${userSignup.created_at}\n`);
    }

    // 2. Check user_documents table
    console.log(colors.cyan, '2️⃣  Checking user_documents table...');
    const { data: documents, error: docsError, count } = await supabase
      .from('user_documents')
      .select('*', { count: 'exact' })
      .eq('create_user_id', TEST_USER_ID)
      .is('deleted_at', null);

    if (docsError) {
      console.log(colors.red, '   ❌ Error fetching documents:', docsError.message);
    } else {
      console.log(colors.green, `   ✅ Found ${count} documents`);
      if (count > 0) {
        console.log(colors.dim, '\n   Documents:');
        documents.forEach((doc, i) => {
          console.log(colors.dim, `   ${i + 1}. ${doc.document_type} - ${doc.status}`);
          console.log(colors.dim, `      Storage: ${doc.storage_path}`);
          console.log(colors.dim, `      URL: ${doc.public_url ? 'Yes' : 'No'}`);
        });
      } else {
        console.log(colors.yellow, '   ⚠️  No documents found for this user');
        console.log(colors.dim, '   This explains why dashboard shows zero content\n');
      }
    }

    // 3. Check incident_reports table
    console.log(colors.cyan, '\n3️⃣  Checking incident_reports table...');
    const { data: incidents, error: incidentsError, count: incidentsCount } = await supabase
      .from('incident_reports')
      .select('*', { count: 'exact' })
      .eq('create_user_id', TEST_USER_ID);

    if (incidentsError) {
      console.log(colors.red, '   ❌ Error:', incidentsError.message);
    } else {
      console.log(colors.green, `   ✅ Found ${incidentsCount} incident reports`);
      if (incidentsCount > 0) {
        console.log(colors.dim, `   Created: ${incidents[0].created_at}`);
      } else {
        console.log(colors.yellow, '   ⚠️  No incident reports found');
      }
    }

    // 4. Check ai_transcription table
    console.log(colors.cyan, '\n4️⃣  Checking ai_transcription table...');
    const { data: transcriptions, error: transError, count: transCount } = await supabase
      .from('ai_transcription')
      .select('*', { count: 'exact' })
      .eq('create_user_id', TEST_USER_ID);

    if (transError) {
      console.log(colors.red, '   ❌ Error:', transError.message);
    } else {
      console.log(colors.green, `   ✅ Found ${transCount} transcriptions`);
      if (transCount === 0) {
        console.log(colors.yellow, '   ⚠️  No transcriptions found');
      }
    }

    // 5. Check completed_incident_forms table
    console.log(colors.cyan, '\n5️⃣  Checking completed_incident_forms table...');
    const { data: pdfs, error: pdfsError, count: pdfsCount } = await supabase
      .from('completed_incident_forms')
      .select('*', { count: 'exact' })
      .eq('create_user_id', TEST_USER_ID);

    if (pdfsError) {
      console.log(colors.red, '   ❌ Error:', pdfsError.message);
    } else {
      console.log(colors.green, `   ✅ Found ${pdfsCount} completed PDF forms`);
      if (pdfsCount === 0) {
        console.log(colors.yellow, '   ⚠️  No PDFs generated yet');
      }
    }

    // 6. Find users who DO have documents
    console.log(colors.cyan, '\n6️⃣  Finding users WITH documents...');
    const { data: usersWithDocs, error: usersError } = await supabase
      .from('user_documents')
      .select('create_user_id')
      .is('deleted_at', null)
      .limit(5);

    if (usersError) {
      console.log(colors.red, '   ❌ Error:', usersError.message);
    } else if (usersWithDocs.length === 0) {
      console.log(colors.yellow, '   ⚠️  NO users have any documents in the system');
      console.log(colors.dim, '   Database may have been wiped or temp uploads not moved\n');
    } else {
      const uniqueUsers = [...new Set(usersWithDocs.map(d => d.create_user_id))];
      console.log(colors.green, `   ✅ Found ${uniqueUsers.length} users with documents:`);

      // Get details for each user
      for (const userId of uniqueUsers) {
        const { data: user } = await supabase
          .from('user_signup')
          .select('email, name, surname')
          .eq('create_user_id', userId)
          .single();

        const { count: docCount } = await supabase
          .from('user_documents')
          .select('*', { count: 'exact' })
          .eq('create_user_id', userId)
          .is('deleted_at', null);

        console.log(colors.dim, `   • ${userId}`);
        if (user) {
          console.log(colors.dim, `     ${user.email} (${docCount} docs)`);
        } else {
          console.log(colors.dim, `     Unknown user (${docCount} docs)`);
        }
      }
    }

    // 7. Summary and Recommendations
    console.log(colors.cyan, '\n📊 Summary and Recommendations\n');

    if (count === 0) {
      console.log(colors.yellow, '⚠️  ROOT CAUSE: No documents in user_documents table for test user');
      console.log(colors.dim, '\nPossible reasons:');
      console.log(colors.dim, '1. User completed signup but images are still in temp_uploads');
      console.log(colors.dim, '2. Image processing failed during signup');
      console.log(colors.dim, '3. User is using wrong test user ID');
      console.log(colors.dim, '4. Database was wiped or migrated\n');

      console.log(colors.cyan, '💡 Solutions:');
      console.log(colors.dim, '1. Use a user ID that actually has documents');
      console.log(colors.dim, '2. Complete a test signup to generate documents');
      console.log(colors.dim, '3. Check temp_uploads table for pending uploads');
      console.log(colors.dim, '4. Run image processing scripts to move temp files\n');
    } else {
      console.log(colors.green, '✅ User has documents - dashboard should display them');
      console.log(colors.dim, '\nIf dashboard still shows empty:');
      console.log(colors.dim, '1. Check browser console for JavaScript errors');
      console.log(colors.dim, '2. Verify API endpoint is being called correctly');
      console.log(colors.dim, '3. Check network tab for failed API requests');
      console.log(colors.dim, '4. Try refreshing signed URLs for expired images\n');
    }

  } catch (error) {
    console.log(colors.red, '\n❌ Fatal error:', error.message);
    console.log(colors.dim, error.stack);
  }
}

checkDashboardData().catch(console.error);
