/**
 * Puppeteer Configuration for Railway Deployment
 *
 * UPDATED: Use Puppeteer's bundled Chromium instead of system Chromium.
 * The nixpacks.toml installs the required system libraries (fonts, libasound, etc.)
 * but Puppeteer downloads its own compatible Chrome binary.
 */

const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // DO NOT skip download - let Puppeteer download its bundled Chromium
  // This is the most reliable approach for Railway
  skipDownload: false,

  // DO NOT set executablePath - let Puppeteer use its bundled Chrome
  // Setting this to a non-existent path causes failures
  // executablePath: undefined (not set)

  // Cache directory for downloaded browser
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
};
