const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function auditPDFFields() {
  try {
    console.log('\n🔍 PDF FIELD AUDIT - Comparing Template vs Database');
    console.log('='.repeat(100));

    // Load PDF template
    const pdfPath = './pdf-templates/Car-Crash-Lawyer-AI-incident-report-main-UPDATED.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n✅ Found ${fields.length} form fields in PDF template\n`);

    // Extract all field names
    const fieldNames = fields.map(f => f.getName()).sort();

    // Save complete field list
    fs.writeFileSync('./test-output/pdf-template-all-fields.txt', fieldNames.join('\n'));
    console.log(`📝 Complete field list saved to: ./test-output/pdf-template-all-fields.txt\n`);

    // Read the field mapper to see what's being mapped
    const mapperPath = './lib/generators/pdfFieldMapper.js';
    const mapperContent = fs.readFileSync(mapperPath, 'utf8');

    // Extract mapped field names from pdfFieldMapper.js
    const mappedFields = new Set();
    const fieldSetRegex = /form\.getTextField\('([^']+)'\)|form\.getCheckBox\('([^']+)'\)/g;
    let match;

    while ((match = fieldSetRegex.exec(mapperContent)) !== null) {
      const fieldName = match[1] || match[2];
      if (fieldName) mappedFields.add(fieldName);
    }

    console.log(`📊 Fields being mapped in pdfFieldMapper.js: ${mappedFields.size}`);

    // Find unmapped fields
    const unmappedFields = fieldNames.filter(f => !mappedFields.has(f));

    console.log(`\n⚠️  UNMAPPED FIELDS: ${unmappedFields.length} fields NOT being populated\n`);
    console.log('='.repeat(100));

    if (unmappedFields.length > 0) {
      console.log('\n🔴 CRITICAL: The following fields exist in PDF but are NOT being filled:\n');

      // Group by likely page/section
      const grouped = {};
      unmappedFields.forEach(field => {
        const prefix = field.split('_')[0] || 'unknown';
        grouped[prefix] = grouped[prefix] || [];
        grouped[prefix].push(field);
      });

      const sortedPrefixes = Object.keys(grouped).sort();
      for (const prefix of sortedPrefixes) {
        console.log(`\n📄 ${prefix.toUpperCase()} Fields (${grouped[prefix].length}):`);
        console.log('-'.repeat(100));
        grouped[prefix].forEach((field, i) => {
          console.log(`  ${(i+1).toString().padStart(3)}. ${field}`);
        });
      }

      // Save unmapped fields to file
      fs.writeFileSync('./test-output/UNMAPPED-FIELDS.txt', unmappedFields.join('\n'));
      console.log(`\n\n📝 Unmapped fields saved to: ./test-output/UNMAPPED-FIELDS.txt`);
    } else {
      console.log('\n✅ All PDF fields are being mapped!');
    }

    console.log('\n' + '='.repeat(100));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total PDF fields: ${fieldNames.length}`);
    console.log(`   Mapped fields: ${mappedFields.size}`);
    console.log(`   Unmapped fields: ${unmappedFields.length}`);
    console.log(`   Coverage: ${((mappedFields.size / fieldNames.length) * 100).toFixed(1)}%\n`);
    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  }
}

auditPDFFields();
