/**
 * List all form fields in the PDF template
 * Shows which fields exist in the PDF vs which we're populating
 */

const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function listPdfFormFields() {
  const templatePath = path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf');

  console.log('📄 Reading PDF template...\n');

  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields = form.getFields();

  console.log(`Found ${fields.length} total form fields\n`);
  console.log('='.repeat(70));

  // Group fields by type
  const fieldsByType = {
    text: [],
    checkbox: [],
    radio: [],
    dropdown: [],
    other: []
  };

  fields.forEach(field => {
    const name = field.getName();
    const type = field.constructor.name;

    if (type.includes('Text')) {
      fieldsByType.text.push(name);
    } else if (type.includes('CheckBox')) {
      fieldsByType.checkbox.push(name);
    } else if (type.includes('Radio')) {
      fieldsByType.radio.push(name);
    } else if (type.includes('Dropdown')) {
      fieldsByType.dropdown.push(name);
    } else {
      fieldsByType.other.push(name);
    }
  });

  console.log('\n📝 TEXT FIELDS:', fieldsByType.text.length);
  console.log(fieldsByType.text.join('\n'));

  console.log('\n\n☑️  CHECKBOX FIELDS:', fieldsByType.checkbox.length);
  console.log(fieldsByType.checkbox.join('\n'));

  if (fieldsByType.radio.length > 0) {
    console.log('\n\n🔘 RADIO BUTTON FIELDS:', fieldsByType.radio.length);
    console.log(fieldsByType.radio.join('\n'));
  }

  if (fieldsByType.dropdown.length > 0) {
    console.log('\n\n📋 DROPDOWN FIELDS:', fieldsByType.dropdown.length);
    console.log(fieldsByType.dropdown.join('\n'));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`Text fields: ${fieldsByType.text.length}`);
  console.log(`Checkbox fields: ${fieldsByType.checkbox.length}`);
  console.log(`Radio button fields: ${fieldsByType.radio.length}`);
  console.log(`Dropdown fields: ${fieldsByType.dropdown.length}`);
  console.log(`Other fields: ${fieldsByType.other.length}`);
  console.log(`TOTAL: ${fields.length}`);
}

listPdfFormFields().catch(console.error);
