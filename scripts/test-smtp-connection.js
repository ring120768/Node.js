/**
 * Test SMTP Connection
 * Verifies email service configuration
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPConnection() {
  console.log('🔍 Testing SMTP Connection...\n');

  console.log('📧 SMTP Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE}`);
  console.log(`   Email Enabled: ${process.env.EMAIL_ENABLED}\n`);

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Show debug output
    logger: true  // Log to console
  });

  try {
    console.log('🔄 Verifying SMTP connection...\n');
    await transporter.verify();
    console.log('\n✅ SMTP connection successful!');
    console.log('📧 Email service is ready to send emails\n');
    return true;
  } catch (error) {
    console.error('\n❌ SMTP connection failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check SMTP host is correct for your domain');
    console.error('2. Verify port (587 for TLS, 465 for SSL)');
    console.error('3. Confirm email credentials are correct');
    console.error('4. Check if firewall/security blocks SMTP\n');
    return false;
  }
}

testSMTPConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
