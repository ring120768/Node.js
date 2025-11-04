/**
 * Analyze Page 9 (Witnesses) Field Mapping Issues
 *
 * This script identifies mismatches between:
 * - Frontend fields (what Page 9 HTML collects)
 * - Database columns (what incident_reports table has)
 * - Backend controller (what it tries to map)
 * - PDF service (what it needs for generation)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzePage9() {
  console.log('\n🔍 Page 9 (Witnesses) Field Mapping Analysis\n');
  console.log('='.repeat(70));

  // Frontend fields (from incident-form-page9-witnesses.html)
  const frontendFields = {
    main: [
      { name: 'witnesses_present', type: 'radio', values: ['yes', 'no'], required: true },
      { name: 'witness_name', type: 'text', required: 'if yes' },
      { name: 'witness_phone', type: 'tel', required: false },
      { name: 'witness_email', type: 'email', required: false },
      { name: 'witness_statement', type: 'textarea', required: 'if yes', maxLength: 1000 }
    ],
    additional: 'Stored in sessionStorage as additional_witnesses array'
  };

  // Backend controller expects (from buildIncidentData)
  const backendExpects = [
    'witness_present',  // TYPO: singular vs witnesses_present (plural)
    'witness_name',
    'witness_phone',
    'witness_address'   // NOT collected by frontend!
  ];

  // PDF service needs (from appendWitnessPages)
  const pdfNeeds = [
    'witness_name',
    'witness_address',
    'witness_phone',
    'witness_email',
    'witness_statement'
  ];

  // Check database columns
  console.log('\n📊 Database Schema Check\n');

  const { data, error } = await supabase
    .from('incident_reports')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying database:', error.message);
    return;
  }

  const allColumns = data && data.length > 0 ? Object.keys(data[0]) : [];
  const witnessColumns = allColumns.filter(col => col.toLowerCase().includes('witness'));

  console.log('Existing witness columns in incident_reports:');
  witnessColumns.forEach(col => {
    console.log(`  ✅ ${col}`);
  });

  // Check for expected columns
  console.log('\n📋 Expected Columns (for backend controller):\n');
  const expectedColumns = [
    'witness_present',
    'witness_name',
    'witness_phone',
    'witness_address',
    'witness_email',
    'witness_statement'
  ];

  expectedColumns.forEach(col => {
    const exists = allColumns.includes(col);
    if (exists) {
      console.log(`  ✅ ${col} - EXISTS`);
    } else {
      console.log(`  ❌ ${col} - MISSING`);
    }
  });

  // Analyze mismatches
  console.log('\n⚠️  Identified Issues\n');
  console.log('='.repeat(70));

  console.log('\n1. Field Name Mismatch:');
  console.log('   Frontend sends: "witnesses_present" (plural)');
  console.log('   Backend expects: "witness_present" (singular)');
  console.log('   Result: ❌ Data not saved correctly\n');

  console.log('2. Missing Database Columns:');
  console.log('   Backend tries to save to non-existent columns:');
  console.log('   - witness_name (doesn\'t exist)');
  console.log('   - witness_phone (doesn\'t exist)');
  console.log('   - witness_address (doesn\'t exist)');
  console.log('   Result: ❌ INSERT will fail or data silently dropped\n');

  console.log('3. Missing Frontend Field:');
  console.log('   PDF needs: witness_address');
  console.log('   Frontend collects: ❌ NOT collected');
  console.log('   Result: ⚠️  PDF will show empty address field\n');

  console.log('4. Missing Backend Mapping:');
  console.log('   Frontend collects: witness_email, witness_statement');
  console.log('   Backend maps: ❌ NOT mapped to database');
  console.log('   Result: ❌ Data collected but not saved\n');

  console.log('5. Multiple Witnesses:');
  console.log('   Frontend: Stores in sessionStorage (additional_witnesses array)');
  console.log('   Backend: ❌ No handling for multiple witnesses');
  console.log('   Database: ❌ No columns for witness 2, 3, etc.');
  console.log('   Result: ❌ Only first witness saved, others lost\n');

  // Recommendations
  console.log('\n💡 Recommended Solutions\n');
  console.log('='.repeat(70));

  console.log('\n✅ OPTION 1: Add Individual Columns (Simple, explicit)');
  console.log('   Add to incident_reports table:');
  console.log('   - witnesses_present (BOOLEAN) - rename from witness_present');
  console.log('   - witness_name (TEXT)');
  console.log('   - witness_phone (TEXT)');
  console.log('   - witness_email (TEXT)');
  console.log('   - witness_address (TEXT) - ADD to frontend');
  console.log('   - witness_statement (TEXT)');
  console.log('   - witness_2_name (TEXT) - for 2nd witness');
  console.log('   - witness_2_phone (TEXT)');
  console.log('   - witness_2_email (TEXT)');
  console.log('   - witness_2_address (TEXT)');
  console.log('   - witness_2_statement (TEXT)');
  console.log('   (Repeat for witness 3, 4, 5 if needed)');
  console.log('   Pros: Explicit, easy to query, PDF service ready');
  console.log('   Cons: Many columns, not scalable beyond fixed count\n');

  console.log('✅ OPTION 2: JSON/JSONB Column (Flexible, scalable)');
  console.log('   Modify incident_reports table:');
  console.log('   - witnesses_present (BOOLEAN)');
  console.log('   - witnesses_data (JSONB) - store array of witness objects');
  console.log('   Example: [');
  console.log('     { name: "John", phone: "...", email: "...", address: "...", statement: "..." },');
  console.log('     { name: "Jane", phone: "...", email: "...", address: "...", statement: "..." }');
  console.log('   ]');
  console.log('   Pros: Unlimited witnesses, clean schema, flexible');
  console.log('   Cons: Requires JSONB parsing in backend/PDF service\n');

  console.log('✅ OPTION 3: Separate Witnesses Table (Best for relational integrity)');
  console.log('   Create new table: incident_witnesses');
  console.log('   Columns:');
  console.log('   - id (UUID, primary key)');
  console.log('   - incident_report_id (UUID, foreign key)');
  console.log('   - witness_number (INTEGER)');
  console.log('   - witness_name (TEXT)');
  console.log('   - witness_phone (TEXT)');
  console.log('   - witness_email (TEXT)');
  console.log('   - witness_address (TEXT)');
  console.log('   - witness_statement (TEXT)');
  console.log('   - created_at (TIMESTAMP)');
  console.log('   Pros: Proper relational design, unlimited witnesses, easy to query');
  console.log('   Cons: Requires JOIN in queries, more complex setup\n');

  // Current state summary
  console.log('\n📊 Current State Summary\n');
  console.log('='.repeat(70));

  console.log('\n✅ Working:');
  console.log('   - Frontend collects witness data');
  console.log('   - localStorage persistence works');
  console.log('   - "Add Another Witness" button works');
  console.log('   - sessionStorage stores additional witnesses\n');

  console.log('❌ Broken:');
  console.log('   - Backend doesn\'t save witness data (wrong field names + missing columns)');
  console.log('   - witness_email and witness_statement not saved');
  console.log('   - witness_address not collected');
  console.log('   - Multiple witnesses not handled by backend');
  console.log('   - PDF service will fail to show witness data\n');

  console.log('🔧 Immediate Fixes Needed:');
  console.log('   1. Fix field name: witnesses_present → witness_present (or vice versa)');
  console.log('   2. Add database columns OR implement JSON storage');
  console.log('   3. Add witness_address field to frontend');
  console.log('   4. Update backend controller to handle all witness fields');
  console.log('   5. Update backend to handle multiple witnesses');
  console.log('   6. Test PDF generation with witness data\n');

  console.log('='.repeat(70));
  console.log('\n✅ Analysis Complete\n');
}

analyzePage9().catch(console.error);
