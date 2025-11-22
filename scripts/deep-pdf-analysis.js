const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function analyzePDF() {
  console.log('='.repeat(70));
  console.log('DEEP PDF STRUCTURE ANALYSIS');
  console.log('='.repeat(70));

  const pdfPath = '/Users/ianring/Ian.ring Dropbox/Ian Ring/Car Crash Lawyer/PDFco/App ready/PDF fillabe/Final PDF/Car-Crash-Lawyer-AI-incident-report 02112025.pdf';

  console.log(`\n📄 PDF: ${path.basename(pdfPath)}`);
  console.log(`📂 Path: ${pdfPath}`);

  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  console.log(`\n📊 BASIC PDF INFO:`);
  console.log(`  Pages: ${pdfDoc.getPageCount()}`);
  console.log(`  File size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);

  // Get the form
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log(`\n📝 FORM FIELD ANALYSIS:`);
  console.log(`  Total form fields: ${fields.length}`);

  // Analyze field types in detail
  const fieldAnalysis = {
    textFields: [],
    checkBoxes: [],
    radioGroups: [],
    dropdowns: [],
    buttons: [],
    signatures: [],
    unknown: []
  };

  fields.forEach((field, index) => {
    const constructor = field.constructor.name;
    const fieldInfo = {
      name: field.getName(),
      type: constructor,
      index: index + 1,
      isReadOnly: field.isReadOnly ? field.isReadOnly() : 'N/A'
    };

    // Try to get additional properties
    try {
      if (constructor === 'PDFTextField') {
        fieldInfo.multiline = field.isMultiline();
        fieldInfo.maxLength = field.getMaxLength();
        fieldAnalysis.textFields.push(fieldInfo);
      } else if (constructor === 'PDFCheckBox') {
        fieldInfo.isChecked = field.isChecked();
        fieldAnalysis.checkBoxes.push(fieldInfo);
      } else if (constructor === 'PDFRadioGroup') {
        fieldAnalysis.radioGroups.push(fieldInfo);
      } else if (constructor === 'PDFDropdown') {
        fieldAnalysis.dropdowns.push(fieldInfo);
      } else if (constructor === 'PDFButton') {
        fieldAnalysis.buttons.push(fieldInfo);
      } else if (constructor === 'PDFSignature') {
        fieldAnalysis.signatures.push(fieldInfo);
      } else {
        fieldAnalysis.unknown.push(fieldInfo);
      }
    } catch (err) {
      console.error(`    Error analyzing field "${field.getName()}": ${err.message}`);
    }
  });

  console.log(`\n📋 DETAILED BREAKDOWN:`);
  console.log(`  Text Fields: ${fieldAnalysis.textFields.length}`);
  console.log(`  Check Boxes: ${fieldAnalysis.checkBoxes.length}`);
  console.log(`  Radio Groups: ${fieldAnalysis.radioGroups.length}`);
  console.log(`  Dropdowns: ${fieldAnalysis.dropdowns.length}`);
  console.log(`  Buttons: ${fieldAnalysis.buttons.length}`);
  console.log(`  Signatures: ${fieldAnalysis.signatures.length}`);
  console.log(`  Unknown: ${fieldAnalysis.unknown.length}`);
  console.log(`  ─────────────`);
  console.log(`  TOTAL: ${fields.length}`);

  // Check for read-only fields
  const readOnlyFields = fields.filter(f => {
    try {
      return f.isReadOnly && f.isReadOnly();
    } catch {
      return false;
    }
  });

  if (readOnlyFields.length > 0) {
    console.log(`\n🔒 READ-ONLY FIELDS: ${readOnlyFields.length}`);
    readOnlyFields.forEach(field => {
      console.log(`    - ${field.getName()} (${field.constructor.name})`);
    });
  } else {
    console.log(`\n🔒 READ-ONLY FIELDS: 0`);
  }

  // List any unknown field types
  if (fieldAnalysis.unknown.length > 0) {
    console.log(`\n❓ UNKNOWN FIELD TYPES: ${fieldAnalysis.unknown.length}`);
    fieldAnalysis.unknown.forEach(field => {
      console.log(`    - ${field.name} (${field.type})`);
    });
  }

  // List any radio groups or dropdowns
  if (fieldAnalysis.radioGroups.length > 0) {
    console.log(`\n📻 RADIO GROUPS: ${fieldAnalysis.radioGroups.length}`);
    fieldAnalysis.radioGroups.forEach(field => {
      console.log(`    - ${field.name}`);
    });
  }

  if (fieldAnalysis.dropdowns.length > 0) {
    console.log(`\n📋 DROPDOWNS: ${fieldAnalysis.dropdowns.length}`);
    fieldAnalysis.dropdowns.forEach(field => {
      console.log(`    - ${field.name}`);
    });
  }

  if (fieldAnalysis.buttons.length > 0) {
    console.log(`\n🔘 BUTTONS: ${fieldAnalysis.buttons.length}`);
    fieldAnalysis.buttons.forEach(field => {
      console.log(`    - ${field.name}`);
    });
  }

  // Try to access raw PDF dictionary to find all annotations
  console.log(`\n🔍 RAW PDF ANNOTATION ANALYSIS:`);

  try {
    const pages = pdfDoc.getPages();
    let totalAnnotations = 0;
    let widgetAnnotations = 0;

    pages.forEach((page, pageIndex) => {
      const annots = page.node.Annots();
      if (annots) {
        const annotArray = pdfDoc.context.lookup(annots);
        if (annotArray && annotArray.asArray) {
          const annotations = annotArray.asArray();
          totalAnnotations += annotations.length;

          // Count widget annotations (form fields)
          annotations.forEach(annot => {
            try {
              const annotDict = pdfDoc.context.lookup(annot);
              const subtype = annotDict.get('Subtype');
              if (subtype && subtype.toString() === '/Widget') {
                widgetAnnotations++;
              }
            } catch (err) {
              // Ignore lookup errors
            }
          });
        }
      }
    });

    console.log(`  Total annotations across all pages: ${totalAnnotations}`);
    console.log(`  Widget annotations (form fields): ${widgetAnnotations}`);

    if (totalAnnotations > widgetAnnotations) {
      console.log(`  ⚠️  Non-widget annotations: ${totalAnnotations - widgetAnnotations}`);
      console.log(`      (These could be comments, highlights, or other annotations)`);
    }
  } catch (err) {
    console.log(`  ❌ Could not analyze raw annotations: ${err.message}`);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FINAL COMPARISON:`);
  console.log(`${'='.repeat(70)}`);
  console.log(`pdf-lib form.getFields(): ${fields.length} fields`);
  console.log(`User manual count: 209 fields`);
  console.log(`Discrepancy: ${209 - fields.length} fields`);

  console.log(`\n💡 POSSIBLE EXPLANATIONS FOR MISSING 2 FIELDS:`);
  console.log(`   1. Calculated/read-only fields not exposed by pdf-lib`);
  console.log(`   2. Text annotations that look like form fields but aren't`);
  console.log(`   3. Hidden fields with visibility=false`);
  console.log(`   4. Fields on optional content layers`);
  console.log(`   5. Duplicate field instances (same field appearing on multiple pages)`);
  console.log(`   6. User manual count included non-editable elements`);

  console.log(`\n✅ Deep analysis complete!`);
  console.log('='.repeat(70));
}

analyzePDF().catch(console.error);
