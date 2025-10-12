// lib/emailService.js
const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
function createTransporter() {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Send emails with PDF attachment
 * @param {string} userEmail - User's email address
 * @param {Buffer} pdfBuffer - PDF buffer to attach
 * @param {string} createUserId - User ID for reference
 */
async function sendEmails(userEmail, pdfBuffer, createUserId) {
  try {
    console.log('📧 Preparing to send emails...');

    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();
    console.log('✅ Email service verified');

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Incident_Report_${createUserId}_${timestamp}.pdf`;

    // Email content
    const mailOptions = {
      from: `"Car Crash Lawyer AI" <${process.env.SMTP_USER}>`,
      subject: `Traffic Accident Legal Report - ${timestamp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Car Crash Lawyer AI</h1>
            <p style="color: white; opacity: 0.9;">Traffic Accident Legal Report</p>
          </div>

          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333;">Your Incident Report is Ready</h2>

            <p style="color: #666; line-height: 1.6;">
              Dear ${userEmail.split('@')[0]},
            </p>

            <p style="color: #666; line-height: 1.6;">
              Your comprehensive traffic accident legal report has been generated and is attached to this email.
              This document contains all the information you provided and can be used for:
            </p>

            <ul style="color: #666; line-height: 1.8;">
              <li>Insurance claims</li>
              <li>Legal proceedings</li>
              <li>Official investigations</li>
              <li>Personal records</li>
            </ul>

            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Important Information:</h3>
              <p style="color: #666; margin: 10px 0;">
                <strong>Report ID:</strong> ${createUserId}
              </p>
              <p style="color: #666; margin: 10px 0;">
                <strong>Generated:</strong> ${new Date().toLocaleString('en-GB')}
              </p>
              <p style="color: #666; margin: 10px 0;">
                <strong>Total Pages:</strong> 17
              </p>
            </div>

            <div style="background: #ffe6e6; padding: 15px; border-radius: 8px; border-left: 4px solid #ff4444;">
              <h4 style="color: #cc0000; margin: 0 0 10px 0;">⚠️ Next Steps:</h4>
              <ol style="color: #666; margin: 5px 0; padding-left: 20px;">
                <li>Contact your insurance provider immediately</li>
                <li>Keep this report for your records</li>
                <li>Seek medical attention if needed</li>
                <li>Consider legal consultation if required</li>
              </ol>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              This email and its attachments are confidential and subject to UK GDPR and Data Protection Act 2018.
              If you have received this email in error, please notify us immediately and delete it.
            </p>
          </div>

          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">Car Crash Lawyer AI - AI Legal First Responder System</p>
            <p style="margin: 5px 0;">© 2024 All Rights Reserved</p>
            <p style="margin: 5px 0;">Emergency Contact: 999 (UK Emergency Services)</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send to user
    console.log(`📨 Sending to user: ${userEmail}`);
    const userResult = await transporter.sendMail({
      ...mailOptions,
      to: userEmail
    });
    console.log(`✅ Email sent to user: ${userResult.messageId}`);

    // Send copy to accounts department
    const accountsEmail = 'accounts@carcrashlawyerai.co.uk';
    console.log(`📨 Sending to accounts: ${accountsEmail}`);
    const accountsResult = await transporter.sendMail({
      ...mailOptions,
      to: accountsEmail,
      subject: `[ACCOUNTS COPY] ${mailOptions.subject}`
    });
    console.log(`✅ Email sent to accounts: ${accountsResult.messageId}`);

    return {
      success: true,
      userEmailId: userResult.messageId,
      accountsEmailId: accountsResult.messageId
    };

  } catch (error) {
    console.error('❌ Error sending emails:', error);

    // Don't throw - return error status
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { sendEmails };