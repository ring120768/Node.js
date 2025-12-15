// Test script to email the generated PDF
const { sendTemplateEmail } = require('./lib/emailService');
const path = require('path');
require('dotenv').config();

const USER_ID = '35a7475f-60ca-4c5d-bc48-d13a299f4309';
const USER_EMAIL = 'ian.ring@sky.com';
const USER_NAME = 'Ian Ring';

async function emailTestPdf() {
  console.log('📧 Preparing to email test PDF...\n');

  const pdfPath = path.join(__dirname, 'test-output', `filled-form-${USER_ID}.pdf`);

  try {
    console.log('📄 PDF Location:', pdfPath);
    console.log('📧 Recipient:', USER_EMAIL);
    console.log('👤 User Name:', USER_NAME);
    console.log('\n📤 Sending email...\n');

    const result = await sendTemplateEmail(
      USER_EMAIL,
      'Car Crash Lawyer AI - Test PDF Report (Field Audit Verification)',
      'incident-report-ready',
      {
        userName: USER_NAME,
        reportLink: 'https://carcrashlawyerai.co.uk/dashboard'
      },
      {
        attachments: [
          {
            filename: `incident-report-${USER_ID}.pdf`,
            path: pdfPath
          }
        ]
      }
    );

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log('\n📧 Check your inbox at:', USER_EMAIL);
      console.log('\n💡 Purpose: Visual inspection of PDF field completeness after audit fixes');
    } else {
      console.error('❌ Email failed to send');
    }

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check SMTP credentials in .env');
    console.error('2. Verify PDF exists at:', pdfPath);
    console.error('3. Check email template exists: templates/emails/incident-report-ready.html');
  }
}

emailTestPdf();
