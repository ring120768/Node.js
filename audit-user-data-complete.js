#!/usr/bin/env node

/**
 * Complete User Data Audit
 * Analyzes all database tables for a user to identify data completeness
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.argv[2] || '35a7475f-60ca-4c5d-bc48-d13a299f4309';

async function auditUserData() {
  console.log('='.repeat(80));
  console.log('DATABASE AUDIT - User Data Completeness');
  console.log('User ID:', userId);
  console.log('='.repeat(80));

  const audit = {
    userId,
    tables: {},
    totalFields: 0,
    filledFields: 0,
    emptyFields: 0,
    criticalMissing: []
  };

  // 1. User Signup Data
  console.log('\n📋 TABLE: user_signup');
  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signupError) {
    console.log('❌ Error:', signupError.message);
    audit.tables.user_signup = { error: signupError.message };
  } else {
    console.log('✅ Record found');
    const fields = Object.keys(signup);
    const filledFields = fields.filter(k => signup[k] !== null && signup[k] !== '');
    const emptyFields = fields.filter(k => signup[k] === null || signup[k] === '');

    console.log('  Total fields:', fields.length);
    console.log('  Filled fields:', filledFields.length);
    console.log('  Empty fields:', emptyFields.length);

    audit.tables.user_signup = {
      total: fields.length,
      filled: filledFields.length,
      empty: emptyFields.length,
      emptyFieldNames: emptyFields
    };

    // Show sample data
    console.log('\n  Key Personal Info:');
    const criticalFields = ['name', 'surname', 'email', 'mobile', 'postcode', 'street_address', 'date_of_birth'];
    criticalFields.forEach(field => {
      const value = signup[field];
      const display = value || '[EMPTY]';
      console.log(`    ${field}:`, display);
      if (!value) audit.criticalMissing.push(`user_signup.${field}`);
    });

    console.log('\n  Vehicle Info:');
    const vehicleFields = ['vehicle_make', 'vehicle_model', 'vehicle_registration', 'vehicle_color'];
    vehicleFields.forEach(field => {
      const value = signup[field];
      console.log(`    ${field}:`, value || '[EMPTY]');
      if (!value) audit.criticalMissing.push(`user_signup.${field}`);
    });

    console.log('\n  Insurance Info:');
    const insuranceFields = ['insurance_company', 'insurance_policy_number', 'insurance_expiry_date'];
    insuranceFields.forEach(field => {
      const value = signup[field];
      console.log(`    ${field}:`, value || '[EMPTY]');
    });
  }

  // 2. Incident Reports Data
  console.log('\n📋 TABLE: incident_reports');
  const { data: incidents, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId);

  if (incidentError) {
    console.log('❌ Error:', incidentError.message);
    audit.tables.incident_reports = { error: incidentError.message };
  } else {
    console.log('✅ Records found:', incidents.length);
    if (incidents.length > 0) {
      const incident = incidents[0];
      const fields = Object.keys(incident);
      const filledFields = fields.filter(k => incident[k] !== null && incident[k] !== '');
      const emptyFields = fields.filter(k => incident[k] === null || incident[k] === '');

      console.log('  Total fields:', fields.length);
      console.log('  Filled fields:', filledFields.length);
      console.log('  Empty fields:', emptyFields.length);

      audit.tables.incident_reports = {
        total: fields.length,
        filled: filledFields.length,
        empty: emptyFields.length,
        emptyFieldNames: emptyFields.slice(0, 20) // First 20 empty fields
      };

      console.log('\n  Critical Accident Details:');
      const accidentFields = [
        'accident_date', 'accident_time', 'accident_location', 'what3words',
        'your_speed', 'other_vehicle_speed', 'accident_description',
        'weather_conditions', 'road_conditions', 'lighting_conditions'
      ];

      accidentFields.forEach(field => {
        const value = incident[field];
        let display = value || '[EMPTY]';
        if (typeof display === 'string' && display.length > 80) {
          display = display.substring(0, 80) + '...';
        }
        console.log(`    ${field}:`, display);
        if (!value) audit.criticalMissing.push(`incident_reports.${field}`);
      });

      console.log('\n  AI Analysis Fields:');
      const aiFields = [
        'ai_incident_summary', 'ai_liability_assessment', 'ai_closing_statement',
        'ai_vehicle_damage_analysis', 'ai_injury_assessment', 'ai_evidence_quality'
      ];

      aiFields.forEach(field => {
        const value = incident[field];
        const hasValue = value ? `✅ ${value.length} chars` : '❌ EMPTY';
        console.log(`    ${field}:`, hasValue);
      });
    }
  }

  // 3. User Documents (Images)
  console.log('\n📋 TABLE: user_documents');
  const { data: docs, error: docsError } = await supabase
    .from('user_documents')
    .select('id, document_type, file_name, storage_path, status, signed_url')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (docsError) {
    console.log('❌ Error:', docsError.message);
    audit.tables.user_documents = { error: docsError.message };
  } else {
    console.log('✅ Records found:', docs.length);
    const docTypes = {};
    docs.forEach(doc => {
      if (!docTypes[doc.document_type]) {
        docTypes[doc.document_type] = [];
      }
      docTypes[doc.document_type].push({
        id: doc.id,
        file_name: doc.file_name,
        status: doc.status,
        hasUrl: !!doc.signed_url
      });
    });

    console.log('\n  Document types breakdown:');
    Object.entries(docTypes).forEach(([type, items]) => {
      console.log(`    ${type}: ${items.length} file(s)`);
      items.forEach((item, idx) => {
        console.log(`      [${idx + 1}] ${item.file_name} - ${item.status} - URL: ${item.hasUrl ? 'YES' : 'NO'}`);
      });
    });

    audit.tables.user_documents = {
      total: docs.length,
      byType: Object.fromEntries(
        Object.entries(docTypes).map(([k, v]) => [k, v.length])
      )
    };
  }

  // 4. AI Transcription
  console.log('\n📋 TABLE: ai_transcription');
  const { data: transcription, error: transcriptionError } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId);

  if (transcriptionError) {
    console.log('❌ Error:', transcriptionError.message);
  } else {
    console.log('✅ Records found:', transcription.length);
    if (transcription.length > 0) {
      const trans = transcription[0];
      console.log('  Transcript length:', trans.transcript_text?.length || 0, 'chars');
      console.log('  Has audio URL:', !!trans.audio_url);
      console.log('  Status:', trans.status);

      audit.tables.ai_transcription = {
        exists: true,
        hasTranscript: !!trans.transcript_text,
        transcriptLength: trans.transcript_text?.length || 0
      };
    } else {
      audit.tables.ai_transcription = { exists: false };
    }
  }

  // 5. Other Vehicles
  console.log('\n📋 TABLE: incident_other_vehicles');
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('incident_other_vehicles')
    .select('*')
    .eq('create_user_id', userId);

  if (vehiclesError) {
    console.log('❌ Error:', vehiclesError.message);
  } else {
    console.log('✅ Records found:', vehicles.length);
    audit.tables.incident_other_vehicles = { count: vehicles.length };
  }

  // 6. Witnesses
  console.log('\n📋 TABLE: incident_witnesses');
  const { data: witnesses, error: witnessesError } = await supabase
    .from('incident_witnesses')
    .select('*')
    .eq('create_user_id', userId);

  if (witnessesError) {
    console.log('❌ Error:', witnessesError.message);
  } else {
    console.log('✅ Records found:', witnesses.length);
    audit.tables.incident_witnesses = { count: witnesses.length };
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));

  if (audit.criticalMissing.length > 0) {
    console.log('\n⚠️  CRITICAL MISSING DATA:');
    audit.criticalMissing.forEach(field => {
      console.log(`    ❌ ${field}`);
    });
  } else {
    console.log('\n✅ All critical fields populated');
  }

  console.log('\n📊 Data Completeness by Table:');
  Object.entries(audit.tables).forEach(([table, data]) => {
    if (data.error) {
      console.log(`  ${table}: ERROR - ${data.error}`);
    } else if (data.filled !== undefined) {
      const percentage = ((data.filled / data.total) * 100).toFixed(1);
      console.log(`  ${table}: ${percentage}% complete (${data.filled}/${data.total} fields)`);
    } else if (data.count !== undefined) {
      console.log(`  ${table}: ${data.count} records`);
    } else if (data.exists !== undefined) {
      console.log(`  ${table}: ${data.exists ? 'EXISTS' : 'MISSING'}`);
    }
  });

  console.log('\n' + '='.repeat(80));

  return audit;
}

auditUserData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Audit failed:', err);
    process.exit(1);
  });
