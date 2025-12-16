/**
 * Manually Send PDF Email
 * Sends the generated PDF to the user who didn't receive it
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

// Import email and PDF services
const emailService = require('../lib/emailService');
const pdfController = require('../src/controllers/pdf.controller');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendPDFEmailManually(userId) {
  console.log('📧 Manual PDF Email Sending Tool\n');
  console.log(`User ID: ${userId}\n`);

  try {
    // Generate PDF for this user
    console.log('📄 Generating PDF...');
    const result = await pdfController.generateUserPDF(userId, 'manual-resend');

    if (result.success) {
      console.log('✅ PDF generated and emailed successfully!');
      console.log(`   Form ID: ${result.form_id}`);
      console.log(`   Email Sent: ${result.email_sent}`);
      console.log(`   Timestamp: ${result.timestamp}\n`);

      if (result.email_sent) {
        console.log('🎉 Email delivered successfully to user and accounts@carcrashlawyerai.com');
      } else {
        console.log('⚠️ PDF generated but email sending failed');
        console.log('   Check SMTP configuration');
      }
    } else {
      console.error('❌ PDF generation failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: User ID required');
  console.error('Usage: node scripts/send-pdf-email-manual.js <user-uuid>');
  process.exit(1);
}

sendPDFEmailManually(userId);
