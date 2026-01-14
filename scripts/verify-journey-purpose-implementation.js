/**
 * Verification Script: Journey Purpose Implementation
 *
 * Checks that all components for journey_purpose field are in place:
 * 1. Frontend HTML (radio buttons)
 * 2. Backend controller (data extraction)
 * 3. PDF service (field mapping)
 * 4. Database migration files
 *
 * Run after migration is applied to verify end-to-end implementation.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Journey Purpose Implementation\n');

const checks = [];

// ========================================
// 1. Frontend HTML Check
// ========================================
console.log('1️⃣  Checking Frontend HTML...');
const htmlPath = path.join(__dirname, '../public/incident-form-page3.html');

try {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // Check for journey_purpose field
  const hasField = htmlContent.includes('name="journey_purpose"');
  const hasBusinessOption = htmlContent.includes('value="Business"');
  const hasCommutingOption = htmlContent.includes('value="Commuting"');
  const hasPersonalOption = htmlContent.includes('value="Personal"');

  if (hasField && hasBusinessOption && hasCommutingOption && hasPersonalOption) {
    console.log('   ✅ Frontend HTML has journey_purpose radio buttons');
    checks.push({ component: 'Frontend HTML', status: 'OK' });
  } else {
    console.log('   ❌ Frontend HTML missing journey_purpose field or options');
    checks.push({ component: 'Frontend HTML', status: 'FAIL' });
  }
} catch (error) {
  console.log(`   ❌ Could not read ${htmlPath}`);
  checks.push({ component: 'Frontend HTML', status: 'ERROR' });
}

// ========================================
// 2. Backend Controller Check
// ========================================
console.log('\n2️⃣  Checking Backend Controller...');
const controllerPath = path.join(__dirname, '../src/controllers/incidentForm.controller.js');

try {
  const controllerContent = fs.readFileSync(controllerPath, 'utf8');

  // Check for journey_purpose extraction
  const hasExtraction = controllerContent.includes('journey_purpose: page3.journey_purpose');

  if (hasExtraction) {
    console.log('   ✅ Controller extracts journey_purpose from page3 data');
    checks.push({ component: 'Backend Controller', status: 'OK' });
  } else {
    console.log('   ❌ Controller missing journey_purpose extraction');
    checks.push({ component: 'Backend Controller', status: 'FAIL' });
  }
} catch (error) {
  console.log(`   ❌ Could not read ${controllerPath}`);
  checks.push({ component: 'Backend Controller', status: 'ERROR' });
}

// ========================================
// 3. PDF Service Check
// ========================================
console.log('\n3️⃣  Checking PDF Service...');
const pdfServicePath = path.join(__dirname, '../src/services/adobePdfFormFillerService.js');

try {
  const pdfServiceContent = fs.readFileSync(pdfServicePath, 'utf8');

  // Check for journey_purpose mapping
  const hasMapping = pdfServiceContent.includes("setFieldText('journey_purpose', incident.journey_purpose)");

  if (hasMapping) {
    console.log('   ✅ PDF service maps journey_purpose to PDF field');
    checks.push({ component: 'PDF Service', status: 'OK' });
  } else {
    console.log('   ❌ PDF service missing journey_purpose mapping');
    checks.push({ component: 'PDF Service', status: 'FAIL' });
  }
} catch (error) {
  console.log(`   ❌ Could not read ${pdfServicePath}`);
  checks.push({ component: 'PDF Service', status: 'ERROR' });
}

// ========================================
// 4. Migration Files Check
// ========================================
console.log('\n4️⃣  Checking Migration Files...');
const migrationPath = path.join(__dirname, '../migrations/036_add_journey_purpose_column.sql');
const rollbackPath = path.join(__dirname, '../migrations/036_add_journey_purpose_column_rollback.sql');

try {
  const migrationExists = fs.existsSync(migrationPath);
  const rollbackExists = fs.existsSync(rollbackPath);

  if (migrationExists && rollbackExists) {
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    const hasColumn = migrationContent.includes('ADD COLUMN IF NOT EXISTS journey_purpose');
    const hasConstraint = migrationContent.includes('check_journey_purpose_values');
    const hasIndex = migrationContent.includes('idx_incident_reports_journey_purpose');

    if (hasColumn && hasConstraint && hasIndex) {
      console.log('   ✅ Migration files complete (forward + rollback)');
      checks.push({ component: 'Migration Files', status: 'OK' });
    } else {
      console.log('   ⚠️  Migration files exist but may be incomplete');
      checks.push({ component: 'Migration Files', status: 'WARN' });
    }
  } else {
    console.log('   ❌ Migration files missing');
    checks.push({ component: 'Migration Files', status: 'FAIL' });
  }
} catch (error) {
  console.log('   ❌ Could not read migration files');
  checks.push({ component: 'Migration Files', status: 'ERROR' });
}

// ========================================
// Summary
// ========================================
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 VERIFICATION SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

checks.forEach(check => {
  const icon = check.status === 'OK' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${check.component.padEnd(25)} ${check.status}`);
});

const allOk = checks.every(c => c.status === 'OK');
const hasFailures = checks.some(c => c.status === 'FAIL' || c.status === 'ERROR');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (allOk) {
  console.log('✅ All components verified - Implementation complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Apply migration via Supabase Dashboard SQL Editor');
  console.log('   2. Test form submission with journey_purpose selected');
  console.log('   3. Generate PDF and verify journey_purpose appears\n');
} else if (hasFailures) {
  console.log('❌ Implementation incomplete - Fix issues above');
} else {
  console.log('⚠️  Implementation mostly complete - Review warnings');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(allOk ? 0 : 1);
