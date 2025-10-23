/**
 * Test Dashboard View Button
 * Captures console logs and tests image modal functionality
 */

const { chromium } = require('playwright');

async function testDashboardViewButton() {
  console.log('🚀 Starting dashboard View button test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture all console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log(`📋 Console: ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  try {
    // Navigate to dashboard with test user
    const url = 'http://localhost:3000/dashboard.html?user_id=4a32c60e-c7b8-431c-bfbf-9e27ea1c3fc0';
    console.log(`📍 Navigating to: ${url}\n`);

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for data to load

    console.log('\n✅ Page loaded successfully\n');

    // Check if we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      return !!window.currentUser;
    });

    if (!isAuthenticated) {
      console.log('⚠️  Not authenticated, might redirect to login');
      await page.waitForTimeout(5000);
      console.log('Current URL:', page.url());
      return;
    }

    console.log('✅ User authenticated\n');

    // Navigate to Images section
    console.log('🖼️  Navigating to Images section...');
    await page.click('text=View Photos');
    await page.waitForTimeout(1000);

    // Check how many images are rendered
    const imageCount = await page.locator('.item-card').count();
    console.log(`📸 Found ${imageCount} images\n`);

    if (imageCount === 0) {
      console.log('⚠️  No images found to test');
      await page.waitForTimeout(2000);
      await browser.close();
      return;
    }

    // Find the first View button
    console.log('🔍 Looking for View button...');
    const viewButton = page.locator('button[data-action="view"]').first();
    const buttonExists = await viewButton.count() > 0;

    if (!buttonExists) {
      console.log('❌ View button not found!');
      await page.waitForTimeout(2000);
      await browser.close();
      return;
    }

    console.log('✅ View button found\n');

    // Get button details
    const buttonData = await viewButton.evaluate(el => ({
      action: el.dataset.action,
      index: el.dataset.index,
      text: el.textContent
    }));
    console.log('📋 Button data:', JSON.stringify(buttonData, null, 2));

    // Click the View button
    console.log('\n🖱️  Clicking View button...\n');
    await viewButton.click();
    await page.waitForTimeout(1000);

    // Check if modal is visible
    const modalVisible = await page.locator('#imageModal.active').count() > 0;
    console.log(`\n${modalVisible ? '✅' : '❌'} Modal visible: ${modalVisible}\n`);

    if (modalVisible) {
      // Get modal content
      const modalTitle = await page.locator('#modalTitle').textContent();
      const modalImage = await page.locator('#modalImage').getAttribute('src');

      console.log('📋 Modal Details:');
      console.log(`   Title: ${modalTitle}`);
      console.log(`   Image: ${modalImage ? 'Loaded' : 'Not loaded'}\n`);

      console.log('🎉 SUCCESS! View button is working correctly!\n');
    } else {
      console.log('❌ FAILED: Modal did not appear\n');
    }

    // Print all console logs
    console.log('\n📜 All Console Logs:');
    console.log('━'.repeat(60));
    consoleLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`);
    });
    console.log('━'.repeat(60));

    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n💥 Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed\n');
  }
}

// Run the test
testDashboardViewButton().catch(console.error);
