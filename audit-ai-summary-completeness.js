/**
 * AI Summary Completeness Audit Script
 *
 * Purpose: Full audit of form data vs AI summary content for specific user
 * User: 35a7475f-60ca-4c5d-bc48-d13a299f4309
 * Date: 2025-12-08
 *
 * This script will:
 * 1. Fetch ALL form data from incident_reports, incident_other_vehicles, incident_witnesses
 * 2. Fetch ai_summary (Single-Phase AI Architecture)
 * 3. Fetch AI analysis fields (closing_statement, etc.)
 * 4. Compare what data exists vs what's in the AI summaries
 * 5. Identify missing fields and data coverage gaps
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';

/**
 * Count non-null fields in an object
 */
function countNonNullFields(obj, excludeFields = []) {
  if (!obj) return 0;

  const systemFields = new Set([
    'id', 'create_user_id', 'auth_user_id', 'user_id', 'created_at',
    'updated_at', 'deleted_at', 'incident_id', 'vehicle_index', 'witness_index',
    ...excludeFields
  ]);

  return Object.entries(obj).filter(([key, value]) => {
    if (systemFields.has(key)) return false;
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }).length;
}

/**
 * List non-null fields with their values
 */
function listNonNullFields(obj, prefix = '', excludeFields = []) {
  if (!obj) return [];

  const systemFields = new Set([
    'id', 'create_user_id', 'auth_user_id', 'user_id', 'created_at',
    'updated_at', 'deleted_at', 'incident_id', 'vehicle_index', 'witness_index',
    ...excludeFields
  ]);

  const fields = [];
  for (const [key, value] of Object.entries(obj)) {
    if (systemFields.has(key)) continue;
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;

    let displayValue = value;
    if (typeof value === 'string' && value.length > 100) {
      displayValue = value.substring(0, 100) + '... [' + value.length + ' chars]';
    } else if (Array.isArray(value)) {
      displayValue = `[${value.length} items]: ${JSON.stringify(value)}`;
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
    }

    fields.push({
      field: prefix ? `${prefix}.${key}` : key,
      value: displayValue,
      type: Array.isArray(value) ? 'array' : typeof value
    });
  }

  return fields;
}

/**
 * Search for field mentions in text
 */
function searchFieldInText(fieldName, text) {
  if (!text) return false;

  // Convert snake_case to readable format
  const readable = fieldName
    .replace(/_/g, ' ')
    .toLowerCase();

  // Check for exact match or similar phrases
  const lowerText = text.toLowerCase();
  return lowerText.includes(readable) ||
         lowerText.includes(fieldName.toLowerCase());
}

async function runAudit() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 AI SUMMARY COMPLETENESS AUDIT');
  console.log('='.repeat(80));
  console.log(`User ID: ${USER_ID}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');

  try {
    // ========================================
    // STEP 1: FETCH ALL FORM DATA
    // ========================================
    console.log('📊 STEP 1: Fetching all form data from database...\n');

    // Fetch incident report
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('create_user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (incidentError) {
      console.error('❌ Error fetching incident report:', incidentError);
      process.exit(1);
    }

    if (!incident) {
      console.error('❌ No incident report found for user:', USER_ID);
      process.exit(1);
    }

    console.log(`✅ Incident Report Found: ${incident.id}`);
    console.log(`   Created: ${incident.created_at}`);
    console.log(`   Date of incident: ${incident.when_did_the_accident_happen || 'Not specified'}\n`);

    // Fetch other vehicles
    const { data: otherVehicles, error: vehiclesError } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', USER_ID);

    if (vehiclesError) {
      console.warn('⚠️  Error fetching other vehicles (non-fatal):', vehiclesError.message);
    }

    console.log(`✅ Other Vehicles: ${otherVehicles?.length || 0} vehicle(s) found\n`);

    // Fetch witnesses
    const { data: witnesses, error: witnessesError } = await supabase
      .from('incident_witnesses')
      .select('*')
      .eq('create_user_id', USER_ID);

    if (witnessesError) {
      console.warn('⚠️  Error fetching witnesses (non-fatal):', witnessesError.message);
    }

    console.log(`✅ Witnesses: ${witnesses?.length || 0} witness(es) found\n`);

    // ========================================
    // STEP 2: COUNT AVAILABLE DATA FIELDS
    // ========================================
    console.log('📈 STEP 2: Analyzing available form data...\n');

    const incidentFieldCount = countNonNullFields(incident, [
      'ai_summary', 'form_data_summary_metadata',
      'ai_incident_summary', 'ai_liability_assessment',
      'ai_vehicle_damage_analysis', 'ai_injury_assessment', 'ai_witness_credibility',
      'ai_evidence_quality', 'ai_recommendations', 'ai_closing_statement',
      'voice_transcription', 'analysis_metadata', 'quality_review',
      'closing_statement', 'final_review'
    ]);

    console.log(`Incident Report Fields:    ${incidentFieldCount} fields with data`);

    let totalVehicleFields = 0;
    if (otherVehicles && otherVehicles.length > 0) {
      otherVehicles.forEach((vehicle, index) => {
        const count = countNonNullFields(vehicle);
        totalVehicleFields += count;
        console.log(`Other Vehicle #${index + 1}:          ${count} fields with data`);
      });
    }

    let totalWitnessFields = 0;
    if (witnesses && witnesses.length > 0) {
      witnesses.forEach((witness, index) => {
        const count = countNonNullFields(witness);
        totalWitnessFields += count;
        console.log(`Witness #${index + 1}:                ${count} fields with data`);
      });
    }

    const totalFormFields = incidentFieldCount + totalVehicleFields + totalWitnessFields;
    console.log('─'.repeat(80));
    console.log(`TOTAL FORM DATA:           ${totalFormFields} fields with data\n`);

    // ========================================
    // STEP 3: ANALYZE AI SUMMARIES
    // ========================================
    console.log('🤖 STEP 3: Analyzing AI-generated summaries...\n');

    // Single-Phase AI Summary
    const hasAiSummary = !!incident.ai_summary;
    const aiSummaryLength = incident.ai_summary?.length || 0;
    const aiSummaryWordCount = hasAiSummary
      ? incident.ai_summary.split(/\s+/).length
      : 0;

    console.log('Single-Phase AI Summary (GPT-4o, temp 0.2)');
    console.log(`  Status:      ${hasAiSummary ? '✅ Generated' : '❌ Missing'}`);
    console.log(`  Length:      ${aiSummaryLength} characters`);
    console.log(`  Word Count:  ${aiSummaryWordCount} words`);

    if (incident.form_data_summary_metadata) {
      const metadata = incident.form_data_summary_metadata;
      console.log(`  Model:       ${metadata.model || 'Unknown'}`);
      console.log(`  Architecture: ${metadata.architecture || 'Unknown'}`);
      console.log(`  Temperature:  ${metadata.temperature || 'Unknown'}`);
      console.log(`  Tokens:      ${metadata.totalTokens || 'Unknown'}`);
      console.log(`  Data Sources: ${metadata.dataSources?.join(', ') || 'Unknown'}`);

      if (metadata.extractionMetadata) {
        const em = metadata.extractionMetadata;
        console.log(`  Extraction Stats:`);
        console.log(`    - Total DB Fields:        ${em.totalFieldsInDatabase || 'Unknown'}`);
        console.log(`    - Extracted Known Fields: ${em.extractedKnownFields || 'Unknown'}`);
        console.log(`    - Unmapped Fields:        ${em.unmappedFieldsFound || 'Unknown'}`);
        console.log(`    - Total Extracted:        ${em.totalFieldsExtracted || 'Unknown'}`);
      }
    }
    console.log('');

    // Additional AI Analysis Fields
    console.log('Additional Analysis Fields:');
    console.log(`  closing_statement:        ${incident.closing_statement ? `✅ ${incident.closing_statement.length} chars` : '❌ Missing'}`);
    console.log(`  voice_transcription:      ${incident.voice_transcription ? `✅ ${incident.voice_transcription.length} chars` : '❌ Missing'}`);
    console.log(`  quality_review:           ${incident.quality_review ? `✅ ${incident.quality_review.length} chars` : '❌ Missing'}`);
    console.log(`  final_review:             ${incident.final_review ? `✅ ${incident.final_review.length} chars` : '❌ Missing'}`);
    console.log('');

    // ========================================
    // STEP 4: FIELD COVERAGE ANALYSIS
    // ========================================
    console.log('🔍 STEP 4: Detailed field coverage analysis...\n');

    // List all non-null fields from incident report
    console.log('━'.repeat(80));
    console.log('INCIDENT REPORT FIELDS WITH DATA:');
    console.log('━'.repeat(80));
    const incidentFields = listNonNullFields(incident, '', [
      'ai_summary', 'form_data_summary_metadata',
      'ai_incident_summary', 'ai_liability_assessment',
      'ai_vehicle_damage_analysis', 'ai_injury_assessment', 'ai_witness_credibility',
      'ai_evidence_quality', 'ai_recommendations', 'ai_closing_statement',
      'voice_transcription', 'analysis_metadata', 'quality_review',
      'closing_statement', 'final_review'
    ]);

    incidentFields.forEach((field, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${field.field}`);
      console.log(`     Type: ${field.type}`);
      console.log(`     Value: ${field.value}\n`);
    });

    // List fields from other vehicles
    if (otherVehicles && otherVehicles.length > 0) {
      console.log('\n━'.repeat(80));
      console.log('OTHER VEHICLES FIELDS WITH DATA:');
      console.log('━'.repeat(80));
      otherVehicles.forEach((vehicle, vehicleIndex) => {
        console.log(`\nVehicle #${vehicleIndex + 1} (Index: ${vehicle.vehicle_index}):`);
        const vehicleFields = listNonNullFields(vehicle, `vehicle_${vehicleIndex + 1}`);
        vehicleFields.forEach((field, fieldIndex) => {
          console.log(`  ${fieldIndex + 1}. ${field.field}`);
          console.log(`     Type: ${field.type}`);
          console.log(`     Value: ${field.value}\n`);
        });
      });
    }

    // List fields from witnesses
    if (witnesses && witnesses.length > 0) {
      console.log('\n━'.repeat(80));
      console.log('WITNESS FIELDS WITH DATA:');
      console.log('━'.repeat(80));
      witnesses.forEach((witness, witnessIndex) => {
        console.log(`\nWitness #${witnessIndex + 1} (Index: ${witness.witness_index}):`);
        const witnessFields = listNonNullFields(witness, `witness_${witnessIndex + 1}`);
        witnessFields.forEach((field, fieldIndex) => {
          console.log(`  ${fieldIndex + 1}. ${field.field}`);
          console.log(`     Type: ${field.type}`);
          console.log(`     Value: ${field.value}\n`);
        });
      });
    }

    // ========================================
    // STEP 5: MISSING FIELD ANALYSIS
    // ========================================
    console.log('\n' + '━'.repeat(80));
    console.log('🔎 STEP 5: Analyzing which fields are missing from AI summary...\n');

    if (!hasAiSummary) {
      console.log('❌ CRITICAL: ai_summary is MISSING');
      console.log('   This is the Single-Phase AI Summary Architecture (GPT-4o).');
      console.log('   Without this, the PDF report will lack comprehensive analysis.\n');
      console.log('   ACTION REQUIRED: Run generateSinglePhaseAiSummary(userId, incidentId, transcription) for this incident.\n');
    } else {
      console.log('✅ ai_summary exists - checking field coverage...\n');

      // Sample check: Are all critical fields mentioned in the summary?
      const summary = incident.ai_summary;

      // Check coverage of critical field categories
      const criticalCategories = {
        'Environmental Conditions': [
          'lighting_conditions', 'visibility', 'traffic_density',
          'weather_*', 'road_condition_*', 'road_features'
        ],
        'Vehicle Dynamics': [
          'was_vehicle_moving', 'approximate_speed', 'seatbelts_worn', 'airbags_deployed'
        ],
        'Medical Information': [
          'medical_symptom_*', 'hospital_name', 'ambulance_called',
          'treatment_received', 'ongoing_symptoms', 'prior_injuries'
        ],
        'Police Details': [
          'police_station', 'crime_reference_number', 'officer_name',
          'officer_badge_number', 'breathalyzer_test', 'arrests_made'
        ]
      };

      console.log('Critical Field Categories Coverage:\n');

      for (const [category, fieldPatterns] of Object.entries(criticalCategories)) {
        console.log(`${category}:`);

        for (const pattern of fieldPatterns) {
          if (pattern.includes('*')) {
            // Wildcard pattern - check multiple fields
            const prefix = pattern.replace('*', '');
            const matchingFields = Object.keys(incident).filter(k =>
              k.startsWith(prefix) && incident[k] !== null && incident[k] !== ''
            );

            if (matchingFields.length > 0) {
              const mentioned = matchingFields.filter(field =>
                searchFieldInText(field, summary)
              );

              console.log(`  ${prefix}* (${matchingFields.length} fields): ${mentioned.length} mentioned in summary`);

              if (mentioned.length < matchingFields.length) {
                const missing = matchingFields.filter(f => !mentioned.includes(f));
                console.log(`    ⚠️  Potentially missing: ${missing.join(', ')}`);
              }
            }
          } else {
            // Single field
            const hasData = incident[pattern] !== null && incident[pattern] !== '';
            if (hasData) {
              const mentioned = searchFieldInText(pattern, summary);
              console.log(`  ${pattern}: ${mentioned ? '✅ Mentioned' : '❌ Not found'}`);
            }
          }
        }
        console.log('');
      }

      // Check other vehicle coverage
      if (otherVehicles && otherVehicles.length > 0) {
        console.log('Other Vehicles Coverage:');
        otherVehicles.forEach((vehicle, index) => {
          const vehicleFields = listNonNullFields(vehicle);
          const mentionedCount = vehicleFields.filter(field =>
            searchFieldInText(field.field, summary)
          ).length;

          console.log(`  Vehicle #${index + 1}: ${mentionedCount}/${vehicleFields.length} fields potentially mentioned`);
        });
        console.log('');
      }

      // Check witness coverage
      if (witnesses && witnesses.length > 0) {
        console.log('Witnesses Coverage:');
        witnesses.forEach((witness, index) => {
          const witnessFields = listNonNullFields(witness);
          const mentionedCount = witnessFields.filter(field =>
            searchFieldInText(field.field, summary)
          ).length;

          console.log(`  Witness #${index + 1}: ${mentionedCount}/${witnessFields.length} fields potentially mentioned`);
        });
        console.log('');
      }
    }

    // ========================================
    // STEP 6: RECOMMENDATIONS
    // ========================================
    console.log('\n' + '━'.repeat(80));
    console.log('💡 STEP 6: Recommendations\n');

    if (!hasAiSummary) {
      console.log('🚨 CRITICAL ISSUE: Single-Phase AI Summary Missing');
      console.log('   The ai_summary field is empty. This is required for');
      console.log('   comprehensive legal incident analysis in the PDF report.');
      console.log('');
      console.log('   SOLUTION:');
      console.log('   1. Fetch voice transcription from incident_reports.voice_transcription');
      console.log('   2. Run generateSinglePhaseAiSummary(userId, incidentId, transcription)');
      console.log('   3. This will generate comprehensive analysis with GPT-4o (temp 0.2)');
      console.log('   4. Result stored in ai_summary field with metadata\n');
    } else if (aiSummaryWordCount < 800) {
      console.log('⚠️  WARNING: AI Summary is shorter than expected');
      console.log(`   Current: ${aiSummaryWordCount} words`);
      console.log(`   Expected: 800-2500 words (comprehensive coverage)`);
      console.log('');
      console.log('   POSSIBLE CAUSES:');
      console.log('   1. Limited data available in incident_reports tables');
      console.log('   2. Voice transcription missing or very short');
      console.log('   3. GPT-4o temperature (0.2) may produce concise output');
      console.log('');
      console.log('   SOLUTION:');
      console.log('   1. Verify all form data is saved correctly in database');
      console.log('   2. Check voice_transcription field has substantial content');
      console.log('   3. Regenerate with generateSinglePhaseAiSummary() if data was incomplete\n');
    } else {
      console.log('✅ AI Summary length looks good');
      console.log(`   Word count: ${aiSummaryWordCount} (within 800-2500 range)`);
      console.log('');
      console.log('   NEXT STEPS:');
      console.log('   1. Manually review summary to verify all critical fields included');
      console.log('   2. Check that environmental, medical, police details are complete');
      console.log('   3. Verify other vehicles and witnesses fully documented');
      console.log('   4. If gaps found, regenerate with stricter prompt\n');
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Form Fields:         ${totalFormFields}`);
    console.log(`  - Incident Report:       ${incidentFieldCount}`);
    console.log(`  - Other Vehicles:        ${totalVehicleFields}`);
    console.log(`  - Witnesses:             ${totalWitnessFields}`);
    console.log('');
    console.log(`AI Summary:                ${hasAiSummary ? '✅ Generated' : '❌ Missing'}`);
    if (hasAiSummary) {
      console.log(`  - Word Count:            ${aiSummaryWordCount}`);
      console.log(`  - Status:                ${aiSummaryWordCount >= 800 ? '✅ Comprehensive' : '⚠️  Short'}`);
    }
    console.log('');
    console.log(`Additional AI Fields:      ${incident.closing_statement ? '✅ Generated' : '❌ Missing'}`);
    console.log('='.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the audit
runAudit();
