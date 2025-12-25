// lib/emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Create email transporter
 * Supports both Gmail (TLS/587) and Hostinger (SSL/465)
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Log config (without password) for debugging
  console.log('📧 SMTP Config:', {
    host,
    port,
    secure,
    user: user ? `${user.substring(0, 5)}...` : 'NOT SET',
    pass: pass ? '***SET***' : 'NOT SET'
  });

  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure, // true for SSL (465), false for TLS/STARTTLS (587)
    auth: {
      user,
      pass
    },
    // Add timeouts to prevent hanging on Railway
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 60000
  });
}

/**
 * Create backup email transporter (Gmail)
 * Used when primary SMTP fails
 * Requires: SMTP_BACKUP_USER and SMTP_BACKUP_PASS in .env
 */
function createBackupTransporter() {
  const user = process.env.SMTP_BACKUP_USER;
  const pass = process.env.SMTP_BACKUP_PASS;

  console.log('📧 Backup SMTP Config:', {
    user: user ? `${user.substring(0, 5)}...` : 'NOT SET',
    pass: pass ? '***SET***' : 'NOT SET'
  });

  if (!user || !pass) {
    console.log('⚠️ Backup SMTP not configured - SMTP_BACKUP_USER or SMTP_BACKUP_PASS missing');
    return null; // No backup configured
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user,
      pass
    },
    // Add timeouts to prevent hanging on Railway
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000
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

    // Try primary SMTP first, fall back to backup if it fails
    let transporter = null;
    let usedBackupSmtp = false;
    let fromEmail = process.env.SMTP_USER;

    try {
      transporter = createTransporter();
      await transporter.verify();
      console.log('✅ Primary email service verified');
    } catch (primarySmtpError) {
      console.error(`❌ Primary SMTP failed: ${primarySmtpError.message}`);
      console.log('📨 Trying backup SMTP (Gmail)...');

      const backupTransporter = createBackupTransporter();
      if (!backupTransporter) {
        throw new Error('Primary SMTP failed and no backup SMTP configured (add SMTP_BACKUP_USER/SMTP_BACKUP_PASS)');
      }

      try {
        await backupTransporter.verify();
        transporter = backupTransporter;
        usedBackupSmtp = true;
        fromEmail = process.env.SMTP_BACKUP_USER;
        console.log('✅ Backup email service (Gmail) verified');
      } catch (backupSmtpError) {
        throw new Error(`Both SMTP servers failed. Primary: ${primarySmtpError.message}, Backup: ${backupSmtpError.message}`);
      }
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Incident_Report_${createUserId}_${timestamp}.pdf`;

    // Email content
    const mailOptions = {
      from: `"Car Crash Lawyer AI" <${fromEmail}>`,
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

    // Send to user (with backup fallback)
    const backupEmail = 'carcrashlayerai@gmail.com';
    let userResult = null;
    let usedBackup = false;

    console.log(`📨 Sending to user: ${userEmail}`);
    try {
      userResult = await transporter.sendMail({
        ...mailOptions,
        to: userEmail
      });
      console.log(`✅ Email sent to user: ${userResult.messageId}`);
    } catch (userEmailError) {
      console.error(`❌ Failed to send to user (${userEmail}): ${userEmailError.message}`);
      console.log(`📨 Trying backup email: ${backupEmail}`);

      try {
        userResult = await transporter.sendMail({
          ...mailOptions,
          to: backupEmail,
          subject: `[BACKUP - Original: ${userEmail}] ${mailOptions.subject}`
        });
        usedBackup = true;
        console.log(`✅ Email sent to backup: ${userResult.messageId}`);
      } catch (backupError) {
        console.error(`❌ Backup email also failed: ${backupError.message}`);
        throw new Error(`Both user (${userEmail}) and backup (${backupEmail}) emails failed`);
      }
    }

    // Send copy to accounts department
    const accountsEmail = 'accounts@carcrashlawyerai.com';
    console.log(`📨 Sending to accounts: ${accountsEmail}`);
    const accountsResult = await transporter.sendMail({
      ...mailOptions,
      to: accountsEmail,
      subject: `[ACCOUNTS COPY]${usedBackupSmtp ? ' [BACKUP SMTP]' : ''}${usedBackup ? ' [USER EMAIL FAILED - SENT TO BACKUP]' : ''} ${mailOptions.subject}`
    });
    console.log(`✅ Email sent to accounts: ${accountsResult.messageId}`);

    return {
      success: true,
      userEmailId: userResult.messageId,
      accountsEmailId: accountsResult.messageId,
      usedBackupSmtp,
      usedBackupRecipient: usedBackup,
      originalEmail: userEmail,
      deliveredTo: usedBackup ? backupEmail : userEmail,
      sentFrom: fromEmail
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
async function sendImageDownloadLinks(supabaseClient, userId, userEmail, userName) {
  try {
    console.log(`📸 Preparing image download links email for user: ${userId}`);

    // Fetch user's subscription info and all images in parallel
    const [userResult, imagesResult] = await Promise.all([
      supabaseClient
        .from('user_signup')
        .select('subscription_end_date, name, surname, email')
        .eq('create_user_id', userId)
        .single(),
      supabaseClient
        .from('user_documents')
        .select('id, document_type, storage_path, file_extension, created_at')
        .eq('create_user_id', userId)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
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

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Car Crash Lawyer AI" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `📸 Your Incident Images - Download Links (${totalImages} photos)`,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Image download links email sent: ${result.messageId}`);

    return {
      success: true,
      messageId: result.messageId,
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
  sendImageUploadReminder,
  sendImageDownloadLinks, // NEW: Send image download links with subscription-aware expiry

  // Utility functions (can be used externally if needed)
  loadTemplate,
  replacePlaceholders,
  calculateUrlExpiry // Exported for use in pdf.controller.js
};
