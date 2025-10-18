/**
 * Adobe PDF Services Integration
 * Provides advanced PDF operations using Adobe Acrobat Pro API
 *
 * Features:
 * - Create PDFs from HTML, Word, images
 * - Merge multiple PDFs
 * - Compress PDFs
 * - OCR (extract text from scanned documents)
 * - PDF to Word/Excel conversion
 * - Protect PDFs with passwords
 * - Extract PDF content
 */

const PDFServicesSdk = require('@adobe/pdfservices-node-sdk');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class AdobePdfService {
  constructor() {
    this.initialized = false;
    this.credentials = null;
    this.initializeCredentials();
  }

  /**
   * Initialize Adobe credentials
   */
  initializeCredentials() {
    try {
      const credentialsPath = path.join(__dirname, '../../credentials/pdfservices-api-credentials.json');

      if (fs.existsSync(credentialsPath)) {
        this.credentials = PDFServicesSdk.Credentials
          .servicePrincipalCredentialsBuilder()
          .fromFile(credentialsPath)
          .build();

        this.initialized = true;
        logger.info('✅ Adobe PDF Services initialized successfully');
      } else {
        logger.warn('⚠️ Adobe PDF credentials not found. Place pdfservices-api-credentials.json in /credentials directory');
        logger.warn('📥 Download from: https://acrobatservices.adobe.com/dc-integration-creation-app-cdn/main.html');
      }
    } catch (error) {
      logger.error('Failed to initialize Adobe PDF Services:', error);
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.initialized && this.credentials !== null;
  }

  /**
   * Create PDF from HTML
   * @param {string} htmlContent - HTML content to convert
   * @param {string} outputPath - Path to save the PDF
   * @returns {Promise<Buffer>} PDF buffer
   */
  async createPdfFromHtml(htmlContent, outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      // Create temp HTML file
      const tempHtmlPath = path.join(__dirname, '../../temp', `temp_${Date.now()}.html`);
      fs.mkdirSync(path.dirname(tempHtmlPath), { recursive: true });
      fs.writeFileSync(tempHtmlPath, htmlContent);

      // Create execution context
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);

      // Create operation
      const htmlToPDFOperation = PDFServicesSdk.CreatePDF.Operation.createNew();

      // Set input
      const input = PDFServicesSdk.FileRef.createFromLocalFile(tempHtmlPath);
      htmlToPDFOperation.setInput(input);

      // Execute operation
      const result = await htmlToPDFOperation.execute(executionContext);

      // Save to output path or temp
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `output_${Date.now()}.pdf`);
      await result.saveAsFile(finalOutputPath);

      // Read as buffer
      const pdfBuffer = fs.readFileSync(finalOutputPath);

      // Cleanup temp files
      fs.unlinkSync(tempHtmlPath);
      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info('✅ PDF created from HTML successfully');
      return pdfBuffer;
    } catch (error) {
      logger.error('Error creating PDF from HTML:', error);
      throw error;
    }
  }

  /**
   * Merge multiple PDFs into one
   * @param {Array<string>} pdfPaths - Array of PDF file paths to merge
   * @param {string} outputPath - Path to save merged PDF
   * @returns {Promise<Buffer>} Merged PDF buffer
   */
  async mergePdfs(pdfPaths, outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const combineFilesOperation = PDFServicesSdk.CombineFiles.Operation.createNew();

      // Add all PDF files
      for (const pdfPath of pdfPaths) {
        const source = PDFServicesSdk.FileRef.createFromLocalFile(pdfPath);
        combineFilesOperation.addInput(source);
      }

      // Execute operation
      const result = await combineFilesOperation.execute(executionContext);

      // Save result
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `merged_${Date.now()}.pdf`);
      await result.saveAsFile(finalOutputPath);

      // Read as buffer
      const pdfBuffer = fs.readFileSync(finalOutputPath);

      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info(`✅ Merged ${pdfPaths.length} PDFs successfully`);
      return pdfBuffer;
    } catch (error) {
      logger.error('Error merging PDFs:', error);
      throw error;
    }
  }

  /**
   * Compress PDF
   * @param {string} inputPath - Input PDF path
   * @param {string} compressionLevel - 'LOW', 'MEDIUM', or 'HIGH'
   * @param {string} outputPath - Output path
   * @returns {Promise<Buffer>} Compressed PDF buffer
   */
  async compressPdf(inputPath, compressionLevel = 'MEDIUM', outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const compressPDFOperation = PDFServicesSdk.CompressPDF.Operation.createNew();

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      compressPDFOperation.setInput(input);

      // Set compression level
      const compressionLevelMap = {
        'LOW': PDFServicesSdk.CompressPDF.CompressionLevel.LOW,
        'MEDIUM': PDFServicesSdk.CompressPDF.CompressionLevel.MEDIUM,
        'HIGH': PDFServicesSdk.CompressPDF.CompressionLevel.HIGH
      };

      compressPDFOperation.setCompressionLevel(compressionLevelMap[compressionLevel] || compressionLevelMap.MEDIUM);

      // Execute
      const result = await compressPDFOperation.execute(executionContext);

      // Save result
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `compressed_${Date.now()}.pdf`);
      await result.saveAsFile(finalOutputPath);

      const pdfBuffer = fs.readFileSync(finalOutputPath);

      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info('✅ PDF compressed successfully');
      return pdfBuffer;
    } catch (error) {
      logger.error('Error compressing PDF:', error);
      throw error;
    }
  }

  /**
   * OCR - Extract text from scanned PDF
   * @param {string} inputPath - Scanned PDF path
   * @param {string} outputPath - Output searchable PDF path
   * @returns {Promise<Buffer>} Searchable PDF buffer
   */
  async ocrPdf(inputPath, outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const ocrOperation = PDFServicesSdk.OCR.Operation.createNew();

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      ocrOperation.setInput(input);

      // Execute OCR
      const result = await ocrOperation.execute(executionContext);

      // Save result
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `ocr_${Date.now()}.pdf`);
      await result.saveAsFile(finalOutputPath);

      const pdfBuffer = fs.readFileSync(finalOutputPath);

      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info('✅ OCR completed successfully');
      return pdfBuffer;
    } catch (error) {
      logger.error('Error performing OCR:', error);
      throw error;
    }
  }

  /**
   * Convert PDF to Word (DOCX)
   * @param {string} inputPath - PDF path
   * @param {string} outputPath - Output DOCX path
   * @returns {Promise<Buffer>} DOCX buffer
   */
  async pdfToWord(inputPath, outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const exportPDFOperation = PDFServicesSdk.ExportPDF.Operation.createNew(
        PDFServicesSdk.ExportPDF.SupportedTargetFormats.DOCX
      );

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      exportPDFOperation.setInput(input);

      // Execute
      const result = await exportPDFOperation.execute(executionContext);

      // Save result
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `converted_${Date.now()}.docx`);
      await result.saveAsFile(finalOutputPath);

      const docxBuffer = fs.readFileSync(finalOutputPath);

      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info('✅ PDF converted to Word successfully');
      return docxBuffer;
    } catch (error) {
      logger.error('Error converting PDF to Word:', error);
      throw error;
    }
  }

  /**
   * Protect PDF with password
   * @param {string} inputPath - Input PDF path
   * @param {string} userPassword - Password to open the PDF
   * @param {string} ownerPassword - Password to modify the PDF (optional)
   * @param {string} outputPath - Output path
   * @returns {Promise<Buffer>} Protected PDF buffer
   */
  async protectPdf(inputPath, userPassword, ownerPassword = null, outputPath = null) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const protectPDFOperation = PDFServicesSdk.ProtectPDF.Operation.createNew();

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      protectPDFOperation.setInput(input);

      // Set passwords
      const protectPDFOptions = new PDFServicesSdk.ProtectPDF.options.PasswordProtectOptions.Builder()
        .setUserPassword(userPassword)
        .setOwnerPassword(ownerPassword || userPassword)
        .setEncryptionAlgorithm(PDFServicesSdk.ProtectPDF.options.EncryptionAlgorithm.AES_256)
        .build();

      protectPDFOperation.setOptions(protectPDFOptions);

      // Execute
      const result = await protectPDFOperation.execute(executionContext);

      // Save result
      const finalOutputPath = outputPath || path.join(__dirname, '../../temp', `protected_${Date.now()}.pdf`);
      await result.saveAsFile(finalOutputPath);

      const pdfBuffer = fs.readFileSync(finalOutputPath);

      if (!outputPath) {
        fs.unlinkSync(finalOutputPath);
      }

      logger.info('✅ PDF protected with password successfully');
      return pdfBuffer;
    } catch (error) {
      logger.error('Error protecting PDF:', error);
      throw error;
    }
  }

  /**
   * Extract PDF content (text, images, tables)
   * @param {string} inputPath - PDF path
   * @returns {Promise<Object>} Extracted content
   */
  async extractPdfContent(inputPath) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const extractPDFOperation = PDFServicesSdk.ExtractPDF.Operation.createNew();

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      extractPDFOperation.setInput(input);

      // Set options
      const options = new PDFServicesSdk.ExtractPDF.options.ExtractPdfOptions.Builder()
        .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TEXT)
        .addElementsToExtract(PDFServicesSdk.ExtractPDF.options.ExtractElementType.TABLES)
        .build();

      extractPDFOperation.setOptions(options);

      // Execute
      const result = await extractPDFOperation.execute(executionContext);

      // Save result to temp
      const outputZipPath = path.join(__dirname, '../../temp', `extract_${Date.now()}.zip`);
      await result.saveAsFile(outputZipPath);

      logger.info('✅ PDF content extracted successfully');

      // Note: The result is a ZIP file containing JSON with extracted content
      // You may want to unzip and parse it based on your needs
      return {
        success: true,
        zipPath: outputZipPath,
        message: 'Extracted content saved as ZIP file'
      };
    } catch (error) {
      logger.error('Error extracting PDF content:', error);
      throw error;
    }
  }

  /**
   * Split PDF into multiple pages
   * @param {string} inputPath - PDF path
   * @param {number} pageRanges - Array of page ranges like [{start: 1, end: 2}, {start: 3, end: 4}]
   * @returns {Promise<Array>} Array of split PDF buffers
   */
  async splitPdf(inputPath, pageRanges) {
    if (!this.isReady()) {
      throw new Error('Adobe PDF Services not initialized. Check credentials.');
    }

    try {
      const executionContext = PDFServicesSdk.ExecutionContext.create(this.credentials);
      const splitPDFOperation = PDFServicesSdk.SplitPDF.Operation.createNew();

      const input = PDFServicesSdk.FileRef.createFromLocalFile(inputPath);
      splitPDFOperation.setInput(input);

      // Set page ranges
      if (pageRanges && pageRanges.length > 0) {
        const pageRangesList = pageRanges.map(range =>
          new PDFServicesSdk.PageRanges().addRange(range.start, range.end)
        );
        splitPDFOperation.setPageRanges(pageRangesList);
      }

      // Execute
      const result = await splitPDFOperation.execute(executionContext);

      // Result is an array of FileRef objects
      const splitBuffers = [];
      for (let i = 0; i < result.length; i++) {
        const tempPath = path.join(__dirname, '../../temp', `split_${Date.now()}_${i}.pdf`);
        await result[i].saveAsFile(tempPath);
        const buffer = fs.readFileSync(tempPath);
        splitBuffers.push(buffer);
        fs.unlinkSync(tempPath);
      }

      logger.info(`✅ PDF split into ${splitBuffers.length} files successfully`);
      return splitBuffers;
    } catch (error) {
      logger.error('Error splitting PDF:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new AdobePdfService();
