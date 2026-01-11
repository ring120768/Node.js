require('dotenv').config();
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

async function sendAPKViaResend() {
  try {
    const apkPath = path.join(__dirname, 'public/CarCrashLawyerAI.apk');

    console.log('📧 Setting up email with Resend API...');
    console.log(`   File: ${apkPath}`);
    console.log(`   Size: ${(fs.statSync(apkPath).size / 1024 / 1024).toFixed(2)} MB`);

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Read APK file as base64
    const apkBuffer = fs.readFileSync(apkPath);
    const apkBase64 = apkBuffer.toString('base64');

    console.log('📤 Sending email via Resend API...');
    console.log(`   From: ${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}`);
    console.log(`   To: ring120768@gmail.com`);

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Car Crash Lawyer AI <onboarding@resend.dev>',
      to: ['ring120768@gmail.com'],
      subject: 'Car Crash Lawyer AI - Android APK (23MB)',
      html: `
        <h1>Your Car Crash Lawyer AI Android APK</h1>
        <p>The APK file is attached to this email (23MB).</p>

        <h2>Installation Instructions:</h2>
        <ol>
          <li><strong>Download the APK</strong> from the attachment below</li>
          <li>Open your <strong>Downloads</strong> folder on your Android phone</li>
          <li>Tap the <strong>CarCrashLawyerAI.apk</strong> file</li>
          <li>If prompted about "Install unknown apps", tap <strong>Settings</strong></li>
          <li>Enable <strong>Allow from this source</strong></li>
          <li>Go back and tap <strong>Install</strong></li>
          <li>Once installed, tap <strong>Open</strong></li>
        </ol>

        <h2>Requirements:</h2>
        <ul>
          <li>Android 7.0 (Nougat) or newer</li>
          <li>23MB free storage space</li>
        </ul>

        <h2>After Installation:</h2>
        <p>Log in with your credentials and complete an incident report to test the full system including:</p>
        <ul>
          <li>✅ Push notifications when PDF is ready</li>
          <li>✅ WhatsApp messages (once set up)</li>
          <li>✅ Email notifications</li>
        </ul>

        <h2>Troubleshooting:</h2>
        <p>If installation is blocked:</p>
        <ol>
          <li>Go to <strong>Settings</strong> → <strong>Security</strong></li>
          <li>Enable <strong>Unknown sources</strong> (Android 7-8)</li>
          <li>Or: <strong>Install unknown apps</strong> → Allow your file manager/Gmail (Android 9+)</li>
        </ol>

        <p><strong>Alternative:</strong> If the attachment doesn't download, the APK will also be available at:<br>
        <code>https://carcrashlawyerai.com/CarCrashLawyerAI.apk</code> (once Railway deploys)</p>

        <hr>
        <p style="color: #666; font-size: 12px;">
          This email was sent from Car Crash Lawyer AI notification system.<br>
          File: CarCrashLawyerAI.apk (23.07 MB)<br>
          SHA-256: (will be added in production for security verification)
        </p>
      `,
      attachments: [
        {
          filename: 'CarCrashLawyerAI.apk',
          content: apkBase64,
          contentType: 'application/vnd.android.package-archive'
        }
      ]
    });

    console.log('✅ Email sent successfully via Resend!');
    console.log('   Email ID:', result.data?.id || result.id);
    console.log('\n📱 Check your inbox at ring120768@gmail.com');
    console.log('   (May take 1-2 minutes to arrive)');
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.message.includes('API key')) {
      console.error('\n⚠️ Check RESEND_API_KEY in .env file');
    } else if (error.message.includes('attachment')) {
      console.error('\n⚠️ File may be too large (max 40MB for Resend)');
    }
    throw error;
  }
}

sendAPKViaResend();
