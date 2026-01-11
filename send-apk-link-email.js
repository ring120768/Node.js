require('dotenv').config();
const { Resend } = require('resend');

async function sendDownloadLink() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('📧 Sending download link email...');

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Car Crash Lawyer AI <onboarding@resend.dev>',
      to: ['ring120768@gmail.com'],
      subject: 'Car Crash Lawyer AI - Android APK Download Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0ea5e9;">Your Car Crash Lawyer AI Android APK</h1>

          <p>Click the button below to download the APK (23MB):</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/user-documents/public/CarCrashLawyerAI.apk?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2M2ZTFjOC1jODc2LTQ0MTEtODZjMS0xZDI4MGVlY2FjMGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1c2VyLWRvY3VtZW50cy9wdWJsaWMvQ2FyQ3Jhc2hMYXd5ZXJBSS5hcGsiLCJpYXQiOjE3Njc3ODc4ODAsImV4cCI6MTc2ODM5MjY4MH0.tsspiirbUgHsQeBCN5Awji2fohk9ct_HYSjEa8K94_A"
               style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📥 Download APK (23MB)
            </a>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center;"><em>Download link valid for 7 days</em></p>

          <h2>Installation Instructions:</h2>
          <ol>
            <li><strong>Click the download button</strong> above</li>
            <li>Open your <strong>Downloads</strong> folder on your Android phone</li>
            <li>Tap the <strong>CarCrashLawyerAI.apk</strong> file</li>
            <li>If prompted about "Install unknown apps":</li>
            <ul>
              <li>Tap <strong>Settings</strong></li>
              <li>Enable <strong>Allow from this source</strong></li>
              <li>Go back and tap <strong>Install</strong></li>
            </ul>
            <li>Once installed, tap <strong>Open</strong></li>
          </ol>

          <h2>Requirements:</h2>
          <ul>
            <li>Android 7.0 (Nougat) or newer</li>
            <li>23MB free storage space</li>
          </ul>

          <h2>After Installation:</h2>
          <p>Log in with your credentials and test the notification system:</p>
          <ul>
            <li>✅ Push notifications when PDF is ready</li>
            <li>✅ WhatsApp messages (once configured)</li>
            <li>✅ Email notifications</li>
          </ul>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

          <p style="color: #666; font-size: 12px;">
            <strong>Alternative download link (if Railway has deployed):</strong><br>
            <a href="https://carcrashlawyerai.com/CarCrashLawyerAI.apk">https://carcrashlawyerai.com/CarCrashLawyerAI.apk</a>
          </p>

          <p style="color: #666; font-size: 12px;">
            File: CarCrashLawyerAI.apk (23.07 MB)<br>
            This email was sent from Car Crash Lawyer AI notification system.
          </p>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('   Email ID:', result.data?.id || result.id);
    console.log('\n📱 Check your inbox at ring120768@gmail.com');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendDownloadLink();
