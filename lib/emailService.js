// lib/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Create email transporter
 * Supports both Gmail (TLS/587) and Hostinger (SSL/465)
 */
function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: secure, // true for SSL (465), false for TLS/STARTTLS (587)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

/**
 * Load email template from disk
 * @param {string} templateName - Name of the template file (without .html extension)
 * @returns {Promise<string>} Template HTML content
 */
async function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf8');
    return templateContent;
  } catch (error) {
    console.error(`❌ Error loading template ${templateName}:`, error);
    throw new Error(`Failed to load email template: ${templateName}`);
  }
}

/**
 * Replace placeholders in template with actual values
 * @param {string} template - HTML template with placeholders
 * @param {object} data - Key-value pairs for placeholder replacement
 * @returns {string} Template with replaced values
 */
function replacePlaceholders(template, data) {
  let result = template;

  // Replace all {{placeholder}} with actual values
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  }

  // Always add current year
  result = result.replace(/{{currentYear}}/g, new Date().getFullYear().toString());

  return result;
}

/**
 * Send email using a template
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} templateName - Template file name (without .html)
 * @param {object} templateData - Data for placeholder replacement
 * @param {object} options - Additional options (attachments, cc, bcc, etc.)
 * @returns {Promise<object>} Send result
 */
async function sendTemplateEmail(to, subject, templateName, templateData = {}, options = {}) {
  try {
    console.log(`📧 Sending template email: ${templateName} to ${to}`);

    // Load and process template
    const template = await loadTemplate(templateName);
    const html = replacePlaceholders(template, templateData);

    const transporter = createTransporter();

    // Build mail options
    const mailOptions = {
      from: options.from || `"Car Crash Lawyer AI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      ...options // Allow attachments, cc, bcc, etc.
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Template email sent: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    console.error(`❌ Error sending template email:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send subscription welcome email
 * @param {string} userEmail - User's email address
 * @param {object} userData - User subscription data
 */
async function sendSubscriptionWelcome(userEmail, userData) {
  const {
    userName,
    subscriptionStartDate,
    subscriptionEndDate,
    dashboardUrl = process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard'
  } = userData;

  return sendTemplateEmail(
    userEmail,
    'Welcome to Car Crash Lawyer AI - Your Subscription is Active',
    'subscription-welcome',
    {
      userName,
      subscriptionStartDate: new Date(subscriptionStartDate).toLocaleDateString('en-GB'),
      subscriptionEndDate: new Date(subscriptionEndDate).toLocaleDateString('en-GB'),
      dashboardUrl
    }
  );
}

/**
 * Send 90-day incident notice (sent immediately after incident submission)
 * @param {string} userEmail - User's email address
 * @param {object} incidentData - Incident information
 */
async function sendIncident90DayNotice(userEmail, incidentData) {
  const {
    userName,
    incidentId,
    submittedDate,
    deletionDate,
    daysRemaining = 90,
    exportUrl
  } = incidentData;

  return sendTemplateEmail(
    userEmail,
    '⚠️ Important: 90-Day Data Retention Notice',
    'incident-90day-notice',
    {
      userName,
      incidentId,
      submittedDate: new Date(submittedDate).toLocaleDateString('en-GB'),
      deletionDate: new Date(deletionDate).toLocaleDateString('en-GB'),
      daysRemaining: daysRemaining.toString(),
      exportUrl
    }
  );
}

/**
 * Send incident deletion warning (60, 30, 7, or 1 day)
 * @param {string} userEmail - User's email address
 * @param {object} warningData - Warning information
 * @param {number} daysRemaining - Days until deletion (60, 30, 7, or 1)
 */
async function sendIncidentDeletionWarning(userEmail, warningData, daysRemaining) {
  const {
    userName,
    incidentId,
    submittedDate,
    deletionDate,
    deletionTime = '12:00 PM GMT',
    exportUrl
  } = warningData;

  // Choose template based on days remaining
  const templateMap = {
    60: 'incident-warning-60days',
    30: 'incident-warning-30days',
    7: 'incident-warning-7days',
    1: 'incident-warning-1day'
  };

  const templateName = templateMap[daysRemaining] || 'incident-warning-60days';

  const subjectMap = {
    60: 'Reminder: 60 Days Until Incident Data Deletion',
    30: 'Urgent: 30 Days Until Incident Data Deletion',
    7: 'CRITICAL: 7 Days Until Incident Data Deletion',
    1: 'FINAL NOTICE: 24 Hours Until Deletion'
  };

  const subject = subjectMap[daysRemaining] || 'Incident Data Deletion Warning';

  return sendTemplateEmail(
    userEmail,
    subject,
    templateName,
    {
      userName,
      incidentId,
      submittedDate: new Date(submittedDate).toLocaleDateString('en-GB'),
      deletionDate: new Date(deletionDate).toLocaleDateString('en-GB'),
      deletionTime,
      exportUrl
    }
  );
}

/**
 * Send incident deleted confirmation
 * @param {string} userEmail - User's email address
 * @param {object} deletionData - Deletion information
 */
async function sendIncidentDeleted(userEmail, deletionData) {
  const {
    userName,
    incidentId,
    submittedDate,
    deletionDate,
    subscriptionEndDate,
    dashboardUrl = process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard'
  } = deletionData;

  return sendTemplateEmail(
    userEmail,
    'Incident Data Has Been Deleted - GDPR Compliance',
    'incident-deleted',
    {
      userName,
      incidentId,
      submittedDate: new Date(submittedDate).toLocaleDateString('en-GB'),
      deletionDate: new Date(deletionDate).toLocaleDateString('en-GB'),
      subscriptionEndDate: new Date(subscriptionEndDate).toLocaleDateString('en-GB'),
      dashboardUrl
    }
  );
}

/**
 * Send subscription expiring notice (30 days before renewal)
 * @param {string} userEmail - User's email address
 * @param {object} subscriptionData - Subscription information
 */
async function sendSubscriptionExpiring(userEmail, subscriptionData) {
  const {
    userName,
    subscriptionStartDate,
    subscriptionEndDate,
    renewalDate,
    renewalAmount = '£99.00',
    dashboardUrl = process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard',
    billingUrl = process.env.BILLING_URL || 'https://carcrashlawyerai.co.uk/billing'
  } = subscriptionData;

  return sendTemplateEmail(
    userEmail,
    'Your Subscription Renews in 30 Days',
    'subscription-expiring-30days',
    {
      userName,
      subscriptionStartDate: new Date(subscriptionStartDate).toLocaleDateString('en-GB'),
      subscriptionEndDate: new Date(subscriptionEndDate).toLocaleDateString('en-GB'),
      renewalDate: new Date(renewalDate).toLocaleDateString('en-GB'),
      renewalAmount,
      dashboardUrl,
      billingUrl
    }
  );
}

/**
 * Send subscription renewed confirmation
 * @param {string} userEmail - User's email address
 * @param {object} renewalData - Renewal information
 */
async function sendSubscriptionRenewed(userEmail, renewalData) {
  const {
    userName,
    renewalDate,
    newSubscriptionStartDate,
    newSubscriptionEndDate,
    nextRenewalDate,
    chargedAmount = '£99.00',
    dashboardUrl = process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard',
    billingUrl = process.env.BILLING_URL || 'https://carcrashlawyerai.co.uk/billing'
  } = renewalData;

  return sendTemplateEmail(
    userEmail,
    'Subscription Successfully Renewed - Car Crash Lawyer AI',
    'subscription-renewed',
    {
      userName,
      renewalDate: new Date(renewalDate).toLocaleDateString('en-GB'),
      newSubscriptionStartDate: new Date(newSubscriptionStartDate).toLocaleDateString('en-GB'),
      newSubscriptionEndDate: new Date(newSubscriptionEndDate).toLocaleDateString('en-GB'),
      nextRenewalDate: new Date(nextRenewalDate).toLocaleDateString('en-GB'),
      chargedAmount,
      dashboardUrl,
      billingUrl
    }
  );
}

/**
 * Send emails with PDF attachment (LEGACY - preserved for backward compatibility)
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
          // Note: Do NOT specify encoding when content is a Buffer
          // Nodemailer automatically handles Buffer encoding for email transmission
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

/**
 * Send image upload reminder email
 * Sent when user completes signup without uploading all required photos
 */
async function sendImageUploadReminder({ email, firstName, userId, missingImages }) {
  const uploadUrl = `${process.env.APP_URL || 'https://workspace.ring120768.repl.co'}/upload-images.html?userId=${userId}`;

  // Create friendly list of missing images
  const imageLabels = {
    'driving_license_picture': 'Driving License Photo',
    'vehicle_front_image': 'Vehicle Front Photo',
    'vehicle_driver_side_image': 'Vehicle Driver Side Photo',
    'vehicle_passenger_side_image': 'Vehicle Passenger Side Photo',
    'vehicle_back_image': 'Vehicle Back Photo'
  };

  const missingList = missingImages
    .map(img => `• ${imageLabels[img] || img}`)
    .join('\n');

  // For now, send simple HTML email (can create template later)
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 30px; background: #0066cc; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .missing-list { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff9800; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📸 Complete Your Profile</h1>
    </div>

    <div class="content">
      <p>Hi ${firstName},</p>

      <p><strong>Welcome to Car Crash Lawyer AI!</strong> 🎉</p>

      <p>Your account has been created successfully. However, we noticed you haven't uploaded all the required photos yet.</p>

      <div class="missing-list">
        <strong>Missing photos:</strong><br>
        ${missingList.replace(/\n/g, '<br>')}
      </div>

      <p>These photos are important for processing any future incident reports and ensuring your claims are handled quickly.</p>

      <p><strong>Upload them now - it only takes 2 minutes:</strong></p>

      <p style="text-align: center;">
        <a href="${uploadUrl}" class="button">Upload My Photos</a>
      </p>

      <p>Or copy this link into your browser:<br>
      <a href="${uploadUrl}">${uploadUrl}</a></p>

      <p>If you're not near your vehicle right now, no worries! This email is just a friendly reminder. You can upload photos anytime from your dashboard.</p>

      <p>Questions? Just reply to this email.</p>

      <p>Best regards,<br>
      <strong>The Car Crash Lawyer AI Team</strong></p>
    </div>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Car Crash Lawyer AI. All rights reserved.</p>
      <p>This is an automated reminder email about your incomplete profile.</p>
    </div>
  </div>
</body>
</html>
  `;

  const transporter = createTransporter();

  const mailOptions = {
    from: `"Car Crash Lawyer AI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '📸 Please Upload Your Photos - Car Crash Lawyer AI',
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Image reminder email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending image reminder email:', error);
    throw error;
  }
}

module.exports = {
  // Legacy function (backward compatibility)
  sendEmails,

  // New template-based functions
  sendTemplateEmail,
  sendSubscriptionWelcome,
  sendIncident90DayNotice,
  sendIncidentDeletionWarning,
  sendIncidentDeleted,
  sendSubscriptionExpiring,
  sendSubscriptionRenewed,
  sendImageUploadReminder, // NEW: Reminder for missing photos

  // Utility functions (can be used externally if needed)
  loadTemplate,
  replacePlaceholders
};
