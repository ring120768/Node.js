/**
 * Puppeteer Configuration for Railway Deployment
 *
 * This configures Puppeteer to use the system-installed Chromium
 * on Railway instead of downloading its own copy.
 */

const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Tell Puppeteer to skip downloading Chromium during npm install
  skipDownload: true,

  // Use system-installed Chromium (provided by Railway via nixpacks.toml)
  // On Railway, this will be set by the PUPPETEER_EXECUTABLE_PATH env var
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
                  '/usr/bin/chromium-browser' ||
                  '/usr/bin/chromium',

  // Cache directory (Railway has limited disk space)
  cacheDirectory: join(__dirname, '.cache', 'puppeteer')
};
