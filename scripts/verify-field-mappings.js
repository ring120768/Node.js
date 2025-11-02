#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function verifyMappings() {
  log('\n========================================', 'cyan');
  log('  Field Mapping Verification', 'cyan');
  log('========================================\n', 'cyan');

  const pdfGeneratorPath = path.join(__dirname, '../lib/pdfGenerator.js');
  const code = fs.readFileSync(pdfGeneratorPath, 'utf8');

  const checks = [
    {
      name: 'User: date_of_birth',
      pattern: /setFieldText\(['"]date_of_birth['"],\s*user\.date_of_birth/,
      description: 'Maps user.date_of_birth to PDF field date_of_birth'
    },
    {
      name: 'User: emergency_contact_name',
      pattern: /setFieldText\(['"]emergency_contact_name['"],\s*user\.emergency_contact_name/,
      description: 'Maps user.emergency_contact_name to PDF'
    },
    {
      name: 'User: emergency_contact_number',
      pattern: /setFieldText\(['"]emergency_contact_number['"],\s*user\.emergency_contact_number/,
      description: 'Maps user.emergency_contact_number to PDF'
    },
    {
      name: 'Witness 1: name',
      pattern: /setFieldText\(['"]witness_name['"],\s*witness1\.witness_name/,
      description: 'Maps witness1.witness_name to PDF field witness_name'
    },
    {
      name: 'Witness 1: phone',
      pattern: /setFieldText\(['"]witness_mobile_number['"],\s*witness1\.witness_phone/,
      description: 'Maps witness1.witness_phone to PDF field witness_mobile_number'
    },
    {
      name: 'Witness 1: email',
      pattern: /setFieldText\(['"]witness_email_address['"],\s*witness1\.witness_email/,
      description: 'Maps witness1.witness_email to PDF field witness_email_address'
    },
    {
      name: 'Witness 1: statement',
      pattern: /setFieldText\(['"]witness_statement['"],\s*witness1\.witness_statement/,
      description: 'Maps witness1.witness_statement to PDF field witness_statement'
    },
    {
      name: 'Witness 2: email (FIXED)',
      pattern: /setFieldText\(['"]witness_email_address_2['"],\s*witness2\.witness_2_email/,
      description: 'Maps witness2.witness_2_email to PDF field witness_email_address_2 (was witness_email_2)'
    }
  ];

  let passed = 0;
  let failed = 0;

  log('Checking Phase 1 Fixes:\n', 'blue');

  checks.forEach(check => {
    const found = check.pattern.test(code);
    if (found) {
      log(`✅ ${check.name}`, 'green');
      log(`   ${check.description}`, 'cyan');
      passed++;
    } else {
      log(`❌ ${check.name}`, 'red');
      log(`   ${check.description}`, 'yellow');
      failed++;
    }
    log('', 'reset');
  });

  // Check for old incorrect field name
  const oldWitnessEmail2 = /setFieldText\(['"]witness_email_2['"],/;
  if (oldWitnessEmail2.test(code)) {
    log('⚠️  WARNING: Old incorrect field name "witness_email_2" still present', 'yellow');
    log('   Should be "witness_email_address_2"', 'yellow');
    failed++;
  }

  log('========================================', 'cyan');
  log('  Summary', 'cyan');
  log('========================================\n', 'cyan');

  log(`✅ Passed: ${passed}/${checks.length}`, passed === checks.length ? 'green' : 'yellow');
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, 'red');
  }

  if (passed === checks.length && failed === 0) {
    log('\n🎉 All Phase 1 fixes verified successfully!\n', 'green');
    log('Next steps:', 'cyan');
    log('  1. Test with real data: node test-form-filling.js [user-uuid]', 'cyan');
    log('  2. Check generated PDF for new fields', 'cyan');
    log('  3. Verify witness and user data appears correctly\n', 'cyan');
  } else {
    log('\n⚠️  Some fixes may not be complete. Review output above.\n', 'yellow');
  }

  process.exit(passed === checks.length && failed === 0 ? 0 : 1);
}

verifyMappings();
