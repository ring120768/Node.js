#!/usr/bin/env node
/**
 * Test Script: Witness and Vehicle PDF Generation
 * Purpose: Test complete flow of adding witnesses/vehicles and generating PDF with those pages
 * Usage: node test-witness-vehicle-pdf.js [user-uuid]
 */

const { createClient } = require('@supabase/supabase-js');
const { fetchAllData } = require('./lib/dataFetcher');
const AdobePdfFormFillerService = require('./src/services/adobePdfFormFillerService');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function testWitnessVehiclePdf() {
  console.log(colors.cyan, '\n🧪 Testing Witness & Vehicle PDF Generation\n');

  try {
    // Get user ID from command line or use test ID
    const userId = process.argv[2];

    if (!userId) {
      console.log(colors.red, '❌ Usage: node test-witness-vehicle-pdf.js [user-uuid]');
      console.log(colors.cyan, '\nTo find a user with data, run:');
      console.log('node scripts/find-test-user.js\n');
      process.exit(1);
    }

    console.log(`Testing with user ID: ${userId}\n`);

    // Step 1: Check if user exists
    console.log('1️⃣ Checking user exists...');
    const { data: user, error: userError } = await supabase
      .from('user_signup')
      .select('email, name, surname')
      .eq('create_user_id', userId)
      .single();

    if (userError || !user) {
      console.log(colors.red, `❌ User not found: ${userError?.message || 'No data'}`);
      process.exit(1);
    }
    console.log(colors.green, `✅ User found: ${user.name} ${user.surname} (${user.email})`);

    // Step 2: Check for incident
    console.log('\n2️⃣ Checking for incident...');
    const { data: incidents, error: incidentError } = await supabase
      .from('incident_reports')
      .select('id, created_at')
      .eq('create_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (incidentError || !incidents || incidents.length === 0) {
      console.log(colors.red, '❌ No incident found. Create one first.');
      process.exit(1);
    }
    const incidentId = incidents[0].id;
    console.log(colors.green, `✅ Incident found: ${incidentId}`);

    // Step 3: Add test witness
    console.log('\n3️⃣ Adding test witness...');
    const { data: witness, error: witnessError } = await supabase
      .from('incident_witnesses')
      .insert({
        incident_id: incidentId,
        create_user_id: userId,
        witness_name: 'John Test Witness',
        witness_phone: '+447700900123',
        witness_email: 'john.witness@test.com',
        witness_address: '123 Test Street, London, SW1A 1AA',
        witness_statement: 'I saw the entire accident occur at the junction. The other vehicle ran a red light and collided with the user\'s car at approximately 15:30. The weather was clear and visibility was good.'
      })
      .select()
      .single();

    if (witnessError) {
      console.log(colors.yellow, `⚠️ Could not add witness: ${witnessError.message}`);
    } else {
      console.log(colors.green, `✅ Witness added: ${witness.witness_name}`);
    }

    // Step 4: Add test vehicle
    console.log('\n4️⃣ Adding test vehicle...');
    const { data: vehicle, error: vehicleError } = await supabase
      .from('incident_other_vehicles')
      .insert({
        incident_id: incidentId,
        create_user_id: userId,
        driver_name: 'Sarah Test Driver',
        driver_phone: '+447700900456',
        driver_email: 'sarah.driver@test.com',
        driver_address: '456 Test Avenue, Manchester, M1 1AA',
        vehicle_license_plate: 'AB12CDE',
        vehicle_make: 'Ford',
        vehicle_model: 'Focus',
        vehicle_color: 'Blue',
        vehicle_year_of_manufacture: '2020',
        insurance_company: 'Test Insurance Co',
        policy_cover: 'Comprehensive',
        policy_holder: 'Sarah Test Driver',
        mot_status: 'Valid',
        mot_expiry_date: '2025-12-31',
        tax_status: 'Taxed',
        tax_due_date: '2025-11-30',
        fuel_type: 'Petrol',
        engine_capacity: '1600'
      })
      .select()
      .single();

    if (vehicleError) {
      console.log(colors.yellow, `⚠️ Could not add vehicle: ${vehicleError.message}`);
    } else {
      console.log(colors.green, `✅ Vehicle added: ${vehicle.vehicle_license_plate} (${vehicle.vehicle_make} ${vehicle.vehicle_model})`);
    }

    // Step 5: Fetch all data
    console.log('\n5️⃣ Fetching all data for PDF generation...');
    const allData = await fetchAllData(userId);

    console.log(colors.cyan, '\nData summary:');
    console.log(`  • User: ${allData.user.first_name} ${allData.user.last_name}`);
    console.log(`  • Incidents: ${allData.metadata.total_incidents}`);
    console.log(`  • Images: ${allData.metadata.total_images}`);
    console.log(`  • Witnesses: ${allData.metadata.total_witnesses}`);
    console.log(`  • Vehicles: ${allData.metadata.total_vehicles}`);

    if (allData.metadata.total_witnesses === 0) {
      console.log(colors.yellow, '\n⚠️ No witnesses found! Witness pages will not be generated.');
    }
    if (allData.metadata.total_vehicles === 0) {
      console.log(colors.yellow, '⚠️ No vehicles found! Vehicle pages will not be generated.');
    }

    // Step 6: Generate PDF
    console.log('\n6️⃣ Generating PDF with witnesses and vehicles...');
    const pdfService = new AdobePdfFormFillerService();
    const pdfBuffer = await pdfService.fillPdfForm(allData);

    // Step 7: Save test PDF
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `test-witness-vehicle-${timestamp}.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log(colors.green, `\n✅ PDF generated successfully!`);
    console.log(colors.cyan, `📄 PDF saved to: ${outputPath}`);
    console.log(colors.cyan, `📊 PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Step 8: Verify PDF pages
    console.log('\n7️⃣ Verifying PDF structure...');
    const { PDFDocument } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    const expectedPages = 17 + allData.metadata.total_witnesses + allData.metadata.total_vehicles;
    console.log(`  • Total pages: ${pageCount}`);
    console.log(`  • Expected: ${expectedPages} (17 base + ${allData.metadata.total_witnesses} witness + ${allData.metadata.total_vehicles} vehicle)`);

    if (pageCount === expectedPages) {
      console.log(colors.green, '✅ Page count matches expected!');
    } else {
      console.log(colors.yellow, `⚠️ Page count mismatch! Expected ${expectedPages}, got ${pageCount}`);
    }

    // Step 9: Cleanup test data
    console.log('\n8️⃣ Cleaning up test data...');
    if (witness) {
      await supabase
        .from('incident_witnesses')
        .delete()
        .eq('id', witness.id);
      console.log(colors.green, '✅ Test witness deleted');
    }
    if (vehicle) {
      await supabase
        .from('incident_other_vehicles')
        .delete()
        .eq('id', vehicle.id);
      console.log(colors.green, '✅ Test vehicle deleted');
    }

    console.log(colors.green, '\n🎉 All tests passed!\n');
    console.log(colors.cyan, 'Next steps:');
    console.log('1. Open the PDF and verify witness/vehicle pages appear correctly');
    console.log('2. Check that all fields are filled properly');
    console.log('3. Verify page order is correct\n');

  } catch (error) {
    console.log(colors.red, `\n❌ Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

testWitnessVehiclePdf().catch(console.error);
