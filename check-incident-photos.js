#!/usr/bin/env node

/**
 * Check Incident Photos - Diagnostic script to investigate incident report photo storage
 *
 * Expected photos per incident:
 * - 5 x other_damage_photo
 * - 5 x vehicle_damage_photo
 * - 3 x scene_photo
 * - 1 x map_screenshot
 * TOTAL: 14 photos per incident
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIncidentPhotos() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           INCIDENT REPORT PHOTO INVESTIGATION                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Get most recent user
    const { data: recentUser, error: userError } = await supabase
      .from('user_signup')
      .select('create_user_id, name, surname, email, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (userError || !recentUser) {
      console.log('❌ No users found');
      return;
    }

    const userId = recentUser.create_user_id;
    console.log('👤 User:', recentUser.name, recentUser.surname);
    console.log('📧 Email:', recentUser.email);
    console.log('🆔 ID:', userId);
    console.log('');

    // ===== 1. CHECK TEMP UPLOADS (Unclaimed) =====
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📦 TEMP UPLOADS (Unclaimed)\n');

    const { data: tempUploads, error: tempError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('claimed', false)
      .order('created_at', { ascending: false });

    if (tempError) {
      console.error('❌ Error fetching temp uploads:', tempError.message);
    } else if (!tempUploads || tempUploads.length === 0) {
      console.log('✅ No unclaimed temp uploads (all processed)\n');
    } else {
      console.log(`⚠️  Found ${tempUploads.length} unclaimed temp uploads:\n`);

      tempUploads.forEach((temp, i) => {
        const hoursOld = (Date.now() - new Date(temp.created_at).getTime()) / (1000 * 60 * 60);
        console.log(`${i + 1}. Session: ${temp.session_id}`);
        console.log(`   Path: ${temp.storage_path}`);
        console.log(`   Size: ${Math.round(temp.file_size / 1024)} KB`);
        console.log(`   Type: ${temp.mime_type}`);
        console.log(`   Age: ${hoursOld.toFixed(1)} hours`);
        console.log(`   Status: ${hoursOld > 24 ? '⚠️ EXPIRED (>24h)' : '✅ Valid'}`);
        console.log('');
      });
    }

    // ===== 2. CHECK USER DOCUMENTS (All incident photos) =====
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📸 USER DOCUMENTS (Incident Photos)\n');

    const { data: documents, error: docsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .eq('document_category', 'incident_report')
      .order('created_at', { ascending: true });

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError.message);
    } else if (!documents || documents.length === 0) {
      console.log('⚠️  NO incident photos found in user_documents');
      console.log('   This means incident photos are NOT being persisted!\n');
    } else {
      console.log(`Found ${documents.length} incident photos in user_documents:\n`);

      // Group by document type
      const byType = {};
      documents.forEach(doc => {
        const type = doc.document_type;
        if (!byType[type]) byType[type] = [];
        byType[type].push(doc);
      });

      Object.keys(byType).forEach(type => {
        const docs = byType[type];
        console.log(`${type}: ${docs.length} photos`);
        docs.forEach((doc, i) => {
          console.log(`  ${i + 1}. ${doc.storage_path || 'NO PATH'}`);
          console.log(`     Status: ${doc.status}`);
          console.log(`     signed_url: ${doc.signed_url ? '✅' : '❌'}`);
          console.log(`     Storage: ${doc.storage_path?.includes('temp/') ? '⚠️ TEMP' : '✅ Permanent'}`);
        });
        console.log('');
      });
    }

    // ===== 3. CHECK INCIDENT REPORTS TABLE =====
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📋 INCIDENT REPORTS\n');

    const { data: incidents, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, created_at, accident_date')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false });

    if (incidentError) {
      console.error('❌ Error fetching incidents:', incidentError.message);
    } else if (!incidents || incidents.length === 0) {
      console.log('⚠️  No incident reports found for this user\n');
    } else {
      console.log(`Found ${incidents.length} incident report(s):\n`);
      incidents.forEach((inc, i) => {
        console.log(`${i + 1}. Report ID: ${inc.id}`);
        console.log(`   Created: ${new Date(inc.created_at).toLocaleString()}`);
        console.log(`   Accident Date: ${inc.accident_date || 'N/A'}`);
        console.log('');
      });
    }

    // ===== 4. SUMMARY & DIAGNOSIS =====
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      DIAGNOSIS & SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const expectedIncidentPhotos = 14; // 5 other_damage + 5 vehicle_damage + 3 scene + 1 map
    const actualIncidentPhotos = documents ? documents.length : 0;
    const unclaimedTemp = tempUploads ? tempUploads.length : 0;

    console.log('Expected Photos Per Incident:');
    console.log('  - other_damage_photo: 5');
    console.log('  - vehicle_damage_photo: 5');
    console.log('  - scene_photo: 3');
    console.log('  - map_screenshot: 1');
    console.log(`  TOTAL: ${expectedIncidentPhotos}\n`);

    console.log('Actual Status:');
    console.log(`  - Found in user_documents: ${actualIncidentPhotos}`);
    console.log(`  - Unclaimed in temp_uploads: ${unclaimedTemp}\n`);

    if (actualIncidentPhotos === 0 && unclaimedTemp > 0) {
      console.log('🚨 PROBLEM IDENTIFIED:');
      console.log('   Photos uploaded to temp storage but NOT moved to permanent!');
      console.log('   This means the incident report submission is NOT processing photos.\n');
      console.log('💡 SOLUTION NEEDED:');
      console.log('   1. Find incident report submission controller');
      console.log('   2. Add logic to move temp photos to permanent storage');
      console.log('   3. Generate signed URLs for each photo');
      console.log('   4. Create user_documents records\n');
    } else if (actualIncidentPhotos > 0 && actualIncidentPhotos < expectedIncidentPhotos) {
      console.log('⚠️  PARTIAL ISSUE:');
      console.log(`   Only ${actualIncidentPhotos} of ${expectedIncidentPhotos} expected photos found.`);
      console.log('   Some photos may not be uploading correctly.\n');
    } else if (actualIncidentPhotos >= expectedIncidentPhotos) {
      console.log('✅ All expected photos found!');

      // Check for temp paths or missing signed URLs
      const inTemp = documents.filter(d => d.storage_path?.includes('temp/')).length;
      const missingUrls = documents.filter(d => !d.signed_url).length;

      if (inTemp > 0) {
        console.log(`   ⚠️  ${inTemp} photos still in temp storage (should be permanent)`);
      }
      if (missingUrls > 0) {
        console.log(`   ⚠️  ${missingUrls} photos missing signed URLs`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkIncidentPhotos().catch(console.error);
