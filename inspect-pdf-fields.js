#!/usr/bin/env node

/**
 * Inspect PDF Form Fields
 * Lists all form field names in the PDF template to help debug field mapping issues
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

async function inspectPdfFields() {
  try {
    console.log('\n========================================');
    console.log('  PDF Form Field Inspector');
    console.log('========================================\n');

    // Load the PDF template
    const templatePath = path.join(process.cwd(), 'pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');
    console.log(`📄 Loading template: ${templatePath}\n`);

    const existingPdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`✅ Found ${fields.length} form fields in template\n`);
    console.log('========================================');
    console.log('All Form Fields:');
    console.log('========================================\n');

    // Group fields by type
    const fieldsByType = {
      text: [],
      checkbox: [],
      signature: [],
      other: []
    };

    fields.forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;

      if (type === 'PDFTextField') {
        fieldsByType.text.push(name);
      } else if (type === 'PDFCheckBox') {
        fieldsByType.checkbox.push(name);
      } else if (type === 'PDFSignature') {
        fieldsByType.signature.push(name);
      } else {
        fieldsByType.other.push(name);
      }
    });

    // Print text fields
    console.log(`📝 TEXT FIELDS (${fieldsByType.text.length}):`);
    console.log('─'.repeat(50));
    fieldsByType.text.sort().forEach((name, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${name}`);
    });

    console.log('\n✅ CHECKBOX FIELDS (' + fieldsByType.checkbox.length + '):');
    console.log('─'.repeat(50));
    fieldsByType.checkbox.sort().forEach((name, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${name}`);
    });

    console.log('\n✍️  SIGNATURE FIELDS (' + fieldsByType.signature.length + '):');
    console.log('─'.repeat(50));
    fieldsByType.signature.sort().forEach((name, i) => {
      console.log(`${(i + 1).toString().padStart(3)}. ${name}`);
    });

    if (fieldsByType.other.length > 0) {
      console.log('\n❓ OTHER FIELDS (' + fieldsByType.other.length + '):');
      console.log('─'.repeat(50));
      fieldsByType.other.sort().forEach((name, i) => {
        console.log(`${(i + 1).toString().padStart(3)}. ${name}`);
      });
    }

    // Search for specific fields we're interested in
    console.log('\n========================================');
    console.log('🔍 Searching for User ID fields:');
    console.log('========================================\n');

    const userIdFields = fields.filter(f => {
      const name = f.getName().toLowerCase();
      return name.includes('user') && name.includes('id');
    });

    if (userIdFields.length > 0) {
      userIdFields.forEach(field => {
        console.log(`✓ Found: "${field.getName()}" (${field.constructor.name})`);
      });
    } else {
      console.log('❌ No user_id related fields found');
    }

    console.log('\n========================================');
    console.log('🔍 Searching for Date/Timestamp fields:');
    console.log('========================================\n');

    const dateFields = fields.filter(f => {
      const name = f.getName().toLowerCase();
      return name.includes('date') || name.includes('time') || name.includes('stamp');
    });

    if (dateFields.length > 0) {
      dateFields.forEach(field => {
        console.log(`✓ Found: "${field.getName()}" (${field.constructor.name})`);
      });
    } else {
      console.log('❌ No date/time related fields found');
    }

    console.log('\n========================================');
    console.log('💡 Tip: Search for "user" or "page" to find page-specific variants');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error inspecting PDF:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the inspection
inspectPdfFields().catch(console.error);
