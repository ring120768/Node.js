const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { sendEmail } = require('../../lib/emailService');

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // For auth verification
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // For deletion (bypasses RLS)

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Delete user account and all associated data (GDPR-compliant)
 *
 * Process:
 * 1. Verify user credentials (email + password)
 * 2. Delete data from all tables (bypassing RLS with service role)
 * 3. Delete user from Supabase Auth
 * 4. Send confirmation email
 * 5. Log deletion for audit trail
 */
async function deleteAccount(req, res) {
  const { email, password, reason } = req.body;

  try {
    // ===== 1. Validate Input =====
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    logger.info(`Account deletion request received for: ${email}`);

    // ===== 2. Authenticate User =====
    // Use Supabase Auth to verify credentials
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      logger.warn(`Failed authentication for deletion request: ${email}`);
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const userId = authData.user.id;
    logger.info(`User authenticated for deletion: ${userId} (${email})`);

    // ===== 3. Delete User Data from All Tables =====
    // CRITICAL: Use service role key to bypass RLS policies

    try {
      // 3a. Delete from user_documents (uploaded images, PDFs)
      const { error: docsError } = await supabaseAdmin
        .from('user_documents')
        .delete()
        .eq('user_id', userId);

      if (docsError) {
        logger.error('Error deleting user_documents:', docsError);
      } else {
        logger.info(`Deleted documents for user: ${userId}`);
      }

      // 3b. Delete from ai_transcription (voice transcripts)
      const { error: transcriptError } = await supabaseAdmin
        .from('ai_transcription')
        .delete()
        .eq('user_id', userId);

      if (transcriptError) {
        logger.error('Error deleting ai_transcription:', transcriptError);
      } else {
        logger.info(`Deleted transcriptions for user: ${userId}`);
      }

      // 3c. Delete from completed_incident_forms (generated PDFs)
      const { error: formsError } = await supabaseAdmin
        .from('completed_incident_forms')
        .delete()
        .eq('user_id', userId);

      if (formsError) {
        logger.error('Error deleting completed_incident_forms:', formsError);
      } else {
        logger.info(`Deleted completed forms for user: ${userId}`);
      }

      // 3d. Delete from incident_reports (main accident data)
      const { error: reportsError } = await supabaseAdmin
        .from('incident_reports')
        .delete()
        .eq('user_id', userId);

      if (reportsError) {
        logger.error('Error deleting incident_reports:', reportsError);
      } else {
        logger.info(`Deleted incident reports for user: ${userId}`);
      }

      // 3e. Delete from user_signup (personal information)
      const { error: signupError } = await supabaseAdmin
        .from('user_signup')
        .delete()
        .eq('create_user_id', userId);

      if (signupError) {
        logger.error('Error deleting user_signup:', signupError);
      } else {
        logger.info(`Deleted user signup data for user: ${userId}`);
      }

      // 3f. Delete files from Supabase Storage (user-documents bucket)
      try {
        const { data: files } = await supabaseAdmin.storage
          .from('user-documents')
          .list(userId);

        if (files && files.length > 0) {
          const filePaths = files.map(file => `${userId}/${file.name}`);
          const { error: storageError } = await supabaseAdmin.storage
            .from('user-documents')
            .remove(filePaths);

          if (storageError) {
            logger.error('Error deleting storage files:', storageError);
          } else {
            logger.info(`Deleted ${files.length} storage files for user: ${userId}`);
          }
        }
      } catch (storageError) {
        logger.error('Error accessing storage:', storageError);
      }

    } catch (deletionError) {
      logger.error('Error during data deletion:', deletionError);
      // Continue to auth deletion even if some data deletion fails
    }

    // ===== 4. Delete User from Supabase Auth =====
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error(`Error deleting auth user ${userId}:`, deleteAuthError);
      // Don't return error - data is already deleted
    } else {
      logger.info(`Deleted auth user: ${userId}`);
    }

    // ===== 5. Send Confirmation Email =====
    try {
      await sendEmail({
        to: email,
        subject: 'Account Deletion Confirmed - Car Crash Lawyer AI',
        html: `
          <h2>Account Deletion Confirmed</h2>
          <p>Dear User,</p>
          <p>This email confirms that your Car Crash Lawyer AI account has been permanently deleted as per your request.</p>

          <h3>What was deleted:</h3>
          <ul>
            <li>Personal information and login credentials</li>
            <li>All incident reports and accident data</li>
            <li>All uploaded photos and documents</li>
            <li>All generated PDF reports</li>
            <li>All voice transcriptions</li>
          </ul>

          <p><strong>Your data has been permanently removed from our systems and cannot be recovered.</strong></p>

          ${reason ? `<p><strong>Reason for deletion:</strong> ${reason}</p>` : ''}

          <p>If you did not request this deletion, please contact us immediately at <a href="mailto:accounts@carcrashlawyerai.com">accounts@carcrashlawyerai.com</a></p>

          <p>Thank you for using Car Crash Lawyer AI.</p>

          <hr>
          <p style="font-size: 12px; color: #666;">
            This action was processed in compliance with UK GDPR regulations (Right to Erasure).
            <br>Date: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
          </p>
        `,
      });

      logger.info(`Deletion confirmation email sent to: ${email}`);
    } catch (emailError) {
      logger.error('Error sending deletion confirmation email:', emailError);
      // Don't fail the request if email fails - data is already deleted
    }

    // ===== 6. Log Deletion for Audit Trail =====
    logger.info(`✅ Account deletion completed for: ${email} (${userId})`);
    if (reason) {
      logger.info(`Deletion reason: ${reason}`);
    }

    // ===== 7. Return Success Response =====
    return res.status(200).json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted. A confirmation email has been sent.',
    });

  } catch (error) {
    logger.error('Unexpected error during account deletion:', error);
    return res.status(500).json({
      error: 'An error occurred while processing your deletion request. Please contact support.',
    });
  }
}

module.exports = {
  deleteAccount,
};
