/**
 * Comprehensive PDF vs Database Reconciliation Runner
 * Executes all table-specific reconciliations and provides overall summary
 */

const { execSync } = require('child_process');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 COMPREHENSIVE PDF vs DATABASE RECONCILIATION');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('Running methodical table-by-table reconciliation...\n');

const reconciliations = [
  {
    name: 'Pages 1-3: user_signup',
    script: 'scripts/reconcile-pages-1-3.js',
    description: 'Personal info, vehicle, insurance, emergency'
  },
  {
    name: 'Pages 4-10: incident_reports',
    script: 'scripts/reconcile-pages-4-10.js',
    description: 'Medical, accident, location, damage, police'
  },
  {
    name: 'Page 9: incident_witnesses',
    script: 'scripts/reconcile-page-9-witnesses.js',
    description: 'Witness information'
  },
  {
    name: 'Page 13: ai_transcription',
    script: 'scripts/reconcile-page-13-transcription.js',
    description: 'Voice transcription data'
  }
];

const results = [];

// Run each reconciliation (suppress verbose output, keep summary only)
reconciliations.forEach((recon, index) => {
  console.log(`Running ${index + 1}/${reconciliations.length}: ${recon.name}...`);

  try {
    const output = execSync(`node ${recon.script}`, { encoding: 'utf8' });

    // Extract accuracy and counts
    const accuracyMatch = output.match(/📈 Data Accuracy:\s+(\d+\.\d+)%/);
    const accuracy = accuracyMatch ? parseFloat(accuracyMatch[1]) : 0;

    const totalMatch = output.match(/Total Fields Checked:\s+(\d+)/);
    const matchedMatch = output.match(/✅ Matched:\s+(\d+)/);
    const mismatchedMatch = output.match(/❌ Mismatched:\s+(\d+)/);
    const missingMatch = output.match(/⚠️\s+Missing in DB:\s+(\d+)/);

    results.push({
      name: recon.name,
      accuracy,
      total: totalMatch ? parseInt(totalMatch[1]) : 0,
      matched: matchedMatch ? parseInt(matchedMatch[1]) : 0,
      mismatched: mismatchedMatch ? parseInt(mismatchedMatch[1]) : 0,
      missing: missingMatch ? parseInt(missingMatch[1]) : 0,
      success: true
    });

    console.log(`✅ ${recon.name}: ${accuracy.toFixed(2)}% (${results[results.length - 1].matched}/${results[results.length - 1].total})\n`);
  } catch (error) {
    console.error(`❌ Error: ${recon.name}\n`);
    results.push({
      name: recon.name,
      accuracy: 0,
      total: 0,
      matched: 0,
      mismatched: 0,
      missing: 0,
      success: false
    });
  }
});

// ========================================
// COMPREHENSIVE SUMMARY
// ========================================
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 COMPREHENSIVE RECONCILIATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n');

// Calculate totals
const totalFields = results.reduce((sum, r) => sum + r.total, 0);
const totalMatched = results.reduce((sum, r) => sum + r.matched, 0);
const totalMismatched = results.reduce((sum, r) => sum + r.mismatched, 0);
const totalMissing = results.reduce((sum, r) => sum + r.missing, 0);
const overallAccuracy = totalFields > 0 ? (totalMatched / totalFields * 100).toFixed(2) : 0;

// Table
console.log('┌─────────────────────────────────────┬──────────┬─────────┬───────────┐');
console.log('│ Table                               │ Accuracy │ Matched │ Total     │');
console.log('├─────────────────────────────────────┼──────────┼─────────┼───────────┤');

results.forEach(result => {
  const nameCol = result.name.padEnd(35);
  const accuracyCol = result.success ? `${result.accuracy.toFixed(2)}%`.padStart(8) : 'ERROR   ';
  const matchedCol = `${result.matched}`.padStart(7);
  const totalCol = `${result.total}`.padStart(9);
  console.log(`│ ${nameCol} │ ${accuracyCol} │ ${matchedCol} │ ${totalCol} │`);
});

console.log('├─────────────────────────────────────┼──────────┼─────────┼───────────┤');
console.log(`│ ${'OVERALL'.padEnd(35)} │ ${`${overallAccuracy}%`.padStart(8)} │ ${`${totalMatched}`.padStart(7)} │ ${`${totalFields}`.padStart(9)} │`);
console.log('└─────────────────────────────────────┴──────────┴─────────┴───────────┘');

console.log('\n');
console.log('📈 Detailed Breakdown:');
console.log(`   Total Fields:    ${totalFields}`);
console.log(`   ✅ Matched:     ${totalMatched} (${overallAccuracy}%)`);
console.log(`   ❌ Mismatched:  ${totalMismatched}`);
console.log(`   ⚠️  Missing:     ${totalMissing}`);
console.log('\n');

// Assessment
if (overallAccuracy >= 99) {
  console.log('🎉 EXCELLENT: PDF and database virtually identical!\n');
} else if (overallAccuracy >= 95) {
  console.log('✅ VERY GOOD: High consistency with minor discrepancies\n');
} else if (overallAccuracy >= 90) {
  console.log('✅ GOOD: Acceptable consistency\n');
} else if (overallAccuracy >= 80) {
  console.log('⚠️  WARNING: Some discrepancies detected\n');
} else {
  console.log('❌ CRITICAL: Significant inconsistencies!\n');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('📄 COVERAGE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\n✅ Reconciled:');
console.log('   • user_signup (Pages 1-3)');
console.log('   • incident_reports (Pages 4-10)');
console.log('   • incident_witnesses (Page 9)');
console.log('   • ai_transcription (Page 13)');
console.log('\n📋 Not Reconciled:');
console.log('   • incident_other_vehicles (Page 8)');
console.log('   • AI analysis (Pages 14-18)');
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════\n');
