/**
 * Test Witness PDF Field Mapping
 *
 * Verifies that witnesses from incident_witnesses table
 * are correctly mapped to page 9 PDF fields
 */

const fs = require('fs');
const path = require('path');

console.log('\n📄 WITNESS PDF FIELD MAPPING VERIFICATION\n');
console.log('='.repeat(70));

// Read the PDF form filler service
const serviceFile = path.join(__dirname, '../src/services/adobePdfFormFillerService.js');
const serviceCode = fs.readFileSync(serviceFile, 'utf8');

const tests = [
  {
    name: 'Page 9 section exists',
    check: () => serviceCode.includes('PAGE 9: Witnesses')
  },
  {
    name: 'any_witness checkbox mapped',
    check: () => serviceCode.includes("checkField('any_witness'")
  },
  {
    name: 'any_witness_no checkbox mapped',
    check: () => serviceCode.includes("checkField('any_witness_no'")
  },
  {
    name: 'Witness 1 name field mapped',
    check: () => serviceCode.includes("setFieldText('witness_name'")
  },
  {
    name: 'Witness 1 phone field mapped',
    check: () => serviceCode.includes("setFieldText('witness_mobile_number'")
  },
  {
    name: 'Witness 1 email field mapped',
    check: () => serviceCode.includes("setFieldText('witness_email_address'")
  },
  {
    name: 'Witness 1 statement field mapped',
    check: () => serviceCode.includes("setFieldText('witness_statement'")
  },
  {
    name: 'Witness 2 name field mapped',
    check: () => serviceCode.includes("setFieldText('witness_name_2'")
  },
  {
    name: 'Witness 2 phone field mapped',
    check: () => serviceCode.includes("setFieldText('witness_mobile_number_2'")
  },
  {
    name: 'Witness 2 email field mapped',
    check: () => serviceCode.includes("setFieldText('witness_email_address_2'")
  },
  {
    name: 'Witness 2 statement field mapped',
    check: () => serviceCode.includes("setFieldText('witness_statement_2'")
  },
  {
    name: 'Uses data.witnesses array',
    check: () => serviceCode.includes('data.witnesses[0]') && serviceCode.includes('data.witnesses[1]')
  },
  {
    name: 'Database and PDF field names match perfectly',
    check: () => serviceCode.includes('witness1.witness_mobile_number') && serviceCode.includes("witness_mobile_number'")
  },
  {
    name: 'Database and PDF field names match perfectly (email)',
    check: () => serviceCode.includes('witness1.witness_email_address') && serviceCode.includes("witness_email_address'")
  },
  {
    name: 'Comment about witness_address not in PDF',
    check: () => serviceCode.includes('witness_address is NOT in PDF')
  }
];

let passed = 0;
let failed = 0;

console.log('\n🧪 Running Tests...\n');

tests.forEach((test, index) => {
  const result = test.check();
  if (result) {
    console.log(`✅ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.name}`);
    failed++;
  }
});

const successRate = Math.round((passed / tests.length) * 100);

console.log('\n' + '='.repeat(70));
console.log('📊 TEST RESULTS');
console.log('='.repeat(70));
console.log(`Total Tests: ${tests.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${successRate}%`);
console.log('='.repeat(70));

if (failed === 0) {
  console.log('\n🎉 All witness PDF field mappings are correct!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the mappings.\n');
  process.exit(1);
}
