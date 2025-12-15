# Adobe PDF Services - Quick Reference Card

## 🚀 Getting Started (One-Time Setup)

```bash
# 1. Get credentials from Adobe
# Visit: https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html

# 2. Place credentials file
# Copy pdfservices-api-credentials.json to /credentials/

# 3. Test setup
node test-adobe-pdf.js
```

## 💻 Basic Usage

```javascript
const adobePdfService = require('./src/services/adobePdfService');

// Always check if ready first
if (!adobePdfService.isReady()) {
  console.log('Add credentials first!');
  return;
}
```

## 📄 Common Operations

### Create PDF from HTML
```javascript
const html = '<html><body><h1>Report</h1></body></html>';
const pdf = await adobePdfService.createPdfFromHtml(html);
```

### Compress PDF
```javascript
const compressed = await adobePdfService.compressPdf(
  './input.pdf',
  'HIGH' // 'LOW', 'MEDIUM', or 'HIGH'
);
```

### Merge Multiple PDFs
```javascript
const merged = await adobePdfService.mergePdfs([
  './doc1.pdf',
  './doc2.pdf',
  './doc3.pdf'
]);
```

### OCR (Make Searchable)
```javascript
const searchable = await adobePdfService.ocrPdf('./scanned.pdf');
```

### Convert to Word
```javascript
const docx = await adobePdfService.pdfToWord('./report.pdf');
```

### Password Protect
```javascript
const protected = await adobePdfService.protectPdf(
  './sensitive.pdf',
  'password123'
);
```

### Extract Text/Data
```javascript
const data = await adobePdfService.extractPdfContent('./document.pdf');
// Returns ZIP with JSON containing extracted content
```

### Split PDF
```javascript
const pages = await adobePdfService.splitPdf(
  './document.pdf',
  [
    {start: 1, end: 3},
    {start: 4, end: 6}
  ]
);
```

## 🔌 Integration Example

```javascript
// In your PDF controller
const adobePdfService = require('../services/adobePdfService');

async function generateReport(userId, data) {
  try {
    // Generate HTML
    const html = buildReportHtml(data);

    // Create PDF with Adobe
    let pdfBuffer;
    if (adobePdfService.isReady()) {
      pdfBuffer = await adobePdfService.createPdfFromHtml(html);

      // Compress to save space
      pdfBuffer = await adobePdfService.compressPdf(
        pdfBuffer,
        'MEDIUM'
      );
    } else {
      // Fallback to existing method
      pdfBuffer = await generatePDF(data);
    }

    // Store and return
    await storeInDatabase(userId, pdfBuffer);
    return pdfBuffer;

  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}
```

## 📊 API Limits

| Plan | Transactions/Month |
|------|-------------------|
| Free (Acrobat Pro) | 500 |
| Paid | Higher limits |

**Check usage:** https://www.adobe.io/console

## 🐛 Quick Troubleshooting

| Error | Solution |
|-------|----------|
| Not initialized | Add credentials file to `/credentials/` |
| Invalid credentials | Re-download from Adobe |
| Rate limit | Wait until next month or upgrade |
| File not found | Check file paths are correct |

## 📚 Documentation

| Resource | Location |
|----------|----------|
| Full Setup Guide | `ADOBE_SETUP_COMPLETE.md` |
| Usage Examples | `ADOBE_PDF_USAGE.md` |
| Test Script | `node test-adobe-pdf.js` |
| Service Code | `/src/services/adobePdfService.js` |

## 💡 Pro Tips

✅ **Always check** `isReady()` before calling methods
✅ **Compress PDFs** before storage to save space
✅ **Cache results** to reduce API calls
✅ **Handle errors** gracefully with try-catch
✅ **Monitor usage** to avoid hitting limits

## 🔗 Useful Links

- Get Credentials: https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html
- Adobe Console: https://www.adobe.io/console
- API Docs: https://developer.adobe.com/document-services/docs/

---

**Need help?** Check `ADOBE_PDF_USAGE.md` for detailed examples!
