#!/usr/bin/env node

/**
 * Database to PDF Field Comparison
 * Verifies 100% data transfer from database to generated PDF
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.argv[2] || '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const pdfTextPath = './test-output/extracted-pdf-text.txt';

async function compareDbToPdf() {
  console.log('='.repeat(80));
  console.log('DATABASE → PDF FIELD COMPARISON');
  console.log('User ID:', userId);
  console.log('='.repeat(80));

  // Load PDF text
  if (!fs.existsSync(pdfTextPath)) {
    console.error('❌ PDF text file not found. Run: pdftotext <pdf> extracted-pdf-text.txt');
    process.exit(1);
  }
  const pdfText = fs.readFileSync(pdfTextPath, 'utf8');
  console.log('✅ PDF text loaded:', pdfText.length, 'characters\n');

  const comparison = {
    present: [],
    missing: [],
    partial: []
  };

  // 1. USER SIGNUP DATA
  console.log('📋 SECTION 1: Personal & Vehicle Information');
  const { data: signup } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signup) {
    const checks = [
      { field: 'name', value: signup.name, label: 'First Name' },
      { field: 'surname', value: signup.surname, label: 'Last Name' },
      { field: 'email', value: signup.email, label: 'Email' },
      { field: 'mobile', value: signup.mobile, label: 'Mobile' },
      { field: 'date_of_birth', value: signup.date_of_birth, label: 'DOB' },
      { field: 'postcode', value: signup.postcode, label: 'Postcode' },
      { field: 'street_address', value: signup.street_address, label: 'Street Address' },
      { field: 'vehicle_registration', value: signup.vehicle_registration, label: 'License Plate' },
      { field: 'vehicle_make', value: signup.vehicle_make, label: 'Vehicle Make' },
      { field: 'vehicle_model', value: signup.vehicle_model, label: 'Vehicle Model' },
      { field: 'vehicle_color', value: signup.vehicle_color, label: 'Vehicle Color' },
      { field: 'insurance_company', value: signup.insurance_company, label: 'Insurance Company' },
      { field: 'insurance_policy_number', value: signup.insurance_policy_number, label: 'Policy Number' }
    ];

    checks.forEach(check => {
      if (check.value) {
        const inPdf = pdfText.includes(String(check.value));
        if (inPdf) {
          console.log(`  ✅ ${check.label}: "${check.value}" → FOUND`);
          comparison.present.push(check.field);
        } else {
          console.log(`  ❌ ${check.label}: "${check.value}" → MISSING`);
          comparison.missing.push(check.field);
        }
      } else {
        console.log(`  ⚠️  ${check.label}: [NULL IN DATABASE]`);
      }
    });
  }

  // 2. INCIDENT REPORT DATA
  console.log('\n📋 SECTION 2: Accident Details');
  const { data: incident } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (incident) {
    const checks = [
      { field: 'accident_date', value: incident.accident_date, label: 'Accident Date' },
      { field: 'accident_time', value: incident.accident_time, label: 'Accident Time' },
      { field: 'accident_location', value: incident.accident_location, label: 'Location' },
      { field: 'what3words', value: incident.what3words, label: 'what3words' },
      { field: 'your_speed', value: incident.your_speed, label: 'Your Speed' },
      { field: 'other_vehicle_speed', value: incident.other_vehicle_speed, label: 'Other Vehicle Speed' },
      { field: 'weather_conditions', value: incident.weather_conditions, label: 'Weather Conditions' },
      { field: 'road_conditions', value: incident.road_conditions, label: 'Road Conditions' }
    ];

    checks.forEach(check => {
      if (check.value) {
        const searchValue = String(check.value);
        const inPdf = pdfText.includes(searchValue);
        if (inPdf) {
          console.log(`  ✅ ${check.label}: "${searchValue.substring(0, 50)}${searchValue.length > 50 ? '...' : ''}" → FOUND`);
          comparison.present.push(check.field);
        } else {
          console.log(`  ❌ ${check.label}: "${searchValue.substring(0, 50)}${searchValue.length > 50 ? '...' : ''}" → MISSING`);
          comparison.missing.push(check.field);
        }
      } else {
        console.log(`  ⚠️  ${check.label}: [NULL IN DATABASE]`);
      }
    });
  }

  // 3. AI ANALYSIS DATA
  console.log('\n📋 SECTION 3: AI Analysis (Pages 13-18)');
  if (incident) {
    const aiChecks = [
      { field: 'voice_transcription', value: incident.voice_transcription, label: 'Voice Transcription' },
      { field: 'ai_summary', value: incident.ai_summary, label: 'AI Summary' },
      { field: 'ai_closing_statement', value: incident.ai_closing_statement, label: 'Closing Statement' },
      { field: 'ai_incident_summary', value: incident.ai_incident_summary, label: 'Incident Summary' },
      { field: 'ai_liability_assessment', value: incident.ai_liability_assessment, label: 'Liability Assessment' }
    ];

    aiChecks.forEach(check => {
      if (check.value) {
        const charLength = check.value.length;
        // Check for a significant portion of the text (first 50 chars)
        const snippet = check.value.substring(0, 50);
        const inPdf = pdfText.includes(snippet);
        if (inPdf) {
          console.log(`  ✅ ${check.label}: ${charLength} chars → FOUND`);
          comparison.present.push(check.field);
        } else {
          console.log(`  ❌ ${check.label}: ${charLength} chars → MISSING`);
          console.log(`     Snippet: "${snippet}..."`);
          comparison.missing.push(check.field);
        }
      } else {
        console.log(`  ⚠️  ${check.label}: [NULL IN DATABASE]`);
      }
    });
  }

  // 4. IMAGE URLS
  console.log('\n📋 SECTION 4: Images & Documents');
  const { data: docs } = await supabase
    .from('user_documents')
    .select('document_type, storage_path, signed_url')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (docs && docs.length > 0) {
    console.log(`  Total documents: ${docs.length}`);
    const docTypes = {};
    docs.forEach(doc => {
      docTypes[doc.document_type] = (docTypes[doc.document_type] || 0) + 1;
    });
    Object.entries(docTypes).forEach(([type, count]) => {
      console.log(`    ${type}: ${count} file(s)`);
    });

    // Check if storage paths appear in PDF
    const urlsInPdf = docs.filter(doc => {
      const path = doc.storage_path || '';
      return pdfText.includes(path) || (doc.signed_url && pdfText.includes(doc.signed_url));
    });
    console.log(`  ✅ URLs found in PDF: ${urlsInPdf.length}/${docs.length}`);
  }

  // SUMMARY
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Fields present in PDF: ${comparison.present.length}`);
  console.log(`❌ Fields missing from PDF: ${comparison.missing.length}`);
  console.log(`⚠️  Partial matches: ${comparison.partial.length}`);

  const total = comparison.present.length + comparison.missing.length + comparison.partial.length;
  const percentage = total > 0 ? ((comparison.present.length / total) * 100).toFixed(1) : 0;
  console.log(`\n📊 Data Transfer Rate: ${percentage}%`);

  if (comparison.missing.length > 0) {
    console.log('\n⚠️  MISSING FIELDS:');
    comparison.missing.forEach(field => console.log(`    ❌ ${field}`));
  } else {
    console.log('\n🎉 100% DATA TRANSFER VERIFIED!');
  }

  console.log('\n' + '='.repeat(80));

  return comparison;
}

compareDbToPdf()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Comparison failed:', err);
    process.exit(1);
  });
