#!/usr/bin/env node

/**
 * Incident Investigation: PDF Delivery Failure (30/12/2024)
 *
 * USER REPORT:
 * - 2 emails received (PDF processing + images)
 * - NO final PDF report email received
 * - NO admin notifications sent
 *
 * INVESTIGATION CHECKLIST:
 * 1. Find the incident from 30/12
 * 2. Check completed_incident_forms for PDF generation
 * 3. Check user_documents for image processing
 * 4. Look for errors in database
 * 5. Check email sending status
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SARAH_USER_ID = '30d82d89-42d5-406a-9b7d-83345d972f61';

async function investigatePdfFailure() {
  console.log('🔍 INVESTIGATING PDF DELIVERY FAILURE\n');
  console.log(`User: ${SARAH_USER_ID}`);
  console.log(`Date: 30/12/2024\n`);

  try {
    // ========================================
    // 1. FIND THE INCIDENT
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 1: Find Incident from 30/12');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: incidents, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .or(`auth_user_id.eq.${SARAH_USER_ID},create_user_id.eq.${SARAH_USER_ID},user_id.eq.${SARAH_USER_ID}`)
      .order('created_at', { ascending: false });

    if (incidentError) {
      console.error('❌ Error fetching incidents:', incidentError.message);
      return;
    }

    console.log(`Found ${incidents?.length || 0} incident(s):\n`);

    if (incidents && incidents.length > 0) {
      incidents.forEach((inc, i) => {
        const createdDate = new Date(inc.created_at);
        console.log(`${i + 1}. Incident ID: ${inc.id}`);
        console.log(`   Created: ${createdDate.toLocaleString('en-GB')}`);
        console.log(`   Accident Date: ${inc.accident_date || 'N/A'}`);
        console.log(`   Status: ${inc.status || 'N/A'}`);
        console.log(`   Deleted: ${inc.deleted_at ? 'YES' : 'NO'}`);
        console.log('');
      });
    }

    const latestIncident = incidents?.[0];
    if (!latestIncident) {
      console.log('⚠️  No incidents found for this user\n');
      return;
    }

    const incidentId = latestIncident.id;
    console.log(`🎯 Investigating incident: ${incidentId}\n`);

    // ========================================
    // 2. CHECK PDF GENERATION RECORDS
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📄 STEP 2: Check PDF Generation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: pdfRecords, error: pdfError } = await supabase
      .from('completed_incident_forms')
      .select('*')
      .eq('create_user_id', SARAH_USER_ID)
      .order('created_at', { ascending: false });

    if (pdfError) {
      console.error('❌ Error fetching PDF records:', pdfError.message);
    } else {
      console.log(`Found ${pdfRecords?.length || 0} PDF record(s):\n`);

      if (pdfRecords && pdfRecords.length > 0) {
        pdfRecords.forEach((pdf, i) => {
          const createdDate = new Date(pdf.created_at);
          console.log(`${i + 1}. PDF ID: ${pdf.id}`);
          console.log(`   Incident ID: ${pdf.incident_id || 'N/A'}`);
          console.log(`   Created: ${createdDate.toLocaleString('en-GB')}`);
          console.log(`   Storage Path: ${pdf.storage_path || 'N/A'}`);
          console.log(`   Email Sent: ${pdf.email_sent ? '✅ YES' : '❌ NO'}`);
          console.log(`   Email Sent At: ${pdf.email_sent_at || 'N/A'}`);
          console.log(`   Error: ${pdf.error_message || 'None'}`);
          console.log('');
        });

        // Check if PDF for this incident exists
        const incidentPdf = pdfRecords.find(p => p.incident_id === incidentId);
        if (incidentPdf) {
          console.log(`✅ PDF exists for incident ${incidentId}`);
          console.log(`   Email sent: ${incidentPdf.email_sent ? 'YES' : 'NO'}`);
          console.log('');
        } else {
          console.log(`❌ NO PDF record found for incident ${incidentId}\n`);
        }
      } else {
        console.log('⚠️  No PDF records found\n');
      }
    }

    // ========================================
    // 3. CHECK IMAGE PROCESSING
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🖼️  STEP 3: Check Image Processing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: documents, error: docsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', SARAH_USER_ID)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError.message);
    } else {
      console.log(`Found ${documents?.length || 0} document(s):\n`);

      if (documents && documents.length > 0) {
        const statusCounts = documents.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {});

        console.log('Status breakdown:');
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count}`);
        });
        console.log('');

        // Show recent documents
        console.log('Recent documents:');
        documents.slice(0, 5).forEach((doc, i) => {
          const createdDate = new Date(doc.created_at);
          console.log(`${i + 1}. Document ID: ${doc.id}`);
          console.log(`   Type: ${doc.document_type}`);
          console.log(`   Status: ${doc.status}`);
          console.log(`   Created: ${createdDate.toLocaleString('en-GB')}`);
          console.log(`   Storage Path: ${doc.storage_path || 'N/A'}`);
          console.log(`   Processing Error: ${doc.processing_error || 'None'}`);
          console.log(`   Retry Count: ${doc.retry_count || 0}`);
          console.log('');
        });

        // Check for failed processing
        const failed = documents.filter(d => d.status === 'failed');
        if (failed.length > 0) {
          console.log(`⚠️  ${failed.length} document(s) failed processing:`);
          failed.forEach(doc => {
            console.log(`   - ${doc.id}: ${doc.processing_error || 'Unknown error'}`);
          });
          console.log('');
        }
      }
    }

    // ========================================
    // 4. CHECK WITNESSES & VEHICLES
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 STEP 4: Check Related Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: witnesses } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('incident_report_id', incidentId);

    const { data: vehicles } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('incident_id', incidentId);

    console.log(`Witnesses: ${witnesses?.length || 0}`);
    console.log(`Other Vehicles: ${vehicles?.length || 0}\n`);

    // ========================================
    // 5. DIAGNOSIS SUMMARY
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔬 DIAGNOSIS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const hasPdfRecord = pdfRecords && pdfRecords.length > 0;
    const hasIncidentPdf = pdfRecords?.find(p => p.incident_id === incidentId);
    const failedDocs = documents?.filter(d => d.status === 'failed') || [];

    console.log('FINDINGS:\n');

    console.log(`1. Incident Found: ${latestIncident ? '✅ YES' : '❌ NO'}`);
    console.log(`   ID: ${incidentId}`);
    console.log(`   Created: ${new Date(latestIncident.created_at).toLocaleString('en-GB')}\n`);

    console.log(`2. PDF Generation: ${hasIncidentPdf ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`);
    if (hasIncidentPdf) {
      console.log(`   PDF ID: ${hasIncidentPdf.id}`);
      console.log(`   Storage Path: ${hasIncidentPdf.storage_path || 'N/A'}`);
      console.log(`   Email Sent: ${hasIncidentPdf.email_sent ? '✅ YES' : '❌ NO'}`);
      console.log(`   Error: ${hasIncidentPdf.error_message || 'None'}`);
    }
    console.log('');

    console.log(`3. Image Processing: ${documents?.length || 0} documents`);
    if (failedDocs.length > 0) {
      console.log(`   ⚠️  ${failedDocs.length} FAILED`);
      failedDocs.forEach(doc => {
        console.log(`      - ${doc.processing_error}`);
      });
    } else {
      console.log(`   ✅ No failures detected`);
    }
    console.log('');

    // ========================================
    // 6. LIKELY ROOT CAUSES
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 LIKELY ROOT CAUSES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!hasIncidentPdf) {
      console.log('❌ PROBLEM: PDF was never generated');
      console.log('   POSSIBLE CAUSES:');
      console.log('   1. PDF generation service failed silently');
      console.log('   2. Adobe PDF Services error (check credentials)');
      console.log('   3. Insufficient data in incident_reports table');
      console.log('   4. Memory/timeout issue during PDF creation');
      console.log('   5. Storage upload failure');
      console.log('');
      console.log('   NEXT STEPS:');
      console.log('   - Check server logs for PDF generation errors');
      console.log('   - Verify Adobe credentials are valid');
      console.log('   - Try manual PDF generation: node test-form-filling.js ' + SARAH_USER_ID);
      console.log('');
    } else if (!hasIncidentPdf.email_sent) {
      console.log('❌ PROBLEM: PDF generated but email not sent');
      console.log('   POSSIBLE CAUSES:');
      console.log('   1. Email service failure (check RESEND_API_KEY)');
      console.log('   2. Invalid recipient email address');
      console.log('   3. Email send timeout');
      console.log('   4. Email queuing issue');
      console.log('');
      console.log('   NEXT STEPS:');
      console.log('   - Check emailService.js logs');
      console.log('   - Verify RESEND_API_KEY is valid');
      console.log('   - Check user_signup.email is correct');
      console.log('   - Try manual email send');
      console.log('');
    }

    if (failedDocs.length > 0) {
      console.log('⚠️  WARNING: Some images failed processing');
      console.log('   This may affect PDF quality but shouldn\'t block email');
      console.log('');
    }

    console.log('✅ Investigation complete\n');

  } catch (error) {
    console.error('💥 Investigation failed:', error.message);
    console.error(error);
  }
}

investigatePdfFailure();
