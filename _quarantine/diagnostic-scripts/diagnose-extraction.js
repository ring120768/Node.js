/**
 * Diagnostic: Inspect Phase 1 Data Extraction
 *
 * Shows exactly what buildComprehensiveIncidentData() extracts
 * and what gets passed to GPT-4o-mini
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const INCIDENT_ID = 'd577c70f-ec84-4352-aff1-5c16acdaafa9';

// Import the buildComprehensiveIncidentData function
// We'll need to read it from ai.controller.js and extract it
const fs = require('fs');
const path = require('path');

// Read ai.controller.js to get the extraction function
const controllerPath = path.join(__dirname, 'src/controllers/ai.controller.js');
const controllerCode = fs.readFileSync(controllerPath, 'utf8');

// Extract the buildComprehensiveIncidentData function using eval (for diagnostics only)
// This is safe because we control the source file
eval(controllerCode.match(/function buildComprehensiveIncidentData\([\s\S]*?\n\nfunction /)[0].slice(0, -10));

// Extract helper functions
eval(controllerCode.match(/function buildWeatherArray\([\s\S]*?\n\}/)[0]);
eval(controllerCode.match(/function buildMedicalSymptomsArray\([\s\S]*?\n\}/)[0]);
eval(controllerCode.match(/function buildRoadConditionsArray\([\s\S]*?\n\}/)[0]);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function diagnoseExtraction() {
  console.log('🔍 Diagnostic: Phase 1 Data Extraction Analysis');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Incident ID: ${INCIDENT_ID}\n`);

  try {
    // Step 1: Fetch raw data
    console.log('📋 Step 1: Fetching raw database data...\n');

    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', INCIDENT_ID)
      .eq('create_user_id', USER_ID)
      .single();

    if (incidentError) throw incidentError;
    if (!incidentData) throw new Error('Incident report not found');

    const { data: otherVehicles } = await supabase
      .from('incident_other_vehicles')
      .select('*')
      .eq('create_user_id', USER_ID);

    let witnesses = [];
    try {
      const { data: witnessData } = await supabase
        .from('incident_witnesses')
        .select('*')
        .eq('create_user_id', USER_ID);
      witnesses = witnessData || [];
    } catch (error) {
      console.log('⚠️  Witnesses table not available (non-fatal)\n');
    }

    // Count non-null fields in raw data
    const rawFieldCount = Object.entries(incidentData)
      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
      .length;

    console.log(`✅ Raw incident_reports fields with data: ${rawFieldCount}`);
    console.log(`✅ Other vehicles: ${(otherVehicles || []).length}`);
    console.log(`✅ Witnesses: ${witnesses.length}\n`);

    // Step 2: Build comprehensive data structure
    console.log('📋 Step 2: Building comprehensive data structure...\n');

    const comprehensiveData = buildComprehensiveIncidentData(
      incidentData,
      otherVehicles || [],
      witnesses || []
    );

    // Step 3: Analyze the extraction
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXTRACTION METADATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (comprehensiveData._metadata) {
      console.log(`Total fields in database:     ${comprehensiveData._metadata.totalFieldsInDatabase}`);
      console.log(`Extracted known fields:       ${comprehensiveData._metadata.extractedKnownFields}`);
      console.log(`Unmapped fields found:        ${comprehensiveData._metadata.unmappedFieldsFound}`);
      console.log(`Total fields extracted:       ${comprehensiveData._metadata.totalFieldsExtracted}`);
      console.log(`Other vehicles:               ${comprehensiveData._metadata.otherVehiclesCount}`);
      console.log(`Witnesses:                    ${comprehensiveData._metadata.witnessesCount}`);
      console.log(`Extraction complete:          ${comprehensiveData._metadata.extractionComplete}\n`);
    }

    // Step 4: Show unmapped fields (if any)
    if (comprehensiveData.unmappedFields && comprehensiveData._metadata.unmappedFieldsFound > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 UNMAPPED FIELDS (Should be in Paragraph XIII)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      Object.entries(comprehensiveData.unmappedFields).forEach(([fieldName, value], index) => {
        const displayValue = typeof value === 'string' && value.length > 100
          ? value.substring(0, 100) + '...'
          : value;
        console.log(`${index + 1}. ${fieldName}`);
        console.log(`   Value: ${displayValue}\n`);
      });
    } else {
      console.log('✅ No unmapped fields - all data categorized\n');
    }

    // Step 5: Calculate JSON size that would be sent to OpenAI
    const jsonData = JSON.stringify(comprehensiveData, null, 2);
    const jsonSizeKB = (jsonData.length / 1024).toFixed(2);
    const estimatedTokens = Math.ceil(jsonData.length / 4); // Rough estimate: 1 token ≈ 4 characters

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 DATA SIZE FOR OPENAI API CALL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`JSON string length:           ${jsonData.length.toLocaleString()} characters`);
    console.log(`JSON size:                    ${jsonSizeKB} KB`);
    console.log(`Estimated prompt tokens:      ~${estimatedTokens.toLocaleString()} tokens`);
    console.log(`Max completion tokens:        4000 tokens (from code)\n`);

    // Step 6: Sample the data structure
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DATA STRUCTURE SAMPLE (First 2000 chars)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(jsonData.substring(0, 2000) + '...\n');

    // Step 7: Check specific fields that were reported as "not documented"
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CRITICAL FIELD CHECK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Fields the AI claimed were "not documented":');
    console.log(`1. Location (incident.location): "${comprehensiveData.incident?.location || 'NOT FOUND'}"`);
    console.log(`2. Visibility (conditions.visibility): "${comprehensiveData.conditions?.visibility || 'NOT FOUND'}"`);
    console.log(`3. Traffic Density (conditions.trafficDensity): "${comprehensiveData.conditions?.trafficDensity || 'NOT FOUND'}"`);
    console.log(`4. Hospital Name (medical.hospitalName): "${comprehensiveData.medical?.hospitalName || 'NOT FOUND'}"`);
    console.log(`5. Ambulance Called (medical.ambulanceCalled): "${comprehensiveData.medical?.ambulanceCalled || 'NOT FOUND'}"`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 Analysis:');
    console.log(`   - Data extraction appears ${comprehensiveData._metadata.extractionComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    console.log(`   - ${comprehensiveData._metadata.totalFieldsExtracted} fields extracted and ready for AI`);
    console.log(`   - ${comprehensiveData._metadata.unmappedFieldsFound} additional unmapped fields`);
    console.log(`   - JSON payload: ${jsonSizeKB} KB (${estimatedTokens} tokens estimated)`);

    if (estimatedTokens > 8000) {
      console.log('\n⚠️  WARNING: Prompt tokens may exceed GPT-4o-mini context window!');
    }

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the data structure sample above');
    console.log('   2. Check if critical fields are present in extracted data');
    console.log('   3. If fields are missing: Debug buildComprehensiveIncidentData()');
    console.log('   4. If fields are present: AI model is ignoring instructions\n');

    return {
      success: true,
      extractionMetadata: comprehensiveData._metadata,
      jsonSizeKB,
      estimatedTokens,
      comprehensiveData
    };

  } catch (error) {
    console.error('\n❌ Diagnostic failed:', error.message);
    console.error('\n📋 Error details:', error);
    process.exit(1);
  }
}

diagnoseExtraction();
