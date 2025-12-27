/**
 * Send PDF via email using Resend
 * Usage: node send-pdf-email.js
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { sendEmails } = require('./lib/emailService');

async function sendPdfEmail() {
  try {
    console.log('📧 Preparing to send PDF via email...\n');

    // Configuration
    const userId = 'e4ad7c54-c860-4658-83e9-41130c5ae58f';
    const userEmail = 'ian.ring@sky.com';
    const pdfPath = path.join(__dirname, 'test-output', `filled-form-${userId}.pdf`);

    // Read PDF as buffer
    console.log(`📄 Reading PDF: ${pdfPath}`);
    const pdfBuffer = await fs.readFile(pdfPath);
    console.log(`✅ PDF loaded: ${(pdfBuffer.length / 1024).toFixed(1)} KB\n`);

    // Send email
    console.log(`📨 Sending to: ${userEmail}`);
    console.log(`📋 User ID: ${userId}\n`);

    const result = await sendEmails(userEmail, pdfBuffer, userId);

    if (result.success) {
      console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
      console.log(`   User Email ID: ${result.userEmailId}`);
      console.log(`   Accounts Email ID: ${result.accountsEmailId || 'N/A'}`);
      console.log(`   Delivered to: ${result.deliveredTo}`);
    } else {
      console.error('\n❌ EMAIL FAILED!');
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ SCRIPT ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
sendPdfEmail();
