#!/usr/bin/env node

/**
 * Verify Authorization Bypass Vulnerability
 *
 * Demonstrates the security vulnerability where Sarah can trigger
 * Ian's PDF generation by passing Ian's userId in the request body.
 *
 * VULNERABILITY: incidentForm.controller.js line 985
 *   const userId = req.user?.id || req.body.userId;
 *
 * This accepts userId from unauthenticated request body, allowing
 * any user to generate PDFs for any other user.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test user IDs from the incident
const IAN_USER_ID = '94d80b2d-e77c-4b90-b3ad-544a20a13571';
const SARAH_USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';

async function verifyVulnerability() {
  console.log('🔍 Authorization Bypass Vulnerability Analysis');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Verify both users exist
    console.log('Step 1: Verifying test users exist...\n');

    const { data: ianData, error: ianError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname')
      .eq('create_user_id', IAN_USER_ID)
      .single();

    if (ianError) {
      console.error('❌ Error fetching Ian:', ianError.message);
      process.exit(1);
    }

    const { data: sarahData, error: sarahError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, surname')
      .eq('create_user_id', SARAH_USER_ID)
      .single();

    if (sarahError) {
      console.error('❌ Error fetching Sarah:', sarahError.message);
      process.exit(1);
    }

    console.log('✅ Ian Ring:', ianData.email);
    console.log('✅ Sarah Gilbert:', sarahData.email);
    console.log('');

    // Step 2: Check incident reports
    console.log('Step 2: Checking incident reports isolation...\n');

    const { data: ianIncidents, error: ianIncError } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, accident_date, created_at')
      .eq('create_user_id', IAN_USER_ID);

    const { data: sarahIncidents, error: sarahIncError } = await supabase
      .from('incident_reports')
      .select('id, create_user_id, accident_date, created_at')
      .eq('create_user_id', SARAH_USER_ID);

    console.log(`📋 Ian's incidents: ${ianIncidents?.length || 0}`);
    if (ianIncidents && ianIncidents.length > 0) {
      console.log(`   Most recent: ${ianIncidents[0].id}`);
    }

    console.log(`📋 Sarah's incidents: ${sarahIncidents?.length || 0}`);
    if (sarahIncidents && sarahIncidents.length > 0) {
      console.log(`   Most recent: ${sarahIncidents[0].id}`);
    }
    console.log('');

    // Step 3: Demonstrate the vulnerability
    console.log('Step 3: Demonstrating the vulnerability...\n');

    console.log('🔴 VULNERABLE CODE (incidentForm.controller.js:985):');
    console.log('   const userId = req.user?.id || req.body.userId;\n');

    console.log('⚠️  Attack Scenario:');
    console.log('   Sarah authenticates as herself');
    console.log('   Sarah submits declaration with malicious payload:\n');
    console.log('   POST /api/incident-reports/declaration');
    console.log('   Authorization: Bearer <sarah_token>');
    console.log('   Body: {');
    console.log(`     "userId": "${IAN_USER_ID}",  // Ian's ID!`);
    console.log('     "consentGiven": true,');
    console.log('     "consentTimestamp": "2025-12-28T14:35:00Z"');
    console.log('   }\n');

    console.log('💥 Result:');
    console.log(`   1. Line 985 accepts Ian's userId from request body`);
    console.log(`   2. Line 1095 calls generateUserPDF("${IAN_USER_ID}", ...)`);
    console.log(`   3. fetchAllData() retrieves Ian's data`);
    console.log(`   4. sendEmails() sends Ian's PDF to ${ianData.email}`);
    console.log('   5. Ian receives unexpected PDF email\n');

    // Step 4: Check PDF generation history
    console.log('Step 4: Checking PDF generation history...\n');

    const { data: allPdfs, error: pdfError } = await supabase
      .from('completed_incident_forms')
      .select('id, create_user_id, user_email, email_sent, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (allPdfs) {
      const ianPdfs = allPdfs.filter(p => p.create_user_id === IAN_USER_ID);
      const sarahPdfs = allPdfs.filter(p => p.create_user_id === SARAH_USER_ID);

      console.log(`📄 Total PDFs generated: ${allPdfs.length}`);
      console.log(`   Ian's PDFs: ${ianPdfs.length}`);
      console.log(`   Sarah's PDFs: ${sarahPdfs.length}`);

      const emailsSent = allPdfs.filter(p => p.email_sent === 'Yes').length;
      const emailsNotSent = allPdfs.filter(p => p.email_sent === 'No' || !p.email_sent).length;

      console.log(`\n📧 Email Status:`);
      console.log(`   Sent: ${emailsSent}`);
      console.log(`   Not sent: ${emailsNotSent}`);

      if (emailsNotSent === allPdfs.length) {
        console.log(`\n⚠️  WARNING: All PDFs show email_sent: No`);
        console.log(`   This suggests either:`);
        console.log(`   - Email tracking is broken`);
        console.log(`   - Emails sent through different mechanism`);
        console.log(`   - Database update after email send is failing`);
      }
    }
    console.log('');

    // Step 5: Security Impact Assessment
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔐 Security Impact Assessment');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Vulnerability Type: Authorization Bypass / Server-Side Request Forgery\n');

    console.log('Severity: HIGH / CRITICAL\n');

    console.log('Impact:');
    console.log('  ✗ Cross-user data access (any user can access any user\'s data)');
    console.log('  ✗ Privacy violation (unauthorized PDF generation)');
    console.log('  ✗ Spam/harassment (can trigger unwanted emails to users)');
    console.log('  ✗ Email address discovery (can enumerate users)');
    console.log('  ✗ GDPR Article 32 violation (inadequate security measures)');
    console.log('  ✗ Potential data breach notification required\n');

    console.log('Exploitability: EASY');
    console.log('  - No special privileges required');
    console.log('  - Any authenticated user can exploit');
    console.log('  - Simple request body manipulation');
    console.log('  - No rate limiting observed\n');

    console.log('Affected Endpoints:');
    console.log('  - POST /api/incident-reports/declaration\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔧 Recommended Fix');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('File: src/controllers/incidentForm.controller.js\n');

    console.log('BEFORE (line 985):');
    console.log('  const userId = req.user?.id || req.body.userId;\n');

    console.log('AFTER:');
    console.log('  const userId = req.user?.id;\n');
    console.log('  if (!userId) {');
    console.log('    logger.warn(\'Declaration submission without valid authentication\');');
    console.log('    return res.status(401).json({');
    console.log('      success: false,');
    console.log('      error: \'Authentication required\'');
    console.log('    });');
    console.log('  }\n');
    console.log('  // Validate no userId spoofing');
    console.log('  if (req.body.userId && req.body.userId !== userId) {');
    console.log('    logger.error(\'Authorization bypass attempt\', {');
    console.log('      authenticatedUser: userId,');
    console.log('      requestedUser: req.body.userId,');
    console.log('      ip: req.ip');
    console.log('    });');
    console.log('    return res.status(403).json({');
    console.log('      success: false,');
    console.log('      error: \'Forbidden: Cannot submit for another user\'');
    console.log('    });');
    console.log('  }\n');

    console.log('Additional Recommendations:');
    console.log('  1. Audit all endpoints for similar req.body.userId patterns');
    console.log('  2. Implement RBAC validation middleware');
    console.log('  3. Add audit logging for all PDF generation requests');
    console.log('  4. Review logs for evidence of exploitation');
    console.log('  5. Consider GDPR breach notification if exploited\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

verifyVulnerability();
