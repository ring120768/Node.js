#!/usr/bin/env node
/**
 * Direct PDF Generation Test
 * Bypasses HTTP and calls PDF generation function directly
 * Usage: node test-pdf-direct.js <user-id>
 */

require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testPdfDirect() {
  const userId = process.argv[2] || 'test-scenario-1-1761217633109';

  console.log(colors.cyan, '\n📄 Testing PDF Generation Directly\n');
  console.log(`User ID: ${userId}\n`);

  try {
    // Import the required modules
    const { fetchAllData } = require('./lib/dataFetcher');
    const { generatePDF } = require('./lib/pdfGenerator');

    console.log('1. Fetching all data from Supabase...');
    const data = await fetchAllData(userId);

    console.log(colors.green, '✅ Data fetched successfully!');
    console.log(`\n📊 Data Summary:`);
    console.log(`   User: ${data.user?.name} ${data.user?.surname}`);
    console.log(`   Email: ${data.user?.email}`);
    console.log(`   Incident Location: ${data.currentIncident?.where_exactly_did_this_happen || 'N/A'}`);
    console.log(`   User fields: ${Object.keys(data.user || {}).length}`);
    console.log(`   Incident fields: ${Object.keys(data.currentIncident || {}).length}`);
    console.log(`   DVLA data: ${data.dvla ? 'Yes' : 'No'}`);
    console.log(`   Images: ${data.images?.length || 0}`);
    console.log(`   Transcription: ${data.transcription ? 'Yes' : 'No'}`);
    console.log(`   Summary: ${data.summary ? 'Yes' : 'No'}`);

    console.log('\n2. Generating PDF with pdf-lib (fallback method)...');
    const pdfBuffer = await generatePDF(data);

    console.log(colors.green, '✅ PDF generated successfully!');
    console.log(`   PDF size: ${Math.round(pdfBuffer.length / 1024)} KB`);

    // Save PDF to file
    const fs = require('fs');
    const outputPath = `./test-incident-report-${userId}.pdf`;
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log(colors.green, '\n✅ PDF SAVED TO FILE!\n');
    console.log(colors.cyan, `📁 Location: ${outputPath}`);
    console.log(colors.cyan, `📊 File size: ${Math.round(pdfBuffer.length / 1024)} KB`);
    console.log('\n👀 You can now open this PDF to visually inspect:');
    console.log('   • All 168 form fields');
    console.log('   • Personal information (page 1)');
    console.log('   • Medical assessment (page 4)');
    console.log('   • Accident details (pages 5-7)');
    console.log('   • Other driver info (page 8)');
    console.log('   • DVLA data (pages 15-16)');
    console.log('   • Declaration (page 17)');

  } catch (error) {
    console.log(colors.red, `\n❌ Error: ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}

testPdfDirect();
