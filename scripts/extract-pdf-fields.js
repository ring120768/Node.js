/**
 * Extract PDF Form Fields
 *
 * Extracts all form field names, types, and page numbers from PDF templates
 * Uses Adobe PDF Services API
 */

const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const path = require('path');
const { PDFParse: pdfParse } = require('pdf-parse');

const logger = {
  info: (msg) => console.log(`\x1b[34mℹ\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  warn: (msg) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m✗\x1b[0m ${msg}`),
  header: (msg) => console.log(`\n${'═'.repeat(70)}\n${msg}\n${'═'.repeat(70)}`),
};

/**
 * Extract form fields from a PDF file
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Array>} Array of field objects
 */
async function extractPdfFields(pdfPath) {
  try {
    logger.info(`Reading PDF: ${pdfPath}`);

    // Check if credentials file exists
    const credentialsPath = path.join(__dirname, '../credentials/pdfservices-api-credentials.json');

    if (!fs.existsSync(credentialsPath)) {
      logger.warn('Adobe PDF Services credentials not found');
      logger.info('Falling back to manual field extraction...');
      return extractFieldsManually(pdfPath);
    }

    // Adobe PDF Services approach
    const credentials = PDFServicesSdk.Credentials
      .serviceAccountCredentialsBuilder()
      .fromFile(credentialsPath)
      .build();

    const executionContext = PDFServicesSdk.ExecutionContext.create(credentials);
    const extractPdfOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

    const input = PDFServicesSdk.FileRef.createFromLocalFile(pdfPath);
    extractPdfOperation.setInput(input);

    // Extract form fields and structure
    extractPdfOperation.setOptions(
      PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.createNew()
        .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
    );

    logger.info('Extracting PDF structure...');
    const result = await extractPdfOperation.execute(executionContext);

    const outputPath = path.join(__dirname, '../output/pdf-extraction.zip');
    await result.saveAsFile(outputPath);

    logger.success('PDF extracted successfully');

    // Parse the extracted JSON
    const extractedData = parseExtractedPdf(outputPath);
    return extractedData;

  } catch (error) {
    logger.error(`Adobe PDF Services failed: ${error.message}`);
    logger.info('Falling back to manual extraction...');
    return extractFieldsManually(pdfPath);
  }
}

/**
 * Manual field extraction (fallback method)
 * Uses pdf-parse library to extract text and infer structure
 */
async function extractFieldsManually(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);

    // pdf-parse v2 API: instantiate class with data buffer
    const parser = new pdfParse({ data: dataBuffer });
    const result = await parser.getText();

    logger.info(`PDF has ${result.info.numpages} pages`);
    logger.info('Note: Manual extraction provides limited field information');

    // Extract form field patterns from text
    const fields = [];
    const lines = result.text.split('\n');

    // Look for common form field patterns
    lines.forEach((line, index) => {
      // Pattern: Label followed by underscores or boxes
      const fieldPattern = /([A-Za-z\s]+):\s*_{3,}|([A-Za-z\s]+):\s*\[[\s_]+\]/g;
      const matches = line.matchAll(fieldPattern);

      for (const match of matches) {
        const label = (match[1] || match[2]).trim();
        if (label && label.length > 2) {
          fields.push({
            name: label.toLowerCase().replace(/\s+/g, '_'),
            type: 'text',
            page: Math.ceil((index / lines.length) * result.info.numpages),
            inferred: true
          });
        }
      }
    });

    logger.success(`Extracted ${fields.length} potential form fields (inferred)`);
    return fields;

  } catch (error) {
    logger.error(`Manual extraction failed: ${error.message}`);
    return [];
  }
}

/**
 * Parse extracted PDF data
 */
function parseExtractedPdf(zipPath) {
  // TODO: Unzip and parse the JSON structure
  // For now, return empty array
  logger.warn('PDF parsing not fully implemented - needs unzip logic');
  return [];
}

/**
 * Analyze PDF template and create field mapping
 */
async function analyzePdfTemplate() {
  logger.header('PDF TEMPLATE FIELD EXTRACTION');

  const templates = [
    {
      name: 'Incident Report',
      path: path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-Incident-Report.pdf'),
      outputFile: 'incident-pdf-fields.json'
    },
    {
      name: 'Witness/Vehicle Template',
      path: path.join(__dirname, '../pdf-templates/Car-Crash-Lawyer-AI-Witness-Vehicle-Template.pdf'),
      outputFile: 'witness-vehicle-pdf-fields.json'
    }
  ];

  const allResults = {};

  for (const template of templates) {
    logger.header(`Analyzing: ${template.name}`);

    if (!fs.existsSync(template.path)) {
      logger.error(`File not found: ${template.path}`);
      continue;
    }

    const fields = await extractPdfFields(template.path);
    allResults[template.name] = fields;

    // Save results
    const outputPath = path.join(__dirname, '../output', template.outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(fields, null, 2));

    logger.success(`Results saved to: ${outputPath}`);
    logger.info(`Found ${fields.length} fields`);
  }

  // Compare with HTML fields
  logger.header('COMPARING WITH HTML FORM FIELDS');

  const htmlFieldsPath = '/tmp/html-field-list.txt';
  if (fs.existsSync(htmlFieldsPath)) {
    const htmlFields = fs.readFileSync(htmlFieldsPath, 'utf-8')
      .split('\n')
      .filter(f => f.trim());

    logger.info(`HTML form has ${htmlFields.length} fields`);

    const incidentFields = allResults['Incident Report'] || [];
    const pdfFieldNames = incidentFields.map(f => f.name);

    const missing = htmlFields.filter(hf => !pdfFieldNames.includes(hf));

    if (missing.length > 0) {
      logger.warn(`${missing.length} HTML fields NOT in PDF template:`);
      missing.slice(0, 20).forEach(f => logger.info(`  - ${f}`));
      if (missing.length > 20) {
        logger.info(`  ... and ${missing.length - 20} more`);
      }

      // Save missing fields
      const missingPath = path.join(__dirname, '../output/missing-pdf-fields.txt');
      fs.writeFileSync(missingPath, missing.join('\n'));
      logger.success(`Missing fields list saved to: ${missingPath}`);
    } else {
      logger.success('All HTML fields are present in PDF!');
    }
  } else {
    logger.warn('HTML field list not found at /tmp/html-field-list.txt');
  }

  logger.header('EXTRACTION COMPLETE');
  return allResults;
}

// Run extraction
if (require.main === module) {
  analyzePdfTemplate()
    .then(() => {
      logger.success('PDF template analysis complete!');
      process.exit(0);
    })
    .catch(error => {
      logger.error(`Fatal error: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { extractPdfFields, analyzePdfTemplate };
