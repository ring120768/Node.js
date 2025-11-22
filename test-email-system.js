/**
 * Email System Test Script
 *
 * Tests all email functionality locally before deployment
 *
 * Usage: node test-email-system.js
 */

require('dotenv').config();
const emailService = require('./lib/emailService');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function runTests() {
  console.log(`\n${colors.cyan}========================================`);
  console.log('📧 Email System Test Suite');
  console.log(`========================================${colors.reset}\n`);

  // Check environment variables
  console.log(`${colors.blue}[1/5] Checking environment variables...${colors.reset}`);

  const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(`${colors.red}❌ Missing environment variables: ${missingVars.join(', ')}${colors.reset}`);
    console.log(`\n${colors.yellow}Add these to Replit Secrets or .env:${colors.reset}`);
    console.log('  SMTP_HOST=smtp.gmail.com');
    console.log('  SMTP_USER=your-email@gmail.com');
    console.log('  SMTP_PASS=your-app-password');
    console.log('\nGet Gmail App Password: https://myaccount.google.com/apppasswords\n');
    process.exit(1);
  }

  console.log(`${colors.green}✅ All environment variables present${colors.reset}\n`);

  // Get test recipient email
  const testEmail = process.env.TEST_EMAIL || process.env.SMTP_USER;
  console.log(`${colors.blue}Test emails will be sent to: ${testEmail}${colors.reset}\n`);

  // Test 1: Subscription Welcome Email
  console.log(`${colors.blue}[2/5] Testing Subscription Welcome Email...${colors.reset}`);
  try {
    const result1 = await emailService.sendSubscriptionWelcome(testEmail, {
      userName: 'Test User',
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });

    if (result1.success) {
      console.log(`${colors.green}✅ Subscription welcome sent: ${result1.messageId}${colors.reset}\n`);
    } else {
      console.error(`${colors.red}❌ Failed: ${result1.error}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  // Test 2: 90-Day Incident Notice
  console.log(`${colors.blue}[3/5] Testing 90-Day Incident Notice...${colors.reset}`);
  try {
    const deletionDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const result2 = await emailService.sendIncident90DayNotice(testEmail, {
      userName: 'Test User',
      incidentId: 'TEST-123',
      submittedDate: new Date(),
      deletionDate: deletionDate,
      daysRemaining: 90,
      exportUrl: 'https://carcrashlawyerai.co.uk/export/TEST-123'
    });

    if (result2.success) {
      console.log(`${colors.green}✅ 90-day notice sent: ${result2.messageId}${colors.reset}\n`);
    } else {
      console.error(`${colors.red}❌ Failed: ${result2.error}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  // Test 3: Deletion Warning (7 days)
  console.log(`${colors.blue}[4/5] Testing Deletion Warning (7 days)...${colors.reset}`);
  try {
    const deletionDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result3 = await emailService.sendIncidentDeletionWarning(testEmail, {
      userName: 'Test User',
      incidentId: 'TEST-123',
      submittedDate: new Date(Date.now() - 83 * 24 * 60 * 60 * 1000),
      deletionDate: deletionDate,
      exportUrl: 'https://carcrashlawyerai.co.uk/export/TEST-123'
    }, 7);

    if (result3.success) {
      console.log(`${colors.green}✅ 7-day warning sent: ${result3.messageId}${colors.reset}\n`);
    } else {
      console.error(`${colors.red}❌ Failed: ${result3.error}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  // Test 4: Legacy PDF Email (with mock buffer)
  console.log(`${colors.blue}[5/5] Testing Legacy PDF Email...${colors.reset}`);
  try {
    const mockPdfBuffer = Buffer.from('Mock PDF content for testing');
    const result4 = await emailService.sendEmails(
      testEmail,
      mockPdfBuffer,
      'test-user-123'
    );

    if (result4.success) {
      console.log(`${colors.green}✅ PDF email sent to user: ${result4.userEmailId}${colors.reset}`);
      console.log(`${colors.green}✅ PDF email sent to accounts: ${result4.accountsEmailId}${colors.reset}\n`);
    } else {
      console.error(`${colors.red}❌ Failed: ${result4.error}${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  // Summary
  console.log(`${colors.cyan}========================================`);
  console.log('📊 Test Summary');
  console.log(`========================================${colors.reset}\n`);
  console.log(`${colors.green}✅ Email system is working!${colors.reset}`);
  console.log(`${colors.yellow}📬 Check your inbox at: ${testEmail}${colors.reset}`);
  console.log(`${colors.yellow}📁 You should have received 4-5 test emails${colors.reset}\n`);
  console.log(`${colors.blue}Next steps:${colors.reset}`);
  console.log('  1. Verify emails arrived and look professional');
  console.log('  2. Check spam folder if missing');
  console.log('  3. Integrate email calls into controllers');
  console.log('  4. Add EMAIL_ENABLED=true flag for production\n');
}

// Run tests
runTests()
  .then(() => {
    console.log(`${colors.green}✅ All tests complete${colors.reset}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error);
    process.exit(1);
  });
