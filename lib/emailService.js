// lib/emailService.js
// Email service using Resend (HTTP-based API)
// Migrated from nodemailer to bypass Railway's blocked SMTP ports

const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const firebaseService = require('./services/firebaseService');
const whatsappService = require('./services/whatsappService');
const config = require('../src/config');

// Initialize Resend client
let resend = null;

/**
 * Get or create Resend client
 * Lazy initialization to allow env vars to be loaded
 */
function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resend = new Resend(apiKey);
    console.log('📧 Resend client initialized');
  }
  return resend;
}

/**
 * Get the "from" email address
 * Uses RESEND_FROM_EMAIL or falls back to default
 * Note: Domain must be verified on Resend before use
 */
function getFromEmail() {
  // Use configured from email, or Resend's onboarding domain for testing
  return process.env.RESEND_FROM_EMAIL || 'Car Crash Lawyer AI <onboarding@resend.dev>';
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
 * Send email using Resend
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {Array} options.attachments - Optional attachments [{filename, content}]
 * @returns {Promise<object>} Send result
 */
async function sendEmail({ to, subject, html, attachments = [], cc, bcc }) {
  try {
    const client = getResendClient();

    // Format attachments for Resend (content must be base64 for buffers)
    const formattedAttachments = attachments.map(att => {
      const buffer = att.content instanceof Buffer ? att.content : Buffer.from(att.content);
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

      console.log(`📎 Attachment: ${att.filename}, Size: ${sizeMB} MB`);

      // Validate size (Resend limit is 25 MB for entire email)
      if (buffer.length > 20 * 1024 * 1024) {
        throw new Error(`Attachment too large: ${att.filename} is ${sizeMB} MB (limit: 20 MB)`);
      }

      // Determine contentType from filename extension
      const ext = att.filename.split('.').pop()?.toLowerCase();
      const contentTypes = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg'
      };

      return {
        filename: att.filename,
        content: buffer,
        contentType: att.contentType || contentTypes[ext] || 'application/octet-stream'
      };
    });

    console.log(`📧 Sending email via Resend to: ${to}`);

    const emailPayload = {
      from: getFromEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments: formattedAttachments.length > 0 ? formattedAttachments : undefined
    };

    // Add CC if provided
    if (cc) {
      emailPayload.cc = Array.isArray(cc) ? cc : [cc];
      console.log(`📧 CC: ${emailPayload.cc.join(', ')}`);
    }

    // Add BCC if provided
    if (bcc) {
      emailPayload.bcc = Array.isArray(bcc) ? bcc : [bcc];
      console.log(`📧 BCC: ${emailPayload.bcc.join(', ')}`);
    }

    const result = await client.emails.send(emailPayload);

    if (result.error) {
      throw new Error(result.error.message || 'Resend API error');
    }

    console.log(`✅ Email sent via Resend: ${result.data?.id || 'success'}`);

    return {
      success: true,
      messageId: result.data?.id
    };
  } catch (error) {
    console.error('❌ Resend email error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
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

    return await sendEmail({
      to,
      subject,
      html,
      attachments: options.attachments || []
    });

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
    'Important: 90-Day Data Retention Notice',
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
 * Send emails with PDF attachment
 * Main function for sending incident report PDFs to users
 * @param {string} userEmail - User's email address
 * @param {Buffer} pdfBuffer - PDF buffer to attach
 * @param {string} createUserId - User ID for reference
 */
async function sendEmails(userEmail, pdfBuffer, createUserId) {
  try {
    console.log('📧 Preparing to send emails via Resend...');
    console.log(`📧 Recipient: ${userEmail}, PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Incident_Report_${createUserId}_${timestamp}.pdf`;

    // Email content
    const html = `
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
            <h4 style="color: #cc0000; margin: 0 0 10px 0;">Next Steps:</h4>
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
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} All Rights Reserved</p>
          <p style="margin: 5px 0;">Emergency Contact: 999 (UK Emergency Services)</p>
        </div>
      </div>
    `;

    // ========================================
    // SEND PUSH NOTIFICATION (if device registered)
    // ========================================
    try {
      const supabase = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey
      );

      const { data: userData, error: dbError } = await supabase
        .from('user_signup')
        .select('fcm_token, phone_number, first_name')
        .eq('create_user_id', createUserId)
        .single();

      if (dbError) {
        console.warn('⚠️ Could not fetch FCM token:', dbError.message);
      } else if (userData?.fcm_token && firebaseService.isConfigured()) {
        // User has FCM token registered and Firebase is configured
        const reportUrl = '/report.html'; // User can view report in app
        const pushResult = await firebaseService.sendPdfReadyNotification(
          userData.fcm_token,
          reportUrl,
          createUserId
        );

        if (pushResult.success) {
          console.log('📱 Push notification sent successfully');
        } else {
          console.warn('⚠️ Push notification failed (non-critical):', pushResult.error);
        }
      } else if (!firebaseService.isConfigured()) {
        console.log('ℹ️ Firebase not configured - skipping push notification');
      } else {
        console.log('ℹ️ User has no FCM token - skipping push notification');
      }
    } catch (pushError) {
      // Push notification failure should NOT block email delivery
      console.warn('⚠️ Push notification error (non-critical):', pushError.message);
    }

    // ========================================
    // SEND WHATSAPP NOTIFICATION (if phone number available)
    // ========================================
    try {
      // userData already fetched above (contains phone_number and first_name)
      if (userData?.phone_number && whatsappService.isConfigured()) {
        // User has phone number and WhatsApp is configured
        const whatsappResult = await whatsappService.sendPdfReadyNotification(
          userData.phone_number,
          userData.first_name || 'there'
        );

        if (whatsappResult.success) {
          console.log('💬 WhatsApp message sent successfully');
        } else {
          console.warn('⚠️ WhatsApp message failed (non-critical):', whatsappResult.error);
        }
      } else if (!whatsappService.isConfigured()) {
        console.log('ℹ️ WhatsApp not configured - skipping WhatsApp notification');
      } else {
        console.log('ℹ️ User has no phone number - skipping WhatsApp notification');
      }
    } catch (whatsappError) {
      // WhatsApp notification failure should NOT block email delivery
      console.warn('⚠️ WhatsApp notification error (non-critical):', whatsappError.message);
    }

    // Send to user
    console.log(`📨 Sending to user: ${userEmail}`);
    const userResult = await sendEmail({
      to: userEmail,
      subject: `Traffic Accident Legal Report - ${timestamp}`,
      html,
      attachments: [{
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    if (!userResult.success) {
      console.error(`❌ Failed to send to user: ${userResult.error}`);
      return userResult;
    }

    console.log(`✅ Email sent to user: ${userResult.messageId}`);

    // Send copy to accounts department
    const accountsEmail = process.env.ACCOUNTS_EMAIL || 'accounts@carcrashlawyerai.com';
    console.log(`📨 Sending to accounts: ${accountsEmail}`);

    const accountsResult = await sendEmail({
      to: accountsEmail,
      subject: `[ACCOUNTS COPY] Traffic Accident Legal Report - ${timestamp}`,
      html,
      attachments: [{
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    if (accountsResult.success) {
      console.log(`✅ Email sent to accounts: ${accountsResult.messageId}`);
    } else {
      console.warn(`⚠️ Failed to send accounts copy: ${accountsResult.error}`);
    }

    return {
      success: true,
      userEmailId: userResult.messageId,
      accountsEmailId: accountsResult.messageId,
      originalEmail: userEmail,
      deliveredTo: userEmail
    };

  } catch (error) {
    console.error('❌ Error sending emails:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send processing notice when AI pages (13-16) fail to render
 */
async function sendAiProcessingEmail({ userEmail, userName, incidentId }) {
  try {
    const accountsEmail = process.env.ACCOUNTS_EMAIL || 'accounts@carcrashlawyerai.com';
    const recipients = Array.from(new Set([userEmail, accountsEmail].filter(Boolean)));

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 16px; text-align: center; color: #fff;">
          <h1 style="margin: 0; font-size: 20px;">Car Crash Lawyer AI</h1>
          <p style="margin: 6px 0 0; font-size: 14px;">Incident Report Processing</p>
        </div>
        <div style="padding: 24px; background: #f8fafc;">
          <p style="color: #334155;">Hello ${escapeHtml(userName || 'Customer')},</p>
          <p style="color: #334155;">
            Your incident report is still being processed. We are finalizing the AI summary pages and will email the full report once processing is complete.
          </p>
          <p style="color: #334155;"><strong>Incident ID:</strong> ${escapeHtml(incidentId || 'Unknown')}</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            No action is needed from you. If you have questions, reply to this email.
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: recipients,
      subject: 'Your Incident Report Is Processing',
      html
    });
  } catch (error) {
    console.error('❌ Error sending AI processing email:', error);
    return { success: false, error: error.message };
  }
}

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatAiTextForEmail = (value) => {
  if (value === null || value === undefined) return '';
  let text = value;
  if (typeof text !== 'string') {
    try {
      text = JSON.stringify(text, null, 2);
    } catch (error) {
      text = String(text);
    }
  }

  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/<\s*br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '- ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#39;/gi, "'");
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
};

/**
 * Send AI analysis backup email (fallback when PDF pages 13-16 fail to render)
 */
async function sendAiBackupEmail({ userEmail, userName, incidentId, aiData }) {
  try {
    const sections = [
      { title: 'Voice Transcription', value: aiData?.voice_transcription },
      { title: 'Quality Review', value: aiData?.quality_review },
      { title: 'AI Summary', value: aiData?.ai_summary },
      { title: 'Closing Statement', value: aiData?.closing_statement },
      { title: 'Final Review', value: aiData?.final_review },
      { title: 'Analysis Metadata', value: aiData?.analysis_metadata }
    ];

    const normalizedSections = sections
      .map(section => {
        const text = formatAiTextForEmail(section.value);
        return text ? { title: section.title, text } : null;
      })
      .filter(Boolean);

    if (normalizedSections.length === 0) {
      return { success: false, error: 'No AI data available to send', reason: 'no_ai_data' };
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const subject = `AI Analysis Backup - ${timestamp}`;

    const sectionHtml = normalizedSections.map(section => `
      <h3 style="margin: 20px 0 8px; color: #1f2937;">${escapeHtml(section.title)}</h3>
      <div style="white-space: pre-wrap; line-height: 1.6; color: #374151;">${escapeHtml(section.text)}</div>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: #111827; padding: 16px; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">Car Crash Lawyer AI</h1>
          <p style="margin: 6px 0 0; font-size: 14px;">AI Analysis Backup (Pages 13-16)</p>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="color: #374151;">Hello ${escapeHtml(userName || 'Customer')},</p>
          <p style="color: #374151;">This email contains a backup copy of your AI analysis. It is sent when the PDF AI pages cannot be rendered.</p>
          <p style="color: #374151;"><strong>Incident ID:</strong> ${escapeHtml(incidentId || 'Unknown')}</p>
          ${sectionHtml}
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            This email is confidential. If you received it in error, please delete it.
          </p>
        </div>
      </div>
    `;

    const attachmentText = [
      `AI Analysis Backup`,
      `Incident ID: ${incidentId || 'Unknown'}`,
      `Generated: ${new Date().toLocaleString('en-GB')}`,
      '',
      ...normalizedSections.flatMap(section => [
        section.title.toUpperCase(),
        section.text,
        ''
      ])
    ].join('\n');

    return await sendEmail({
      to: userEmail,
      subject,
      html,
      attachments: [{
        filename: `AI_Analysis_Backup_${incidentId || 'report'}_${timestamp}.txt`,
        content: attachmentText
      }]
    });
  } catch (error) {
    console.error('❌ Error sending AI backup email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate URL expiry based on subscription
 * Logic: If within 2 months of renewal, give subscription end + 6 weeks (incentive to renew)
 *        Otherwise, give until subscription end date
 *        Minimum 6 weeks for expired/no subscription
 * @param {string|Date} subscriptionEndDate - User's subscription end date
 * @returns {number} Expiry in seconds
 */
function calculateUrlExpiry(subscriptionEndDate) {
  const SIX_WEEKS_SECONDS = 42 * 24 * 60 * 60; // 42 days = 6 weeks
  const TWO_MONTHS_SECONDS = 60 * 24 * 60 * 60; // 60 days = ~2 months
  const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

  if (!subscriptionEndDate) {
    return SIX_WEEKS_SECONDS;
  }

  const now = new Date();
  const endDate = new Date(subscriptionEndDate);
  const timeUntilExpiry = Math.floor((endDate.getTime() - now.getTime()) / 1000);

  // Subscription already expired - give 6 weeks minimum
  if (timeUntilExpiry <= 0) {
    return SIX_WEEKS_SECONDS;
  }

  // Within 2 months of renewal - give subscription end + 6 weeks (better value & renewal incentive)
  if (timeUntilExpiry <= TWO_MONTHS_SECONDS) {
    return Math.min(timeUntilExpiry + SIX_WEEKS_SECONDS, ONE_YEAR_SECONDS);
  }

  // More than 2 months remaining - give until subscription end
  return Math.min(timeUntilExpiry, ONE_YEAR_SECONDS);
}

/**
 * Format seconds into human-readable duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human-readable duration (e.g., "6 weeks", "3 months")
 */
function formatDuration(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));

  if (days >= 365) {
    const years = Math.floor(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  } else if (days >= 30) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else if (days >= 7) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else {
    return days === 1 ? '1 day' : `${days} days`;
  }
}

/**
 * Categorise document types into user-friendly groups
 * @param {string} documentType - The document_type from user_documents
 * @returns {string} Category key for grouping
 */
function categoriseDocumentType(documentType) {
  const type = documentType?.toLowerCase() || '';

  // Vehicle photos (user's own vehicle)
  if (type.includes('vehicle_front') ||
      type.includes('vehicle_back') ||
      type.includes('vehicle_driver') ||
      type.includes('vehicle_passenger') ||
      type.includes('vehicle_image')) {
    return 'vehicle';
  }

  // Damage photos
  if (type.includes('damage') || type.includes('impact')) {
    return 'damage';
  }

  // Other vehicle photos
  if (type.includes('other_vehicle')) {
    return 'otherVehicle';
  }

  // Documents (license, insurance, etc.)
  if (type.includes('license') ||
      type.includes('insurance') ||
      type.includes('document') ||
      type.includes('certificate')) {
    return 'documents';
  }

  // Location/scene photos
  if (type.includes('location') ||
      type.includes('scene') ||
      type.includes('intersection') ||
      type.includes('road')) {
    return 'location';
  }

  // Default to documents
  return 'documents';
}

/**
 * Format document type into human-readable label
 * @param {string} documentType - The document_type from user_documents
 * @returns {string} Human-readable label
 */
function formatDocumentTypeLabel(documentType) {
  const labels = {
    'driving_license_picture': 'Driving Licence',
    'vehicle_front_image': 'Vehicle Front',
    'vehicle_back_image': 'Vehicle Rear',
    'vehicle_driver_side_image': 'Vehicle Driver Side',
    'vehicle_passenger_side_image': 'Vehicle Passenger Side',
    'vehicle_damage_photo': 'Damage Photo',
    'scene_photo': 'Scene Photo',
    'location_photo': 'Location Photo',
    'other_vehicle_photo': 'Other Vehicle',
    'insurance_document': 'Insurance Document'
  };

  // Check for exact match first
  if (labels[documentType]) {
    return labels[documentType];
  }

  // Format from snake_case to Title Case
  return documentType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Send email with download links for all user images
 * @param {object} supabaseClient - Supabase client instance
 * @param {string} userId - User's create_user_id
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's name for personalisation
 * @returns {Promise<object>} Send result
 */
async function sendImageDownloadLinks(supabaseClient, userId, userEmail, userName, incidentId = null) {
  try {
    console.log(`📸 Preparing image download links email for user: ${userId}${incidentId ? ` (incident: ${incidentId})` : ''}`);

    // Build query for user_documents with optional incident filter
    let documentsQuery = supabaseClient
      .from('user_documents')
      .select('id, document_type, storage_path, file_extension, created_at, incident_id')
      .eq('create_user_id', userId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    // CRITICAL FIX: Filter by incident_id if provided
    // Same logic as dataFetcher.js - get incident docs + signup docs (null incident_id)
    if (incidentId) {
      documentsQuery = documentsQuery.or(`incident_id.eq.${incidentId},incident_id.is.null`);
      console.log(`   🎯 Filtering images: incident ${incidentId} + signup docs (null incident_id)`);
    } else {
      console.log(`   ⚠️  No incident filter - sending ALL user images (legacy behavior)`);
    }

    // Fetch user's subscription info and images in parallel
    const [userResult, imagesResult] = await Promise.all([
      supabaseClient
        .from('user_signup')
        .select('subscription_end_date, name, surname, email')
        .eq('create_user_id', userId)
        .single(),
      documentsQuery
    ]);

    if (userResult.error) {
      console.error('Failed to fetch user:', userResult.error);
      throw new Error('User not found');
    }

    if (imagesResult.error) {
      console.error('Failed to fetch images:', imagesResult.error);
      throw new Error('Failed to fetch user images');
    }

    const images = imagesResult.data || [];

    if (images.length === 0) {
      console.log('No images found for user, skipping email');
      return { success: false, reason: 'no_images' };
    }

    // Calculate subscription-aware expiry
    const subscriptionEndDate = userResult.data?.subscription_end_date;
    const expirySeconds = calculateUrlExpiry(subscriptionEndDate);
    const expiryDate = new Date(Date.now() + expirySeconds * 1000);
    const expiryDuration = formatDuration(expirySeconds);

    console.log(`📆 URL expiry: ${expiryDuration} (until ${expiryDate.toLocaleDateString('en-GB')})`);

    // Generate signed URLs for all images
    const imageCategories = {
      vehicle: [],
      damage: [],
      otherVehicle: [],
      documents: [],
      location: []
    };

    for (const image of images) {
      if (!image.storage_path) continue;

      // Generate fresh signed URL from user-documents bucket
      const { data: urlData, error: urlError } = await supabaseClient.storage
        .from('user-documents')
        .createSignedUrl(image.storage_path, expirySeconds);

      if (urlError) {
        console.warn(`Failed to generate URL for ${image.document_type}:`, urlError.message);
        continue;
      }

      const category = categoriseDocumentType(image.document_type);
      const label = formatDocumentTypeLabel(image.document_type);

      imageCategories[category].push({
        label,
        url: urlData.signedUrl,
        uploadedAt: new Date(image.created_at).toLocaleDateString('en-GB')
      });
    }

    // Build HTML for each category
    const buildImageLinksHtml = (images) => {
      return images.map((img, index) =>
        `<a href="${img.url}" class="image-link" target="_blank" download>
          <span class="icon">📥</span> ${img.label}${images.length > 1 ? ` (${index + 1})` : ''}
        </a>`
      ).join('\n');
    };

    // Template data
    const templateData = {
      userName: userName || 'Valued Customer',
      expiryDate: expiryDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      expiryDuration,
      dashboardUrl: process.env.DASHBOARD_URL || 'https://carcrashlawyerai.co.uk/dashboard',

      // Category flags
      hasVehicleImages: imageCategories.vehicle.length > 0,
      hasDamageImages: imageCategories.damage.length > 0,
      hasOtherVehicleImages: imageCategories.otherVehicle.length > 0,
      hasDocuments: imageCategories.documents.length > 0,
      hasLocationImages: imageCategories.location.length > 0,

      // Category HTML
      vehicleImagesHtml: buildImageLinksHtml(imageCategories.vehicle),
      damageImagesHtml: buildImageLinksHtml(imageCategories.damage),
      otherVehicleImagesHtml: buildImageLinksHtml(imageCategories.otherVehicle),
      documentsHtml: buildImageLinksHtml(imageCategories.documents),
      locationImagesHtml: buildImageLinksHtml(imageCategories.location)
    };

    // Load template and replace placeholders
    let template = await loadTemplate('image-download-links');

    // Handle conditional sections ({{#if hasX}})
    const conditionals = [
      'hasVehicleImages',
      'hasDamageImages',
      'hasOtherVehicleImages',
      'hasDocuments',
      'hasLocationImages'
    ];

    for (const condition of conditionals) {
      const regex = new RegExp(`{{#if ${condition}}}([\\s\\S]*?){{/if}}`, 'g');
      template = template.replace(regex, (match, content) => {
        return templateData[condition] ? content : '';
      });
    }

    // Replace standard placeholders
    const html = replacePlaceholders(template, templateData);

    const totalImages = Object.values(imageCategories).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📧 Sending email with ${totalImages} image links across ${Object.values(imageCategories).filter(arr => arr.length > 0).length} categories`);

    const result = await sendEmail({
      to: userEmail,
      subject: `Your Incident Images - Download Links (${totalImages} photos)`,
      html
    });

    if (result.success) {
      console.log(`✅ Image download links email sent: ${result.messageId}`);
    }

    return {
      ...result,
      totalImages,
      expiryDate: expiryDate.toISOString(),
      expiryDuration
    };

  } catch (error) {
    console.error('❌ Error sending image download links email:', error);
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
  const uploadUrl = `${process.env.APP_URL || 'https://carcrashlawyerai.co.uk'}/upload-images.html?userId=${userId}`;

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

  // HTML email content
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
      <h1>Complete Your Profile</h1>
    </div>

    <div class="content">
      <p>Hi ${firstName},</p>

      <p><strong>Welcome to Car Crash Lawyer AI!</strong></p>

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

  try {
    const result = await sendEmail({
      to: email,
      subject: 'Please Upload Your Photos - Car Crash Lawyer AI',
      html: htmlContent
    });

    if (result.success) {
      console.log('✅ Image reminder email sent:', result.messageId);
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending image reminder email:', error);
    throw error;
  }
}

module.exports = {
  // Main PDF email function
  sendEmails,

  // Template-based functions
  sendTemplateEmail,
  sendSubscriptionWelcome,
  sendIncident90DayNotice,
  sendIncidentDeletionWarning,
  sendIncidentDeleted,
  sendSubscriptionExpiring,
  sendSubscriptionRenewed,
  sendImageUploadReminder,
  sendImageDownloadLinks,
  sendAiBackupEmail,
  sendAiProcessingEmail,

  // Utility functions
  loadTemplate,
  replacePlaceholders,
  calculateUrlExpiry,

  // Low-level send (for custom emails)
  sendEmail
};
// Resend email integration - Thu 25 Dec 2025 09:58:56 GMT
