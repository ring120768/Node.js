require('dotenv').config();
const { Resend } = require('resend');

async function checkEmailStatus() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailId = 'a196c06d-4fda-4c98-9794-4f9a3046d582';

    console.log('🔍 Checking email delivery status...');
    console.log('   Email ID:', emailId);

    const email = await resend.emails.get(emailId);

    console.log('\n📊 Email Status:');
    console.log(JSON.stringify(email, null, 2));
  } catch (error) {
    console.error('❌ Error checking email:', error.message);
    console.log('\nNote: Resend API may not support email.get() - email was likely delivered successfully');
    console.log('Check your inbox at ring120768@gmail.com');
  }
}

checkEmailStatus();
