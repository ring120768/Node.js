require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendAPK() {
  try {
    const apkPath = path.join(__dirname, 'public/CarCrashLawyerAI.apk');

    console.log('📧 Setting up email with Hostinger SMTP...');
    console.log(`   File: ${apkPath}`);
    console.log(`   Size: ${(fs.statSync(apkPath).size / 1024 / 1024).toFixed(2)} MB`);

    // Create transporter using Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('📤 Sending email...');

    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_USER}>`,
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

        <p><strong>Alternative download link (once Railway deploys):</strong><br>
        <a href="https://carcrashlawyerai.com/CarCrashLawyerAI.apk">https://carcrashlawyerai.com/CarCrashLawyerAI.apk</a></p>

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

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('   Response:', result.response);
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
}

sendAPK();
