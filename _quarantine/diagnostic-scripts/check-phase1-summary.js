/**
 * Check Current Phase 1 Summary
 *
 * Retrieves and displays the form_data_summary that was generated
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const INCIDENT_ID = 'd577c70f-ec84-4352-aff1-5c16acdaafa9';

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

async function checkPhase1Summary() {
  console.log('📋 Checking Phase 1 Summary in Database');
  console.log('═══════════════════════════════════════════════\n');

  try {
    const { data, error } = await supabase
      .from('incident_reports')
      .select('form_data_summary, form_data_summary_metadata')
      .eq('id', INCIDENT_ID)
      .eq('create_user_id', USER_ID)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Incident report not found');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METADATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (data.form_data_summary_metadata) {
      console.log(JSON.stringify(data.form_data_summary_metadata, null, 2));
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 FULL PHASE 1 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (data.form_data_summary) {
      console.log(data.form_data_summary);
      console.log('\n');

      const wordCount = data.form_data_summary.split(/\s+/).length;
      const charCount = data.form_data_summary.length;

      // Determine data richness from metadata
      const metadata = data.form_data_summary_metadata || {};
      const extractionMeta = metadata.extractionMetadata || {};
      const witnessCount = extractionMeta.witnessesCount || 0;
      const vehicleCount = extractionMeta.otherVehiclesCount || 0;

      // Flexible word count criteria based on data richness
      let minWords, maxWords, dataCategory;
      if (witnessCount === 0 && vehicleCount === 0) {
        // Sparse data (basic incident)
        minWords = 800;
        maxWords = 1200;
        dataCategory = 'Sparse (basic incident)';
      } else if (witnessCount <= 1 && vehicleCount <= 1) {
        // Average data
        minWords = 1200;
        maxWords = 1800;
        dataCategory = 'Average (standard incident)';
      } else {
        // Comprehensive data (multiple parties)
        minWords = 1500;
        maxWords = 2500;
        dataCategory = 'Comprehensive (complex incident)';
      }

      const isWithinRange = wordCount >= minWords && wordCount <= maxWords;
      const status = isWithinRange ? '✅ PASS' :
                     wordCount < minWords ? '⚠️ TOO SHORT' : '⚠️ TOO LONG';

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 SUMMARY STATISTICS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Length: ${charCount} characters`);
      console.log(`Words: ${wordCount} words`);
      console.log(`Data Category: ${dataCategory} (${witnessCount} witnesses, ${vehicleCount} other vehicles)`);
      console.log(`Expected Range: ${minWords}-${maxWords} words`);
      console.log(`Status: ${status}\n`);

      // Check for "not documented" phrases
      const notDocumentedCount = (data.form_data_summary.match(/not documented/gi) || []).length;
      console.log(`"Not documented" phrases: ${notDocumentedCount}`);

      if (notDocumentedCount > 5) {
        console.log('⚠️  WARNING: Many fields reported as "not documented" - data extraction may have failed');
      }

      // Style guidance reminder
      console.log('\n💡 Style Note: Summaries should be written like a journalistic news report:');
      console.log('   - Clear, factual, professional tone');
      console.log('   - Logical flow following form structure (Medical → Circumstances → Parties → Officials)');
      console.log('   - No speculation or opinion - report documented facts only');
      console.log('   - Natural length based on incident complexity (no padding required)\n');

    } else {
      console.log('❌ No Phase 1 summary found in database\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPhase1Summary();
