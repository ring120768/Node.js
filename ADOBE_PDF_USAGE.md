# Adobe PDF Services - Usage Guide

This guide shows you how to use the Adobe PDF Services integration in your application.

## Quick Start

```javascript
const adobePdfService = require('./src/services/adobePdfService');

// Check if service is ready
if (adobePdfService.isReady()) {
  console.log('Adobe PDF Services is ready!');
} else {
  console.log('Please add credentials to /credentials/pdfservices-api-credentials.json');
}
```

## Common Use Cases

### 1. Create PDF from HTML (Enhanced Report Generation)

Replace or enhance your current PDF generation:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function generateEnhancedPdf(userId, reportData) {
  try {
    // Build your HTML template (can use same template as before)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial; }
            h1 { color: #2196F3; }
            .section { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Incident Report for ${reportData.user.fullName}</h1>
          <div class="section">
            <h2>Incident Details</h2>
            <p><strong>Date:</strong> ${reportData.incident.date}</p>
            <p><strong>Location:</strong> ${reportData.incident.location}</p>
          </div>
          <div class="section">
            <h2>Personal Statement</h2>
            <p>${reportData.statement}</p>
          </div>
        </body>
      </html>
    `;

    // Generate PDF using Adobe (higher quality than most libraries)
    const pdfBuffer = await adobePdfService.createPdfFromHtml(htmlContent);

    // Save to Supabase or send via email
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
```

### 2. Compress PDFs Before Storage

Save storage space and bandwidth:

```javascript
const adobePdfService = require('./src/services/adobePdfService');
const fs = require('fs');

async function compressAndStore(pdfPath) {
  try {
    // Compress the PDF (HIGH compression for storage)
    const compressedBuffer = await adobePdfService.compressPdf(
      pdfPath,
      'HIGH' // Options: 'LOW', 'MEDIUM', 'HIGH'
    );

    // Save compressed version
    fs.writeFileSync('./output/compressed_report.pdf', compressedBuffer);

    console.log('PDF compressed successfully!');
    return compressedBuffer;
  } catch (error) {
    console.error('Error compressing PDF:', error);
    throw error;
  }
}
```

### 3. OCR Scanned Documents

Extract text from images/scanned documents uploaded by users:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function processScannedDocument(scannedPdfPath) {
  try {
    // Perform OCR to make PDF searchable
    const ocrBuffer = await adobePdfService.ocrPdf(scannedPdfPath);

    // Now you can extract text or search the PDF
    console.log('Document is now searchable!');
    return ocrBuffer;
  } catch (error) {
    console.error('Error processing scanned document:', error);
    throw error;
  }
}
```

### 4. Merge Multiple PDFs

Combine incident report + supporting documents:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function createCompleteReport(userId) {
  try {
    const pdfPaths = [
      `./reports/${userId}_incident.pdf`,
      `./reports/${userId}_police_report.pdf`,
      `./reports/${userId}_medical_records.pdf`
    ];

    // Merge all PDFs into one
    const mergedBuffer = await adobePdfService.mergePdfs(pdfPaths);

    console.log('All documents merged successfully!');
    return mergedBuffer;
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
}
```

### 5. Protect Sensitive PDFs

Add password protection to reports:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function protectReport(pdfPath, userId) {
  try {
    // Generate secure password (or use user's password)
    const userPassword = `Report_${userId}_${Date.now()}`;

    // Protect the PDF
    const protectedBuffer = await adobePdfService.protectPdf(
      pdfPath,
      userPassword,  // Password to open
      userPassword   // Password to modify (optional)
    );

    console.log('PDF protected with password:', userPassword);
    return { buffer: protectedBuffer, password: userPassword };
  } catch (error) {
    console.error('Error protecting PDF:', error);
    throw error;
  }
}
```

### 6. Convert PDF to Word

Allow users to edit their reports in Word:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function convertToEditable(pdfPath) {
  try {
    // Convert PDF to Word document
    const docxBuffer = await adobePdfService.pdfToWord(pdfPath);

    // Send to user or save
    console.log('PDF converted to Word successfully!');
    return docxBuffer;
  } catch (error) {
    console.error('Error converting PDF:', error);
    throw error;
  }
}
```

### 7. Extract Text and Data

Parse PDFs to extract specific information:

```javascript
const adobePdfService = require('./src/services/adobePdfService');

async function extractReportData(pdfPath) {
  try {
    // Extract text, tables, and structure
    const extracted = await adobePdfService.extractPdfContent(pdfPath);

    // The result is a ZIP file with JSON containing:
    // - All text from the PDF
    // - Tables as structured data
    // - Document structure
    console.log('Content extracted:', extracted.zipPath);

    // You can then parse the JSON to search for specific data
    return extracted;
  } catch (error) {
    console.error('Error extracting content:', error);
    throw error;
  }
}
```

## Integration with Existing PDF Controller

You can easily integrate this into your existing `pdf.controller.js`:

```javascript
// In src/controllers/pdf.controller.js

const adobePdfService = require('../services/adobePdfService');

// Replace or enhance existing generatePDF function
async function generatePdf(req, res) {
  const { create_user_id } = req.body;

  try {
    // Fetch data (same as before)
    const allData = await fetchAllData(create_user_id);

    // Option 1: Use Adobe to create PDF from HTML
    if (adobePdfService.isReady()) {
      const htmlTemplate = generateHtmlTemplate(allData);
      const pdfBuffer = await adobePdfService.createPdfFromHtml(htmlTemplate);

      // Compress for storage
      const compressedBuffer = await adobePdfService.compressPdf(
        pdfBuffer,
        'MEDIUM'
      );

      // Store and send as before
      await storeCompletedForm(create_user_id, compressedBuffer, allData);
    } else {
      // Fallback to your existing PDF generation
      const pdfBuffer = await generatePDF(allData);
      await storeCompletedForm(create_user_id, pdfBuffer, allData);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('PDF generation failed:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}
```

## Best Practices

### 1. Always Check if Service is Ready

```javascript
if (!adobePdfService.isReady()) {
  // Fallback to alternative method or show error
  throw new Error('Adobe PDF Services not configured');
}
```

### 2. Handle Errors Gracefully

```javascript
try {
  const pdfBuffer = await adobePdfService.createPdfFromHtml(html);
  return pdfBuffer;
} catch (error) {
  logger.error('Adobe PDF error, using fallback:', error);
  // Use your existing PDF generation as fallback
  return await generatePDF(data);
}
```

### 3. Clean Up Temp Files

The service automatically cleans up most temp files, but for long-running operations:

```javascript
const path = require('path');
const fs = require('fs');

// Periodically clean temp directory
const tempDir = path.join(__dirname, '../temp');
fs.readdir(tempDir, (err, files) => {
  if (err) return;
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    const now = Date.now();
    const ageInHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);

    // Delete files older than 24 hours
    if (ageInHours > 24) {
      fs.unlinkSync(filePath);
    }
  });
});
```

### 4. Monitor API Usage

Adobe PDF Services has usage limits:
- Free tier: 500 document transactions/month
- Track your usage in Adobe Console

### 5. Compress PDFs Before Storage

```javascript
// Always compress before storing to save space
const pdfBuffer = await adobePdfService.createPdfFromHtml(html);
const compressedBuffer = await adobePdfService.compressPdf(pdfBuffer, 'HIGH');
// Store compressedBuffer instead of pdfBuffer
```

## Environment Variables (Optional)

You can add Adobe-specific config to your `.env`:

```env
# Adobe PDF Services
ADOBE_PDF_ENABLED=true
ADOBE_PDF_COMPRESSION_LEVEL=MEDIUM
ADOBE_PDF_OCR_ENABLED=true
```

Then in your config:

```javascript
// src/config/index.js
module.exports = {
  adobe: {
    pdfEnabled: process.env.ADOBE_PDF_ENABLED === 'true',
    compressionLevel: process.env.ADOBE_PDF_COMPRESSION_LEVEL || 'MEDIUM',
    ocrEnabled: process.env.ADOBE_PDF_OCR_ENABLED === 'true'
  }
};
```

## Troubleshooting

### Service not initializing
- Check credentials file exists: `/credentials/pdfservices-api-credentials.json`
- Verify JSON format is correct
- Check server logs for specific error messages

### "Rate limit exceeded"
- You've reached your monthly quota
- Upgrade your Adobe subscription
- Optimize to reduce unnecessary API calls

### PDF generation fails
- Check input HTML is valid
- Verify file paths are correct
- Check temp directory has write permissions

## Support

- Service code: `/src/services/adobePdfService.js`
- Setup instructions: `/credentials/README.md`
- Adobe Documentation: https://developer.adobe.com/document-services/docs/

For issues specific to this integration, check the server logs for detailed error messages.
