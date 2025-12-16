/**
 * PDF Page 9 vs incident_witnesses Table Reconciliation
 * ONLY checks witness fields from incident_witnesses table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

// PDF Data from Page 9 (witness information)
const pdfData = {
  witness: {
    witness_name: 'Sarah Gilbert',
    witness_mobile_number: '07864009810',
    witness_email_address: 'sarahlgilbert70@gmail.com',
    witness_statement: 'the lady at the bustop saw everything and the van driver told her to mind her own business'
  }
};

async function reconcile() {
  console.log('🔍 PDF Page 9 vs incident_witnesses Table Reconciliation\n');
  console.log(`User ID: ${userId}\n`);

  let totalFields = 0;
  let matchedFields = 0;
  let mismatchedFields = 0;
  let missingFields = 0;

  const issues = [];

  // Fetch witness data
  console.log('📊 Fetching incident_witnesses records...\n');

  const { data: witnesses, error: witnessError } = await supabase
    .from('incident_witnesses')
    .select('*')
    .eq('create_user_id', userId)
    .order('witness_number', { ascending: true });

  if (witnessError) {
    console.error('❌ Error fetching incident_witnesses:', witnessError.message);
    process.exit(1);
  }

  if (!witnesses || witnesses.length === 0) {
    console.error('❌ No witness records found');
    process.exit(1);
  }

  const witness1 = witnesses[0];

  console.log(`✅ Found ${witnesses.length} witness record(s)\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Helper function to compare fields
  function compareField(category, fieldName, pdfValue, dbValue) {
    totalFields++;

    // Normalize values for comparison
    const normalizePdf = String(pdfValue || '').trim().toLowerCase();
    const normalizeDb = String(dbValue || '').trim().toLowerCase();

    if (normalizePdf === normalizeDb) {
      matchedFields++;
      console.log(`✅ ${category} → ${fieldName}: MATCH`);
      console.log(`   PDF: "${pdfValue}" | DB: "${dbValue}"\n`);
    } else if (dbValue === null || dbValue === undefined) {
      missingFields++;
      console.log(`⚠️  ${category} → ${fieldName}: MISSING IN DATABASE`);
      console.log(`   PDF: "${pdfValue}" | DB: NULL\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISSING',
        pdfValue,
        dbValue: null
      });
    } else {
      mismatchedFields++;
      console.log(`❌ ${category} → ${fieldName}: MISMATCH`);
      console.log(`   PDF: "${pdfValue}"`);
      console.log(`   DB:  "${dbValue}"\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISMATCH',
        pdfValue,
        dbValue
      });
    }
  }

  // ========================================
  // PAGE 9: WITNESS INFORMATION
  // ========================================
  console.log('👁️  PAGE 9: WITNESS INFORMATION\n');

  compareField('Witness', 'Name', pdfData.witness.witness_name, witness1.witness_name);
  compareField('Witness', 'Mobile Number', pdfData.witness.witness_mobile_number, witness1.witness_mobile_number);
  compareField('Witness', 'Email Address', pdfData.witness.witness_email_address, witness1.witness_email_address);
  compareField('Witness', 'Statement', pdfData.witness.witness_statement, witness1.witness_statement);

  // ========================================
  // SUMMARY REPORT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📊 PAGE 9 RECONCILIATION SUMMARY\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const accuracy = ((matchedFields / totalFields) * 100).toFixed(2);

  console.log(`Total Fields Checked: ${totalFields}`);
  console.log(`✅ Matched:          ${matchedFields}`);
  console.log(`❌ Mismatched:       ${mismatchedFields}`);
  console.log(`⚠️  Missing in DB:    ${missingFields}`);
  console.log(`\n📈 Data Accuracy:     ${accuracy}%\n`);

  if (issues.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('⚠️  ISSUES REQUIRING ATTENTION\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.category} → ${issue.field}`);
      console.log(`   Type: ${issue.type}`);
      console.log(`   PDF:  "${issue.pdfValue}"`);
      console.log(`   DB:   "${issue.dbValue}"`);
      console.log('');
    });
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (accuracy === '100.00') {
    console.log('🎉 PERFECT: PDF Page 9 matches incident_witnesses table 100%!\n');
  } else if (accuracy >= 95) {
    console.log('🎉 EXCELLENT: PDF and database are highly consistent!\n');
  } else if (accuracy >= 85) {
    console.log('✅ GOOD: Minor discrepancies found, review recommended\n');
  } else if (accuracy >= 70) {
    console.log('⚠️  WARNING: Significant discrepancies detected\n');
  } else {
    console.log('❌ CRITICAL: Major data inconsistencies found!\n');
  }

  console.log('📄 Note: This reconciliation covers ONLY Page 9 (incident_witnesses table)\n');
}

reconcile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
