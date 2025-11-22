/**
 * Extract AI Analysis Field Names from PDF Template
 * Purpose: Get exact field names from updated PDF template for AI analysis sections
 * Usage: node extract-ai-analysis-fields.js
 */

const fs = require('fs');
const pdfLib = require('pdf-lib');

// PDF path from user (with escaped spaces)
const pdfPath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';

async function extractFieldNames() {
  console.log('🔍 Extracting field names from PDF template...\n');

  try {
    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found at:', pdfPath);
      process.exit(1);
    }

    // Read the PDF directly to get field information
    console.log('⏳ Loading PDF and extracting form fields...');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await pdfLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('📋 Total Fields in PDF:', fields.length);
    console.log('\n🎯 Searching for AI Analysis Fields (Pages 13-16)...\n');

    // Search for AI-related fields
    const aiFields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('ai_') ||
             name.includes('voice') ||
             name.includes('transcription') ||
             name.includes('summary') ||
             name.includes('quality') ||
             name.includes('closing') ||
             name.includes('final') ||
             name.includes('review') ||
             name.includes('page_13') ||
             name.includes('page_14') ||
             name.includes('page_15');
    });

    if (aiFields.length === 0) {
      console.log('⚠️  No AI analysis fields found. Showing all fields on pages 13-16:\n');

      // Show all fields (in case naming is different)
      console.log('All PDF Fields:');
      fields.forEach((field, index) => {
        const name = field.getName();
        const type = field.constructor.name;
        console.log(`${index + 1}. ${name} (${type})`);
      });
    } else {
      console.log(`✅ Found ${aiFields.length} AI Analysis Fields:\n`);

      aiFields.forEach((field, index) => {
        const name = field.getName();
        const type = field.constructor.name;
        console.log(`${index + 1}. ${name}`);
        console.log(`   Type: ${type}`);
        console.log('');
      });

      console.log('\n📝 Database → PDF Field Mapping:\n');
      console.log('const setFieldText = (fieldName, value) => { ... };');
      console.log('');

      aiFields.forEach(field => {
        const name = field.getName();
        console.log(`setFieldText('${name}', aiAnalysis.${name} || '');`);
      });
    }

    console.log('\n✅ Field extraction complete!');

  } catch (error) {
    console.error('❌ Error extracting fields:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run extraction
extractFieldNames();
