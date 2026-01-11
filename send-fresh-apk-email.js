require('dotenv').config();
const { Resend } = require('resend');

const SIGNED_URL = 'https://kctlcmbjmhcfoobmkfrs.supabase.co/storage/v1/object/sign/user-documents/public/CarCrashLawyerAI.apk?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8yY2M2ZTFjOC1jODc2LTQ0MTEtODZjMS0xZDI4MGVlY2FjMGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ1c2VyLWRvY3VtZW50cy9wdWJsaWMvQ2FyQ3Jhc2hMYXd5ZXJBSS5hcGsiLCJpYXQiOjE3Njc3OTAyNDgsImV4cCI6MTc2ODM5NTA0OH0.S8ftoVqrMpth8F7O18-rhAVF_8b3WosfTVMhSzd9mW8';

async function sendFreshAPK() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('📧 Sending fresh APK download email...');

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Car Crash Lawyer AI <onboarding@resend.dev>',
      to: ['ring120768@gmail.com'],
      subject: '🎉 Fresh Android APK - SSL Issue Fixed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0ea5e9;">✨ Fresh Car Crash Lawyer AI APK (SSL Fixed)</h1>

          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
            <strong>✅ SSL Error Fixed!</strong><br>
            The app now loads the correct Railway URL:<br>
            <code>https://car-crash-lawyer-ai-production.up.railway.app</code>
          </div>

          <p>Click the button below to download the fresh APK (45MB):</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${SIGNED_URL}"
               style="background: #0ea5e9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📥 Download Fresh APK (45MB)
            </a>
          </div>

          <p style="color: #999; font-size: 14px; text-align: center;"><em>Download link valid for 7 days</em></p>

          <h2>What's Changed:</h2>
          <ul>
            <li>✅ Fixed SSL certificate error</li>
            <li>✅ App now loads Railway URL with valid certificate</li>
            <li>✅ Fresh build from scratch with latest configuration</li>
          </ul>

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
            <li>45MB free storage space</li>
          </ul>

          <h2>After Installation:</h2>
          <p>The app will load the web interface from Railway and you'll be able to:</p>
          <ul>
            <li>✅ Create an account and log in</li>
            <li>✅ Complete incident reports</li>
            <li>✅ Upload photos via camera</li>
            <li>✅ Receive push notifications when PDF is ready</li>
            <li>✅ Get email notifications</li>
          </ul>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

          <p style="color: #666; font-size: 12px;">
            <strong>Technical Details:</strong><br>
            File: CarCrashLawyerAI.apk (44.69 MB)<br>
            Built: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}<br>
            Configuration: Production Railway URL with SSL<br>
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

sendFreshAPK();
