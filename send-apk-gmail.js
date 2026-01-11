require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendAPKViaGmail() {
  try {
    const apkPath = path.join(__dirname, 'public/CarCrashLawyerAI.apk');

    console.log('📧 Setting up email with Gmail SMTP...');
    console.log(`   File: ${apkPath}`);
    console.log(`   Size: ${(fs.statSync(apkPath).size / 1024 / 1024).toFixed(2)} MB`);

    // Create transporter using Gmail SMTP from .env
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.SMTP_BACKUP_USER,
        pass: process.env.SMTP_BACKUP_PASS
      }
    });

    console.log('📤 Sending email via Gmail...');
    console.log(`   From: ${process.env.SMTP_BACKUP_USER}`);
    console.log(`   To: ring120768@gmail.com`);

    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_BACKUP_USER}>`,
      to: 'ring120768@gmail.com',
      subject: 'Car Crash Lawyer AI - Android APK (23MB)',
      html: `
        <h1>Your Car Crash Lawyer AI Android APK</h1>
        <p>The APK file is attached to this email (23MB).</p>

        <h2>Installation Instructions:</h2>
        <ol>
          <li>Download the APK file from this email attachment</li>
          <li>Open your Downloads folder on your Android phone</li>
          <li>Tap the <strong>CarCrashLawyerAI.apk</strong> file</li>
          <li>If prompted about "Install unknown apps", allow installation from your email app</li>
          <li>Follow the installation prompts</li>
        </ol>

        <h2>Requirements:</h2>
        <ul>
          <li>Android 7.0 or newer</li>
          <li>23MB storage space</li>
        </ul>

        <h2>After Installation:</h2>
        <p>Log in to the app and complete an incident report to test the push notification system.</p>

        <h2>Alternative Download Links:</h2>
        <p>If the attachment doesn't download, use one of these links:</p>
        <ul>
          <li><strong>GitHub:</strong> <a href="https://raw.githubusercontent.com/ring120768/Node.js/main/public/CarCrashLawyerAI.apk">Download from GitHub</a></li>
          <li><strong>Website:</strong> <a href="https://carcrashlawyerai.com/CarCrashLawyerAI.apk">Download from Website</a> (once Railway deploys)</li>
        </ul>

        <p>Best regards,<br>Car Crash Lawyer AI</p>
      `,
      attachments: [
        {
          filename: 'CarCrashLawyerAI.apk',
          path: apkPath,
          contentType: 'application/vnd.android.package-archive'
        }
      ]
    });

    console.log('✅ Email sent successfully via Gmail!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
    console.log('\n📱 Check your inbox at ring120768@gmail.com');
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('\n⚠️ Authentication failed. Gmail may require:');
      console.error('   1. App Password instead of account password');
      console.error('   2. "Less secure app access" enabled (not recommended)');
      console.error('   3. 2FA with App Password (recommended)');
    }
    throw error;
  }
}

sendAPKViaGmail();
