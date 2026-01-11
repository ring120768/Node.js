/**
 * Capture Google Play Store Screenshots
 * Dimensions: 1080 x 1920 pixels (9:16 ratio)
 * Requirements: 4-6 screenshots showing key app features
 *
 * Screenshots to capture:
 * 1. Homepage/Welcome Screen
 * 2. Form Page Example (Page 3-4)
 * 3. Photo Upload Interface
 * 4. Success/Completion Screen
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '../android/screenshots');
const VIEWPORT = {
  width: 1080,
  height: 1920,
  deviceScaleFactor: 2
};

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Helper function for delays (replaces deprecated waitForTimeout)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureScreenshots() {
  console.log('📸 Starting screenshot capture for Google Play Store...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    // Screenshot 1: Homepage/Welcome Screen
    console.log('1️⃣  Capturing homepage...');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'screenshot-1-homepage.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: screenshot-1-homepage.png\n');

    // Screenshot 2: Form Page Example (Page 3 - Incident Details)
    console.log('2️⃣  Capturing form page (Page 3)...');
    await page.goto(`${BASE_URL}/incident-form-page3.html`, { waitUntil: 'networkidle0' });
    // Wait a moment for any animations
    await delay(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'screenshot-2-form-page.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: screenshot-2-form-page.png\n');

    // Screenshot 3: Photo Upload Interface (Page 7)
    console.log('3️⃣  Capturing photo upload interface...');
    await page.goto(`${BASE_URL}/incident-form-page7.html`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'screenshot-3-photo-upload.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: screenshot-3-photo-upload.png\n');

    // Screenshot 4: Dashboard (if accessible)
    console.log('4️⃣  Capturing dashboard...');
    try {
      await page.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle0' });
      await delay(1000);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'screenshot-4-dashboard.png'),
        fullPage: false
      });
      console.log('   ✅ Saved: screenshot-4-dashboard.png\n');
    } catch (err) {
      console.log('   ⚠️  Dashboard requires authentication - skipping\n');
    }

    // Screenshot 5: Form progress example (Page 6)
    console.log('5️⃣  Capturing mid-form progress...');
    await page.goto(`${BASE_URL}/incident-form-page6.html`, { waitUntil: 'networkidle0' });
    await delay(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'screenshot-5-form-progress.png'),
      fullPage: false
    });
    console.log('   ✅ Saved: screenshot-5-form-progress.png\n');

    // Verify all screenshots
    console.log('📊 Screenshot Summary:\n');
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));

    for (const file of files) {
      const filePath = path.join(SCREENSHOTS_DIR, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      console.log(`   ✅ ${file} - ${sizeKB} KB`);
    }

    console.log(`\n✨ Total screenshots captured: ${files.length}`);
    console.log(`📁 Location: ${SCREENSHOTS_DIR}`);

    console.log('\n🎉 Next steps:');
    console.log('   1. Review screenshots in: android/screenshots/');
    console.log('   2. Verify dimensions are exactly 1080×1920');
    console.log('   3. Upload to Google Play Console when ready');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
