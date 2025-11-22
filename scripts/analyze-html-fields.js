/**
 * Analyze HTML Form Fields
 *
 * Extracts and analyzes all form fields from HTML pages.
 * Provides clean, structured output for field mapping analysis.
 */

const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  header: (msg) => console.log(`\n${'═'.repeat(70)}\n${msg}\n${'═'.repeat(70)}`),
  subheader: (msg) => console.log(`\n${msg}\n${'─'.repeat(70)}`)
};

// HTML files to analyze
const htmlFiles = [
  'public/incident-form-page1.html',
  'public/incident-form-page2.html',
  'public/incident-form-page3.html',
  'public/incident-form-page4.html',
  'public/incident-form-page4a-location-photos.html',
  'public/incident-form-page5-vehicle.html',
  'public/incident-form-page6-vehicle-images.html',
  'public/incident-form-page7-other-vehicle.html',
  'public/incident-form-page8-other-damage-images.html',
  'public/incident-form-page9-witnesses.html',
  'public/incident-form-page10-police-details.html',
  'public/incident-form-page12-final-medical-check.html',
  'public/declaration.html',
  'public/transcription-status.html'
];

function extractFields(html) {
  const fields = [];

  // Extract input fields (excluding meta tags)
  const inputRegex = /<input[^>]*name="([^"]+)"[^>]*>/g;
  let match;
  while ((match = inputRegex.exec(html)) !== null) {
    const fieldName = match[1];
    const fullTag = match[0];

    // Skip meta tags
    if (fieldName === 'viewport' || fieldName.includes('apple-mobile')) continue;
    if (fieldName.startsWith('${')) continue; // Skip template variables

    // Extract type
    const typeMatch = fullTag.match(/type="([^"]+)"/);
    const type = typeMatch ? typeMatch[1] : 'text';

    // Check if required
    const required = fullTag.includes('required');

    // Check if checkbox/radio
    const value = fullTag.match(/value="([^"]+)"/);

    fields.push({
      name: fieldName,
      type: type,
      required: required,
      value: value ? value[1] : null,
      tag: 'input'
    });
  }

  // Extract select dropdowns
  const selectRegex = /<select[^>]*id="([^"]+)"[^>]*>/g;
  while ((match = selectRegex.exec(html)) !== null) {
    const id = match[1];
    const fullTag = match[0];

    // Extract name attribute
    const nameMatch = fullTag.match(/name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : id;

    // Check if required
    const required = fullTag.includes('required');

    fields.push({
      name: name,
      type: 'select',
      required: required,
      tag: 'select',
      id: id
    });
  }

  // Extract textareas
  const textareaRegex = /<textarea[^>]*name="([^"]+)"[^>]*>/g;
  while ((match = textareaRegex.exec(html)) !== null) {
    const fieldName = match[1];
    const fullTag = match[0];

    // Check if required
    const required = fullTag.includes('required');

    fields.push({
      name: fieldName,
      type: 'textarea',
      required: required,
      tag: 'textarea'
    });
  }

  return fields;
}

function analyzeAllForms() {
  logger.header('HTML FORM FIELD ANALYSIS');

  const allFields = {};
  let totalFields = 0;

  htmlFiles.forEach((file, index) => {
    const filePath = path.join(__dirname, '..', file);

    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found: ${file}`);
      return;
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    const fields = extractFields(html);

    logger.subheader(`${index + 1}. ${file.split('/').pop()} (${fields.length} fields)`);

    if (fields.length === 0) {
      logger.info('  No form fields found (likely image upload or non-form page)');
    } else {
      // Group by type
      const byType = fields.reduce((acc, field) => {
        const key = field.type;
        if (!acc[key]) acc[key] = [];
        acc[key].push(field);
        return acc;
      }, {});

      Object.entries(byType).forEach(([type, typeFields]) => {
        logger.info(`  ${type.toUpperCase()} (${typeFields.length}):`);
        typeFields.forEach(field => {
          const req = field.required ? ' [REQUIRED]' : '';
          const val = field.value ? ` (value: ${field.value})` : '';
          logger.info(`    - ${field.name}${req}${val}`);
        });
      });
    }

    // Store for summary
    allFields[file] = fields;
    totalFields += fields.length;
  });

  // Summary
  logger.header('SUMMARY');

  // Count unique field names across all forms
  const uniqueFieldNames = new Set();
  Object.values(allFields).forEach(fields => {
    fields.forEach(field => uniqueFieldNames.add(field.name));
  });

  logger.success(`Total forms analyzed: ${htmlFiles.length}`);
  logger.success(`Total field instances: ${totalFields}`);
  logger.success(`Unique field names: ${uniqueFieldNames.size}`);

  // Export to JSON for detailed analysis
  const outputPath = '/tmp/html-field-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(allFields, null, 2));
  logger.info(`\nDetailed analysis saved to: ${outputPath}`);

  // Create field list for comparison
  const fieldListPath = '/tmp/html-field-list.txt';
  const sortedFields = Array.from(uniqueFieldNames).sort();
  fs.writeFileSync(fieldListPath, sortedFields.join('\n'));
  logger.info(`Field list saved to: ${fieldListPath}`);

  return {
    allFields,
    uniqueFieldNames: sortedFields,
    totalFields,
    totalForms: htmlFiles.length
  };
}

// Run analysis
const results = analyzeAllForms();

// Export for use in other scripts
module.exports = { analyzeAllForms, extractFields };
