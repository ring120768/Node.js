/**
 * Find database fields that have data but aren't being mapped to PDF
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUnmappedDbFields() {
  const userId = 'adeedf9d-fe8e-43c9-80d1-30db3c226522';

  // Get all data
  const { data: signup } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  // Get fields with data
  const signupFields = Object.keys(signup).filter(k => signup[k] !== null && signup[k] !== undefined && signup[k] !== '');
  const incidentFields = Object.keys(incident).filter(k => incident[k] !== null && incident[k] !== undefined && incident[k] !== '');

  console.log('📊 DATABASE FIELDS WITH DATA:\n');
  console.log(`user_signup: ${signupFields.length} fields`);
  console.log(`incident_reports: ${incidentFields.length} fields`);
  console.log(`TOTAL: ${signupFields.length + incidentFields.length} fields\n`);

  // Read the PDF service to see what we're mapping
  const serviceCode = fs.readFileSync('/Users/ianring/Node.js/src/services/adobePdfFormFillerService.js', 'utf8');

  // Check which incident fields are NOT mentioned in the service code
  console.log('❌ INCIDENT FIELDS NOT MAPPED TO PDF:\n');
  const unmappedIncident = incidentFields.filter(field => {
    // Exclude system/meta fields
    if (['id', 'create_user_id', 'created_at', 'updated_at', 'deleted_at', 'retention_until', 'form_completed_at'].includes(field)) {
      return false;
    }
    // Check if field is mentioned in service code
    return !serviceCode.includes(field);
  });

  if (unmappedIncident.length === 0) {
    console.log('✅ ALL INCIDENT FIELDS ARE MAPPED!\n');
  } else {
    unmappedIncident.forEach(field => {
      console.log(`  - ${field}: ${incident[field]}`);
    });
    console.log(`\nTotal unmapped: ${unmappedIncident.length}\n`);
  }

  // Check which signup fields are NOT mentioned
  console.log('❌ SIGNUP FIELDS NOT MAPPED TO PDF:\n');
  const unmappedSignup = signupFields.filter(field => {
    // Exclude system/meta fields
    if (['id', 'create_user_id', 'created_at', 'updated_at', 'deleted_at', 'auth_user_id', 'subscription_start_date', 'subscription_end_date', 'subscription_status', 'auto_renewal', 'retention_until', 'images_status', 'product_id'].includes(field)) {
      return false;
    }
    // Check if field is mentioned in service code
    return !serviceCode.includes(field);
  });

  if (unmappedSignup.length === 0) {
    console.log('✅ ALL SIGNUP FIELDS ARE MAPPED!\n');
  } else {
    unmappedSignup.forEach(field => {
      console.log(`  - ${field}: ${signup[field]}`);
    });
    console.log(`\nTotal unmapped: ${unmappedSignup.length}\n`);
  }

  console.log('='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Database fields with data: ${signupFields.length + incidentFields.length}`);
  console.log(`Unmapped incident fields: ${unmappedIncident.length}`);
  console.log(`Unmapped signup fields: ${unmappedSignup.length}`);
  console.log(`TOTAL UNMAPPED: ${unmappedIncident.length + unmappedSignup.length}`);

  if (unmappedIncident.length + unmappedSignup.length === 0) {
    console.log('\n🎉 100% OF DATABASE FIELDS ARE MAPPED TO PDF!');
  } else {
    const percentage = ((signupFields.length + incidentFields.length - unmappedIncident.length - unmappedSignup.length) / (signupFields.length + incidentFields.length) * 100).toFixed(1);
    console.log(`\nCurrent coverage: ${percentage}%`);
  }
}

findUnmappedDbFields().catch(console.error);
