/**
 * Extract PDF AcroForm Field Names
 *
 * This script extracts all form field names from the PDF template
 * to identify exact field names used in the PDF generation pipeline.
 */

import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';

async function extractFieldNames() {
  console.log('\n📄 EXTRACTING PDF FORM FIELD NAMES\n');
  console.log('='.repeat(80));

  const pdfPath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report-main.pdf';

  try {
    // Load PDF
    console.log('\n📂 Loading PDF template...');
    const pdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`✅ Found ${fields.length} form fields\n`);

    // Extract field details
    const fieldData = [];
    const fieldsByPage = {};

    fields.forEach((field) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;

      // Get page number (approximate - based on widget annotations)
      let pageNumber = 'Unknown';
      try {
        const widgets = field.acroField.getWidgets();
        if (widgets.length > 0) {
          const widget = widgets[0];
          const pages = pdfDoc.getPages();
          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const annots = page.node.Annots();
            if (annots) {
              const annotsArray = pdfDoc.context.lookup(annots);
              if (annotsArray && annotsArray.asArray) {
                const refs = annotsArray.asArray();
                for (const ref of refs) {
                  if (ref.toString() === widget.ref.toString()) {
                    pageNumber = i + 1;
                    break;
                  }
                }
              }
            }
            if (pageNumber !== 'Unknown') break;
          }
        }
      } catch (error) {
        // Silently fail page detection
      }

      const fieldInfo = {
        name: fieldName,
        type: fieldType,
        page: pageNumber
      };

      fieldData.push(fieldInfo);

      // Group by page
      if (!fieldsByPage[pageNumber]) {
        fieldsByPage[pageNumber] = [];
      }
      fieldsByPage[pageNumber].push(fieldInfo);
    });

    // Display results by page
    console.log('📊 FIELDS BY PAGE:\n');

    const sortedPages = Object.keys(fieldsByPage).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return parseInt(a) - parseInt(b);
    });

    sortedPages.forEach(page => {
      const pageFields = fieldsByPage[page];
      console.log(`\n📄 Page ${page} (${pageFields.length} fields):`);
      console.log('-'.repeat(80));

      pageFields.forEach(field => {
        console.log(`   ${field.name.padEnd(50)} [${field.type}]`);
      });
    });

    // Key collision detection
    console.log('\n\n🔍 ANALYZING FIELD COLLISIONS:\n');
    console.log('='.repeat(80));

    // License plate collision
    const licensePlateFields = fieldData.filter(f =>
      f.name.toLowerCase().includes('license') && f.name.toLowerCase().includes('plate')
    );
    if (licensePlateFields.length > 0) {
      console.log('\n🚗 LICENSE PLATE FIELDS:');
      licensePlateFields.forEach(f => {
        console.log(`   Page ${f.page}: ${f.name}`);
      });
      if (licensePlateFields.length > 1) {
        console.log('   ⚠️  WARNING: Multiple license plate fields detected!');
      }
    }

    // Date fields
    const dateFields = fieldData.filter(f =>
      f.name.toLowerCase().includes('date')
    );
    if (dateFields.length > 0) {
      console.log('\n📅 DATE FIELDS:');
      dateFields.forEach(f => {
        console.log(`   Page ${f.page}: ${f.name}`);
      });
    }

    // Audio fields
    const audioFields = fieldData.filter(f =>
      f.name.toLowerCase().includes('audio') ||
      f.name.toLowerCase().includes('transcription') ||
      f.name.toLowerCase().includes('whisper')
    );
    if (audioFields.length > 0) {
      console.log('\n🎙️  AUDIO/TRANSCRIPTION FIELDS:');
      audioFields.forEach(f => {
        console.log(`   Page ${f.page}: ${f.name}`);
      });
    }

    // Witness fields
    const witnessFields = fieldData.filter(f =>
      f.name.toLowerCase().includes('witness')
    );
    if (witnessFields.length > 0) {
      console.log('\n👥 WITNESS FIELDS:');
      witnessFields.forEach(f => {
        console.log(`   Page ${f.page}: ${f.name}`);
      });
    }

    // Image fields
    const imageFields = fieldData.filter(f =>
      f.name.toLowerCase().includes('image') ||
      f.name.toLowerCase().includes('photo') ||
      f.name.toLowerCase().includes('url') ||
      f.name.toLowerCase().includes('picture')
    );
    if (imageFields.length > 0) {
      console.log('\n📸 IMAGE/PHOTO FIELDS:');
      imageFields.forEach(f => {
        console.log(`   Page ${f.page}: ${f.name}`);
      });
    }

    // Write to JSON file
    const outputPath = '/Users/ianring/Node.js/pdf-field-names.json';
    writeFileSync(outputPath, JSON.stringify({
      totalFields: fields.length,
      fieldsByPage: fieldsByPage,
      allFields: fieldData.sort((a, b) => {
        if (a.page === 'Unknown' && b.page === 'Unknown') return 0;
        if (a.page === 'Unknown') return 1;
        if (b.page === 'Unknown') return -1;
        if (parseInt(a.page) !== parseInt(b.page)) {
          return parseInt(a.page) - parseInt(b.page);
        }
        return a.name.localeCompare(b.name);
      }),
      collisionAnalysis: {
        licensePlateFields,
        dateFields,
        audioFields,
        witnessFields,
        imageFields
      }
    }, null, 2));

    console.log('\n\n' + '='.repeat(80));
    console.log(`\n✅ Field extraction complete!`);
    console.log(`📁 Full results saved to: ${outputPath}\n`);

  } catch (error) {
    console.error('\n❌ Error extracting field names:', error.message);
    process.exit(1);
  }
}

// Execute
extractFieldNames()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
