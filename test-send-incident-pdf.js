/**
 * Send Test Email with Incident Report PDF
 *
 * Sends a generated incident report PDF via email to test the attachment fix.
 *
 * Run: node test-send-incident-pdf.js
 */

require('dotenv').config();

const fs = require('fs');
const emailService = require('./lib/emailService');

async function sendTestEmail() {
  try {
    console.log('========================================');
    console.log('📧 Incident Report PDF Email Test');
    console.log('========================================\n');

    // Check environment
    if (process.env.EMAIL_ENABLED !== 'true') {
      console.log('❌ EMAIL_ENABLED is not "true" in .env');
      process.exit(1);
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('❌ Missing SMTP credentials in .env');
      process.exit(1);
    }

    console.log('✅ Email configuration loaded\n');

    // Read the generated PDF
    console.log('📄 Reading incident report PDF...');
    const pdfPath = '/Users/ianring/Node.js/test-output/verification-5326c2aa.pdf';

    if (!fs.existsSync(pdfPath)) {
      console.log(`❌ PDF not found: ${pdfPath}`);
      console.log('   Run: node verify-pdf-generation.js <user-id> first');
      process.exit(1);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    console.log(`✅ PDF loaded: ${pdfSizeKB} KB`);
    console.log(`   File: ${pdfPath}\n`);

    // Send test email
    console.log('📨 Sending test email with PDF attachment...');
    console.log(`   To: accounts@carcrashlawyerai.com`);
    console.log(`   User ID: 5326c2aa-f1d5-4edc-a972-7fb14995ed0f\n`);

    const result = await emailService.sendEmails(
      'accounts@carcrashlawyerai.com',
      pdfBuffer,
      '5326c2aa-f1d5-4edc-a972-7fb14995ed0f'
    );

    if (!result.success) {
      console.log('❌ Email send failed:', result.error);
      process.exit(1);
    }

    console.log('========================================');
    console.log('✅ TEST EMAIL SENT SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('📬 Email Details:');
    console.log(`   User email ID: ${result.userEmailId}`);
    console.log(`   Accounts email ID: ${result.accountsEmailId}`);
    console.log(`   PDF size: ${pdfSizeKB} KB`);
    console.log(`   PDF pages: 18 (includes AI analysis on pages 13-16)\n`);

    console.log('📋 Verification Steps:');
    console.log('   1. Check inbox at: accounts@carcrashlawyerai.com');
    console.log('   2. Look for 2 emails with subject: "Traffic Accident Legal Report"');
    console.log('   3. Download the PDF attachment (Incident_Report_5326c2aa_*.pdf)');
    console.log('   4. Open the PDF and verify:');
    console.log('      - PDF opens without errors ✓');
    console.log('      - All 18 pages are visible ✓');
    console.log('      - Pages 1-12: Form fields filled correctly ✓');
    console.log('      - Page 13: Voice transcription (M25 Junction 15) ✓');
    console.log('      - Page 14: AI closing statement ✓');
    console.log('      - Page 15: AI summary ✓');
    console.log('      - Page 16: Final review ✓');
    console.log('      - Pages 17-18: Remaining form content ✓\n');

    console.log('🎉 Email test complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('💥 Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run test
sendTestEmail();
