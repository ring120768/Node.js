/**
 * HTML to PDF Converter Service (Puppeteer)
 *
 * Purpose: Convert rendered HTML to PDF using headless Chrome
 * Used by: src/services/adobePdfFormFillerService.js (hybrid PDF generation)
 *
 * Flow:
 * 1. Launch headless Chrome browser
 * 2. Create new page with HTML content
 * 3. Generate PDF with print CSS enabled
 * 4. Return PDF buffer
 * 5. Close browser
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const fs = require('fs');
const logger = require('../utils/logger');

class HtmlToPdfConverter {
  constructor() {
    this.browserInstance = null;
    this.browserLaunchPromise = null; // Fix race condition for concurrent calls
    this.chromiumPath = null; // Cached Chromium path
  }

  /**
   * Find Chromium executable path
   * Tries multiple locations for Railway/Nixpacks compatibility
   */
  findChromiumPath() {
    console.log('🔍 Finding Chromium path...');

    if (this.chromiumPath) {
      console.log('   Using cached path:', this.chromiumPath);
      return this.chromiumPath;
    }

    // Check env var first
    console.log('   PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH || 'not set');
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      this.chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      logger.info('Using Chromium from PUPPETEER_EXECUTABLE_PATH', { path: this.chromiumPath });
      console.log('   ✅ Using Chromium from env:', this.chromiumPath);
      return this.chromiumPath;
    }

    // Common paths to try
    const candidatePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];

    console.log('   Checking standard paths...');
    for (const chromePath of candidatePaths) {
      const exists = fs.existsSync(chromePath);
      console.log(`   ${exists ? '✅' : '❌'} ${chromePath}`);
      if (exists) {
        this.chromiumPath = chromePath;
        logger.info('Found Chromium at standard path', { path: this.chromiumPath });
        return this.chromiumPath;
      }
    }

    // Try to find in Nix store (Railway/Nixpacks)
    console.log('   Searching Nix store...');
    try {
      const nixPath = execSync('find /nix/store -name chromium -type f -executable 2>/dev/null | grep -E "/bin/chromium$" | head -n 1', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();

      console.log('   Nix store result:', nixPath || '(empty)');
      if (nixPath && fs.existsSync(nixPath)) {
        this.chromiumPath = nixPath;
        logger.info('Found Chromium in Nix store', { path: this.chromiumPath });
        console.log('   ✅ Using Chromium from Nix store:', this.chromiumPath);
        return this.chromiumPath;
      }
    } catch (e) {
      console.log('   ❌ Nix store search failed:', e.message);
      // Nix store search failed, continue to fallback
    }

    // Let Puppeteer use its bundled Chromium
    console.log('   ⚠️ No system Chromium found, using Puppeteer bundled browser');
    logger.warn('No system Chromium found, using Puppeteer bundled browser');
    return undefined;
  }

  /**
   * Get or create browser instance (singleton pattern for performance)
   * Reusing browser instance saves ~2 seconds per PDF
   *
   * RACE CONDITION FIX: Multiple concurrent calls will share the same launch promise
   *
   * @returns {Promise<Browser>} Puppeteer browser instance
   */
  async getBrowser() {
    // If browser exists and is connected, return it immediately
    if (this.browserInstance && this.browserInstance.isConnected()) {
      return this.browserInstance;
    }

    // If browser is currently being launched, wait for that promise
    if (this.browserLaunchPromise) {
      logger.info('Waiting for existing browser launch to complete...');
      return this.browserLaunchPromise;
    }

    // Find Chromium path
    const executablePath = this.findChromiumPath();

    // Launch browser (only one call will reach here due to promise caching)
    logger.info('Launching headless Chrome browser', { executablePath: executablePath || 'bundled' });

    this.browserLaunchPromise = puppeteer.launch({
      headless: 'new', // Use new headless mode (faster)
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Use /tmp instead of /dev/shm
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Required for Railway containers
        '--disable-gpu',
        // Additional memory optimization flags
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-component-extensions-with-background-pages',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--password-store=basic',
        '--use-mock-keychain',
        // Additional flags for Railway container stability
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-shm-usage', // Prevent /dev/shm issues in containers
        // Note: --single-process can cause crashes with complex pages, use separate processes
        '--no-zygote', // Disable zygote process (but keep multi-process)
        '--disable-setuid-sandbox', // Required for containers without setuid
        '--js-flags=--max-old-space-size=768' // Increase JS heap for Railway (was 512)
      ]
    }).then(browser => {
      this.browserInstance = browser;
      this.browserLaunchPromise = null; // Clear promise once complete
      logger.info('Browser launched successfully');
      console.log('✅ Browser launched successfully');
      return browser;
    }).catch(error => {
      this.browserLaunchPromise = null; // Clear promise on error
      // Enhanced error logging for Railway debugging
      console.error('❌ BROWSER LAUNCH FAILED');
      console.error('   Executable path:', executablePath || 'bundled (puppeteer default)');
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      logger.error('BROWSER_LAUNCH_FAILED', {
        error: error.message,
        stack: error.stack,
        executablePath: executablePath || 'bundled',
        nodeEnv: process.env.NODE_ENV,
        railway: process.env.RAILWAY_ENVIRONMENT || 'not set'
      });
      throw error;
    });

    return this.browserLaunchPromise;
  }

  /**
   * Convert single HTML string to PDF buffer
   *
   * @param {string} html - Rendered HTML content
   * @param {object} options - PDF generation options
   * @param {string} options.format - Page format (default: 'A4')
   * @param {boolean} options.printBackground - Print background graphics (default: true)
   * @param {string} options.pageNumber - Page number for logging (optional)
   * @returns {Promise<Buffer>} PDF buffer
   */
  async convertHtmlToPdf(html, options = {}) {
    const {
      format = 'A4',
      printBackground = true,
      pageNumber = 'unknown'
    } = options;

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      logger.info(`Converting HTML to PDF: Page ${pageNumber}`);

      // Enable console logging from browser to catch errors
      page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error' || type === 'warning') {
          logger.warn(`Browser console [${type}] Page ${pageNumber}:`, text);
        }
      });
      page.on('pageerror', error => {
        logger.error(`Browser error Page ${pageNumber}:`, error.message);
      });
      page.on('requestfailed', request => {
        logger.warn(`Failed to load resource Page ${pageNumber}:`, {
          url: request.url(),
          failure: request.failure()?.errorText
        });
      });

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2 // Higher quality rendering
      });

      // CRITICAL: Provide base URL so relative paths (/images/logo.png) can resolve
      // This allows Puppeteer to load resources from the file system
      const baseUrl = `file://${process.cwd()}/public/`;

      // Set content and wait for resources
      // Use 'domcontentloaded' instead of 'networkidle0' to avoid blocking on failed CDN requests
      // Also add timeout to prevent hanging on Railway
      await page.setContent(html, {
        waitUntil: ['load', 'domcontentloaded'],
        timeout: 30000 // 30 second timeout
      });

      // Inject base tag to resolve relative URLs
      await page.evaluate((url) => {
        const base = document.createElement('base');
        base.href = url;
        document.head.insertBefore(base, document.head.firstChild);
      }, baseUrl);

      // Wait a moment for resources to load after base tag injection
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate PDF with timeout
      const pdfBuffer = await page.pdf({
        format,
        printBackground, // CRITICAL: Enable gradient backgrounds
        preferCSSPageSize: true, // Use @page CSS rules
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm'
        },
        timeout: 60000 // 60 second timeout for PDF generation
      });

      logger.info(`PDF generated: Page ${pageNumber}`, {
        sizeKB: (pdfBuffer.length / 1024).toFixed(2)
      });

      // Safe page close - ignore errors if connection already closed
      try {
        await page.close();
      } catch (closeError) {
        logger.warn(`Page close warning (Page ${pageNumber}):`, closeError.message);
      }

      return pdfBuffer;
    } catch (error) {
      logger.error(`Failed to convert HTML to PDF: Page ${pageNumber}`, {
        error: error.message,
        stack: error.stack
      });

      // Safe page close - ignore errors if connection already closed
      try {
        await page.close();
      } catch (closeError) {
        logger.warn(`Page close warning on error (Page ${pageNumber}):`, closeError.message);
      }
      throw error;
    }
  }

  /**
   * Convert multiple HTML pages to PDF buffers (parallel processing)
   *
   * @param {object} htmlPages - Object with page13, page14, page15, page16 HTML strings
   * @returns {Promise<object>} Object with page13, page14, page15, page16 PDF buffers
   */
  async convertMultiplePages(htmlPages) {
    try {
      const entries = Object.entries(htmlPages);
      logger.info(`Converting ${entries.length} AI analysis page(s) to PDF (sequential for memory efficiency)`);

      const startTime = Date.now();
      const result = {};

      // Process pages sequentially to avoid memory spikes on Railway
      for (let i = 0; i < entries.length; i++) {
        const [key, html] = entries[i];
        logger.info(`Converting page ${i + 1}/${entries.length}: ${key}`);
        result[key] = await this.convertHtmlToPdf(html, { pageNumber: key || i + 1 });

        // Force garbage collection hint between pages
        if (global.gc) {
          global.gc();
        }
      }

      const totalSizeKB = (Object.values(result).reduce((sum, b) => sum + b.length, 0) / 1024).toFixed(2);
      const duration = Date.now() - startTime;

      logger.info('All pages converted to PDF', {
        durationMs: duration,
        totalSizeKB,
        pages: entries.map(([key]) => key)
      });

      return result;
    } catch (error) {
      logger.error('Failed to convert multiple pages', { error: error.message });
      throw error;
    }
  }

  /**
   * Close browser instance (cleanup)
   * Should be called on server shutdown
   */
  async closeBrowser() {
    if (this.browserInstance && this.browserInstance.isConnected()) {
      logger.info('Closing browser instance');
      await this.browserInstance.close();
      this.browserInstance = null;
    }
  }

  /**
   * Health check - verify Puppeteer is working
   * @returns {Promise<boolean>} True if working
   * @throws {Error} If Puppeteer fails (with detailed error message)
   */
  async healthCheck() {
    try {
      console.log('🔍 Puppeteer health check starting...');
      const browser = await this.getBrowser();
      console.log('✅ Browser obtained');
      const page = await browser.newPage();
      console.log('✅ New page created');
      await page.setContent('<html><body><h1>Test</h1></body></html>');
      console.log('✅ Content set');
      const pdf = await page.pdf({ format: 'A4' });
      console.log('✅ PDF generated, size:', pdf.length);
      await page.close();

      return pdf.length > 0;
    } catch (error) {
      console.error('❌ Puppeteer health check failed:', error.message);
      logger.error('Puppeteer health check failed', { error: error.message, stack: error.stack });
      // Throw error so health endpoint can return details
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new HtmlToPdfConverter();
