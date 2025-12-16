/**
 * PDF Pages 1-3 vs user_signup Table Reconciliation
 * ONLY checks fields that come from user_signup table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'e6708c56-f9bb-46f1-94d5-d5bea8db1d71';

// PDF Data from Pages 1-3 (ALL from user_signup table)
const pdfData = {
  // Page 1 - Personal Information
  personal: {
    driver_name: 'Ian',
    driver_surname: 'Ring',
    driver_dob: '1968-07-12',
    driver_email: 'ian.ring@sky.com',
    driver_mobile: '07411005390',
    driver_street: '14 Priory Drive',
    driver_town: 'Stansted Mountfitchet',
    driver_postcode: 'CM24 8NR',
    driver_country: 'United Kingdom',
    license_number: 'RING9607128I99AK'
  },

  // Page 1 - Vehicle Information
  vehicle: {
    vehicle_make: 'MERCEDES-BENZ',
    vehicle_model: '', // Empty in PDF
    vehicle_colour: 'BLACK',
    vehicle_condition: 'good',
    recovery_company: 'RAC',
    recovery_breakdown_number: '03330702697',
    recovery_breakdown_email: 'care@rac.co.uk'
  },

  // Page 2 - Emergency Contact
  emergency: {
    emergency_contact_name: 'Sarah Gilbert',
    emergency_contact_phone: '07864009810'
  },

  // Page 2 - Insurance
  insurance: {
    insurance_company: 'Sheilas Wheels',
    policy_number: '91774748',
    policy_holder: 'Ian Ring',
    cover_type: 'comprehensive'
  }
};

async function reconcile() {
  console.log('🔍 PDF Pages 1-3 vs user_signup Table Reconciliation\n');
  console.log(`User ID: ${userId}\n`);

  let totalFields = 0;
  let matchedFields = 0;
  let mismatchedFields = 0;
  let missingFields = 0;

  const issues = [];

  // Fetch user_signup data
  console.log('📊 Fetching user_signup record...\n');

  const { data: signup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signupError) {
    console.error('❌ Error fetching user_signup:', signupError.message);
    process.exit(1);
  }

  console.log('✅ user_signup record fetched\n');
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
    } else if (!dbValue || dbValue === null) {
      missingFields++;
      console.log(`⚠️  ${category} → ${fieldName}: MISSING IN DATABASE`);
      console.log(`   PDF: "${pdfValue}" | DB: NULL\n`);
      issues.push({
        category,
        field: fieldName,
        type: 'MISSING',
        pdfValue,
        dbValue: null,
        dbColumn: 'unknown'
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
        dbValue,
        dbColumn: 'unknown'
      });
    }
  }

  // ========================================
  // PAGE 1: PERSONAL INFORMATION
  // ========================================
  console.log('📋 PAGE 1: PERSONAL INFORMATION\n');

  compareField('Personal', 'Driver First Name', pdfData.personal.driver_name, signup.name);
  compareField('Personal', 'Driver Surname', pdfData.personal.driver_surname, signup.surname);
  compareField('Personal', 'Driver DOB', pdfData.personal.driver_dob, signup.date_of_birth);
  compareField('Personal', 'Driver Email', pdfData.personal.driver_email, signup.email);
  compareField('Personal', 'Driver Mobile', pdfData.personal.driver_mobile, signup.mobile);
  compareField('Personal', 'Driver Street', pdfData.personal.driver_street, signup.street_address);
  compareField('Personal', 'Driver Town', pdfData.personal.driver_town, signup.town);
  compareField('Personal', 'Driver Postcode', pdfData.personal.driver_postcode, signup.postcode);
  compareField('Personal', 'Driver Country', pdfData.personal.driver_country, signup.country);
  compareField('Personal', 'License Number', pdfData.personal.license_number, signup.driving_license_number);

  // ========================================
  // PAGE 1: VEHICLE INFORMATION
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🚗 PAGE 1: VEHICLE INFORMATION\n');

  compareField('Vehicle', 'Make', pdfData.vehicle.vehicle_make, signup.vehicle_make);
  compareField('Vehicle', 'Model', pdfData.vehicle.vehicle_model, signup.vehicle_model);
  compareField('Vehicle', 'Colour', pdfData.vehicle.vehicle_colour, signup.vehicle_colour);
  compareField('Vehicle', 'Condition', pdfData.vehicle.vehicle_condition, signup.vehicle_condition);
  compareField('Vehicle', 'Recovery Company', pdfData.vehicle.recovery_company, signup.recovery_company);
  compareField('Vehicle', 'Recovery Phone', pdfData.vehicle.recovery_breakdown_number, signup.recovery_breakdown_number);
  compareField('Vehicle', 'Recovery Email', pdfData.vehicle.recovery_breakdown_email, signup.recovery_breakdown_email);

  // ========================================
  // PAGE 2: EMERGENCY CONTACT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🚨 PAGE 2: EMERGENCY CONTACT\n');

  // Parse pipe-delimited emergency_contact: "Name | Phone | Email | Company"
  const emergencyParts = signup.emergency_contact ? signup.emergency_contact.split(' | ') : [];
  const emergencyName = emergencyParts[0] || null;
  const emergencyPhone = emergencyParts[1] || null;

  compareField('Emergency', 'Contact Name', pdfData.emergency.emergency_contact_name, emergencyName);
  compareField('Emergency', 'Contact Phone', pdfData.emergency.emergency_contact_phone, emergencyPhone);

  // ========================================
  // PAGE 2: INSURANCE DETAILS
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('🛡️  PAGE 2: INSURANCE DETAILS\n');

  compareField('Insurance', 'Company', pdfData.insurance.insurance_company, signup.insurance_company);
  compareField('Insurance', 'Policy Number', pdfData.insurance.policy_number, signup.policy_number);
  compareField('Insurance', 'Policy Holder', pdfData.insurance.policy_holder, signup.policy_holder);
  compareField('Insurance', 'Cover Type', pdfData.insurance.cover_type, signup.cover_type);

  // ========================================
  // SUMMARY REPORT
  // ========================================
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('📊 PAGES 1-3 RECONCILIATION SUMMARY\n');
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

  if (accuracy === 100) {
    console.log('🎉 PERFECT: PDF Pages 1-3 match user_signup table 100%!\n');
  } else if (accuracy >= 95) {
    console.log('🎉 EXCELLENT: PDF and database are highly consistent!\n');
  } else if (accuracy >= 85) {
    console.log('✅ GOOD: Minor discrepancies found, review recommended\n');
  } else if (accuracy >= 70) {
    console.log('⚠️  WARNING: Significant discrepancies detected\n');
  } else {
    console.log('❌ CRITICAL: Major data inconsistencies found!\n');
  }

  console.log('📄 Note: This reconciliation covers ONLY Pages 1-3 (user_signup table)');
  console.log('   Pages 4+ use different tables (incident_reports, witnesses, etc.)\n');
}

reconcile().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
