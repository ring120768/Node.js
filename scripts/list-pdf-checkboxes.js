/**
 * List all checkbox fields in the PDF template
 */

const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

async function listCheckboxes() {
  try {
    const pdfPath = '/Users/ianring/Node.js/pdf-templates/Car-Crash-Lawyer-AI-incident-report-main.pdf';
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log('\n📋 ALL CHECKBOX FIELDS IN PDF:\n');
    console.log('═'.repeat(80));

    const checkboxes = fields.filter(field => {
      try {
        // Try to get as checkbox - if it succeeds, it's a checkbox
        form.getCheckBox(field.getName());
        return true;
      } catch (e) {
        return false;
      }
    });

    // Filter for fields related to safety and medical
    const safetyFields = checkboxes.filter(cb => {
      const name = cb.getName().toLowerCase();
      return name.includes('safe') ||
             name.includes('ready') ||
             name.includes('feeling') ||
             name.includes('emergency');
    });

    const medicalFields = checkboxes.filter(cb => {
      const name = cb.getName().toLowerCase();
      return name.includes('medical') ||
             name.includes('vision') ||
             name.includes('symptom');
    });

    const weatherFields = checkboxes.filter(cb => {
      const name = cb.getName().toLowerCase();
      return name.includes('weather') ||
             name.includes('dusk') ||
             name.includes('dawn') ||
             name.includes('daylight');
    });

    console.log('\n🔍 SAFETY-RELATED CHECKBOXES:');
    console.log('─'.repeat(80));
    safetyFields.forEach((field, i) => {
      console.log(`${i + 1}. ${field.getName()}`);
    });

    console.log('\n🏥 MEDICAL-RELATED CHECKBOXES:');
    console.log('─'.repeat(80));
    medicalFields.forEach((field, i) => {
      console.log(`${i + 1}. ${field.getName()}`);
    });

    console.log('\n🌤️ WEATHER-RELATED CHECKBOXES:');
    console.log('─'.repeat(80));
    weatherFields.forEach((field, i) => {
      console.log(`${i + 1}. ${field.getName()}`);
    });

    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Total checkboxes: ${checkboxes.length}`);
    console.log(`Safety checkboxes: ${safetyFields.length}`);
    console.log(`Medical checkboxes: ${medicalFields.length}`);
    console.log(`Weather checkboxes: ${weatherFields.length}`);

    console.log('\n🔍 SEARCHING FOR SPECIFIC FIELDS:');
    console.log('─'.repeat(80));

    const searchTerms = [
      'are_you_safe',
      'safe',
      'ready',
      'medical_sympton_change_in_vision',
      'change_in_vision',
      'vision',
      'weather_dusk',
      'dusk'
    ];

    searchTerms.forEach(term => {
      const matches = checkboxes.filter(cb =>
        cb.getName().toLowerCase().includes(term.toLowerCase())
      );

      if (matches.length > 0) {
        console.log(`\n✅ Found "${term}":`);
        matches.forEach(m => console.log(`   → ${m.getName()}`));
      } else {
        console.log(`\n❌ No matches for "${term}"`);
      }
    });

    console.log('\n═'.repeat(80));
    console.log('\n📄 For complete list, see above categorized sections\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listCheckboxes();
