/**
 * Utility to identify and clean up unused fields in incident_reports table
 * Based on actual usage patterns in your application
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Fields that should be kept (core functionality)
const ESSENTIAL_FIELDS = [
  'id',
  'create_user_id',
  'user_id',
  'created_at',
  'updated_at',
  'raw_webhook_data',
  'webhook_request_id',
  'detailed_account_of_what_happened',
  'form_id',
  'submit_date',
  // Medical fields (safety critical)
  'are_you_safe',
  'medical_attention',
  'medical_how_are_you_feeling',
  // Core incident data
  'when_did_the_accident_happen',
  'what_time_did_the_accident_happen',
  'where_exactly_did_this_happen',
  'weather_conditions',
  // Vehicle information
  'make_of_car',
  'model_of_car',
  'license_plate_number',
  'damage_caused_by_accident',
  // Other driver
  'other_drivers_name',
  'other_drivers_number',
  'other_make_of_vehicle',
  'other_model_of_vehicle',
  'vehicle_license_plate',
  // Police information
  'did_police_attend',
  'accident_reference_number',
  'police_officers_name',
  // Evidence files
  'file_url_documents',
  'file_url_scene_overview',
  'file_url_vehicle_damage',
  'file_url_other_vehicle',
  'file_url_what3words',
  'file_url_record_detailed_account_of_what_happened',
  // Witnesses
  'any_witness',
  'witness_contact_information',
  // System fields
  'legal_support',
  'voice_transcription',
  'product_id',
  'auth_code',
  'declaration'
];

async function analyzeFieldUsage() {
  console.log('🔍 Analyzing field usage in incident_reports table...');

  try {
    // Get all records to analyze
    const { data: allRecords, error } = await supabase
      .from('incident_reports')
      .select('*');

    if (error) {
      throw error;
    }

    console.log(`📊 Analyzing ${allRecords?.length || 0} incident reports`);

    if (!allRecords || allRecords.length === 0) {
      console.log('⚠️  No data to analyze');
      return;
    }

    // Get all possible fields from the first record
    const allFields = Object.keys(allRecords[0]);
    console.log(`📋 Found ${allFields.length} total fields`);

    // Analyze each field
    const fieldAnalysis = {};

    allFields.forEach(field => {
      let nullCount = 0;
      let populatedCount = 0;
      let sampleValues = [];

      allRecords.forEach(record => {
        const value = record[field];
        if (value === null || value === undefined || value === '') {
          nullCount++;
        } else {
          populatedCount++;
          if (sampleValues.length < 3) {
            sampleValues.push(String(value).substring(0, 50));
          }
        }
      });

      fieldAnalysis[field] = {
        total: allRecords.length,
        populated: populatedCount,
        null: nullCount,
        usagePercentage: Math.round((populatedCount / allRecords.length) * 100),
        sampleValues: sampleValues,
        isEssential: ESSENTIAL_FIELDS.includes(field)
      };
    });

    // Sort by usage percentage
    const sortedFields = Object.entries(fieldAnalysis)
      .sort(([,a], [,b]) => b.usagePercentage - a.usagePercentage);

    console.log('\n📈 FIELD USAGE ANALYSIS:');
    console.log('='.repeat(80));
    console.log('Field Name'.padEnd(35) + 'Usage%'.padEnd(10) + 'Populated'.padEnd(12) + 'Status');
    console.log('-'.repeat(80));

    const unusedFields = [];
    const lowUsageFields = [];

    sortedFields.forEach(([field, stats]) => {
      const status = stats.isEssential ? '🔒 ESSENTIAL' :
                    stats.usagePercentage === 0 ? '❌ UNUSED' :
                    stats.usagePercentage < 10 ? '⚠️  LOW USAGE' :
                    '✅ ACTIVE';

      console.log(
        field.substring(0, 34).padEnd(35) +
        (stats.usagePercentage + '%').padEnd(10) +
        (stats.populated + '/' + stats.total).padEnd(12) +
        status
      );

      if (stats.usagePercentage === 0 && !stats.isEssential) {
        unusedFields.push(field);
      } else if (stats.usagePercentage < 10 && !stats.isEssential) {
        lowUsageFields.push(field);
      }
    });

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Essential fields: ${ESSENTIAL_FIELDS.length}`);
    console.log(`🟢 Active fields (>10% usage): ${sortedFields.filter(([,s]) => s.usagePercentage >= 10).length}`);
    console.log(`🟡 Low usage fields (<10%): ${lowUsageFields.length}`);
    console.log(`🔴 Completely unused fields: ${unusedFields.length}`);

    if (unusedFields.length > 0) {
      console.log('\n❌ UNUSED FIELDS:');
      unusedFields.forEach(field => {
        console.log(`   - ${field}`);
      });
      console.log('\n💡 These fields could be safely removed to clean up the schema');
    }

    if (lowUsageFields.length > 0) {
      console.log('\n⚠️  LOW USAGE FIELDS:');
      lowUsageFields.forEach(field => {
        const stats = fieldAnalysis[field];
        console.log(`   - ${field} (${stats.usagePercentage}% usage)`);
      });
    }

    return {
      totalFields: allFields.length,
      essentialFields: ESSENTIAL_FIELDS.length,
      unusedFields: unusedFields,
      lowUsageFields: lowUsageFields,
      analysis: fieldAnalysis
    };

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

async function generateCleanupSQL(unusedFields) {
  if (!unusedFields || unusedFields.length === 0) {
    console.log('✅ No unused fields to clean up');
    return;
  }

  console.log('\n🧹 Generating cleanup SQL...');

  const cleanupSQL = unusedFields.map(field =>
    `ALTER TABLE public.incident_reports DROP COLUMN IF EXISTS ${field};`
  ).join('\n');

  console.log('\n-- SQL to remove unused fields:');
  console.log('-- ⚠️  BACKUP YOUR DATA BEFORE RUNNING THIS!');
  console.log('-- ⚠️  This will permanently delete these columns!');
  console.log('\n' + cleanupSQL);

  return cleanupSQL;
}

// Main execution
async function main() {
  console.log('🔍 Car Crash Lawyer AI - Database Field Analysis');
  console.log('='.repeat(60));

  const analysis = await analyzeFieldUsage();

  if (analysis && analysis.unusedFields.length > 0) {
    console.log('\n❓ Would you like to generate cleanup SQL for unused fields?');
    console.log('   Run: node cleanup-unused-fields.js --generate-sql');
  }

  console.log('\n✅ Analysis complete');
}

if (require.main === module) {
  if (process.argv.includes('--generate-sql')) {
    analyzeFieldUsage().then(analysis => {
      if (analysis) {
        generateCleanupSQL(analysis.unusedFields);
      }
    });
  } else {
    main();
  }
}

module.exports = { analyzeFieldUsage, generateCleanupSQL };