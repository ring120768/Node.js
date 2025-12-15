/**
 * Analyze Reference PDF Structure
 *
 * Deep analysis of the reference PDF to understand:
 * - Which pages have form fields
 * - Field names and types
 * - Page content characteristics
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function analyzeReferencePdf() {
  try {
    console.log('🔍 Analyzing reference PDF structure...\n');

    const referencePath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const referenceBytes = fs.readFileSync(referencePath);
    const referencePdf = await PDFDocument.load(referenceBytes);

    console.log('📄 Basic Info:');
    console.log(`   Pages: ${referencePdf.getPageCount()}`);
    console.log(`   Size: ${(referenceBytes.length / 1024).toFixed(2)} KB\n`);

    // Get form
    const form = referencePdf.getForm();
    const fields = form.getFields();
    console.log(`📋 Form Fields: ${fields.length} total\n`);

    // Analyze fields by page
    console.log('📊 Fields by Page:');
    const fieldsByPage = {};

    fields.forEach(field => {
      const name = field.getName();

      // Try to get widgets (form field appearances on pages)
      try {
        const widgets = field.acroField.getWidgets();
        widgets.forEach(widget => {
          const pageRef = widget.P();
          if (pageRef) {
            const pageIndex = referencePdf.getPages().findIndex(
              page => page.ref === pageRef
            );
            if (pageIndex >= 0) {
              const pageNum = pageIndex + 1;
              if (!fieldsByPage[pageNum]) {
                fieldsByPage[pageNum] = [];
              }
              fieldsByPage[pageNum].push(name);
            }
          }
        });
      } catch (e) {
        // Some fields don't have widgets
      }
    });

    // Print fields per page
    for (let page = 1; page <= 18; page++) {
      const pageFields = fieldsByPage[page] || [];
      if (pageFields.length > 0) {
        console.log(`   Page ${page}: ${pageFields.length} fields`);
        if (page === 17) {
          console.log(`      Fields on page 17 (DECLARATION):`);
          pageFields.slice(0, 10).forEach(f => console.log(`         - ${f}`));
          if (pageFields.length > 10) {
            console.log(`         ... and ${pageFields.length - 10} more`);
          }
        }
      } else {
        console.log(`   Page ${page}: 0 fields (content only)`);
      }
    }

    // Check for signature fields
    console.log('\n✍️  Signature Fields:');
    fields.forEach(field => {
      const name = field.getName();
      if (name.toLowerCase().includes('signature')) {
        console.log(`   - ${name} (${field.constructor.name})`);
      }
    });

    console.log('\n📋 Key Findings:');
    const page17Fields = fieldsByPage[17] || [];
    if (page17Fields.length > 0) {
      console.log(`   ✅ Page 17 has ${page17Fields.length} form fields`);
      console.log('   ⚠️  Simple page copying will lose these fields');
      console.log('   💡 Need to use form-aware merging approach');
    } else {
      console.log('   ⚠️  Page 17 has NO form fields (content only)');
      console.log('   💡 This page might be a static declaration page');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

analyzeReferencePdf();
