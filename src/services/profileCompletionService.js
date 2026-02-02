/**
 * Profile Completion Service
 * Checks for incomplete user profiles and sends reminder emails
 *
 * Features:
 * - Identifies users with incomplete profiles (missing photos)
 * - Sends friendly reminder emails
 * - Tracks reminder history to avoid spam
 * - Runs on schedule (e.g., daily)
 */

const { createClient } = require('@supabase/supabase-js');
const emailService = require('../../lib/emailService');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Required profile items that should be uploaded
 */
const REQUIRED_ITEMS = [
  'driving_license_picture',
  'vehicle_front_image',
  'vehicle_back_image',
  'vehicle_driver_side_image',
  'vehicle_passenger_side_image'
];

/**
 * Reminder schedule (days after signup)
 */
const REMINDER_SCHEDULE = [
  { days: 2, label: 'initial' },    // 2 days after signup
  { days: 7, label: 'followup' },   // 7 days after signup
  { days: 14, label: 'final' }      // 14 days after signup (final reminder)
];

/**
 * Check which profile items are missing for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of missing item objects
 */
async function checkMissingItems(userId) {
  try {
    // Fetch user's documents
    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('document_type, storage_path')
      .eq('create_user_id', userId)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    // Find which required items are missing
    const missingItems = REQUIRED_ITEMS.filter(itemType => {
      const doc = documents.find(d => d.document_type === itemType);
      return !doc || !doc.storage_path;
    });

    return missingItems.map(type => ({
      type,
      displayName: formatItemName(type)
    }));

  } catch (error) {
    logger.error('Error checking missing items:', error);
    throw error;
  }
}

/**
 * Format document type into display name
 * @param {string} type - Document type
 * @returns {string} Formatted display name
 */
function formatItemName(type) {
  const names = {
    'driving_license_picture': '🪪 Driving License Photo',
    'vehicle_front_image': '📸 Vehicle Front Photo',
    'vehicle_back_image': '📸 Vehicle Back Photo',
    'vehicle_driver_side_image': '📸 Vehicle Driver Side Photo',
    'vehicle_passenger_side_image': '📸 Vehicle Passenger Side Photo'
  };
  return names[type] || type;
}

/**
 * Check if user should receive a reminder
 * @param {object} user - User record with created_at and email
 * @param {object} lastReminder - Last reminder record (if any)
 * @returns {object|null} Reminder config if should send, null otherwise
 */
function shouldSendReminder(user, lastReminder) {
  const now = new Date();
  const signupDate = new Date(user.created_at);
  const daysSinceSignup = Math.floor((now - signupDate) / (1000 * 60 * 60 * 24));

  // Check each reminder in schedule
  for (const reminder of REMINDER_SCHEDULE) {
    // Has enough time passed since signup?
    if (daysSinceSignup >= reminder.days) {

      // Have we already sent this reminder?
      if (lastReminder && lastReminder.reminder_type === reminder.label) {
        continue; // Already sent this one
      }

      // Have we sent a more recent reminder?
      if (lastReminder) {
        const lastReminderIndex = REMINDER_SCHEDULE.findIndex(r => r.label === lastReminder.reminder_type);
        const currentReminderIndex = REMINDER_SCHEDULE.findIndex(r => r.label === reminder.label);
        if (lastReminderIndex >= currentReminderIndex) {
          continue; // Already sent a later reminder
        }
      }

      // This is the reminder we should send
      return reminder;
    }
  }

  return null; // No reminder needed yet
}

/**
 * Send profile completion reminder email
 * @param {object} user - User record
 * @param {Array} missingItems - Array of missing items
 * @param {string} reminderType - Type of reminder (initial, followup, final)
 * @returns {Promise<boolean>} Success status
 */
async function sendReminderEmail(user, missingItems, reminderType) {
  try {
    logger.info('Sending profile completion reminder', {
      userId: user.create_user_id,
      email: user.email,
      reminderType,
      missingCount: missingItems.length
    });

    // Build missing items HTML list
    const missingItemsList = missingItems.map(item => `
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff; border: 1px solid #e5e7eb; border-radius: 6px; margin: 8px 0;">
        <tr>
          <td style="padding: 12px 15px;">
            <p style="margin: 0; color: #1f2937; font-size: 14px; font-weight: 500;">
              ${item.displayName}
            </p>
          </td>
          <td style="padding: 12px 15px; text-align: right;">
            <span style="background-color: #fef2f2; color: #dc2626; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">Missing</span>
          </td>
        </tr>
      </table>
    `).join('');

    // Calculate completion percentage
    const totalItems = REQUIRED_ITEMS.length;
    const completedItems = totalItems - missingItems.length;
    const completionPercentage = Math.round((completedItems / totalItems) * 100);

    // Determine next reminder days
    const currentReminderIndex = REMINDER_SCHEDULE.findIndex(r => r.label === reminderType);
    const nextReminder = REMINDER_SCHEDULE[currentReminderIndex + 1];
    const reminderDays = nextReminder ? nextReminder.days - REMINDER_SCHEDULE[currentReminderIndex].days : 7;

    // Dashboard URL
    const dashboardUrl = process.env.APP_URL
      ? `${process.env.APP_URL}/dashboard.html`
      : 'https://carcrashlawyerai.co.uk/dashboard.html';

    // Send email using template
    await emailService.sendTemplateEmail(
      user.email,
      '✨ Complete Your Profile - Strengthen Your Insurance Claim',
      'profile-completion-reminder',
      {
        userName: user.name || user.email.split('@')[0],
        missingItemsList,
        completionPercentage,
        dashboardUrl,
        reminderDays
      }
    );

    // Record that we sent this reminder
    await supabase
      .from('profile_completion_reminders')
      .insert({
        user_id: user.create_user_id,
        reminder_type: reminderType,
        missing_items: missingItems.map(i => i.type),
        sent_at: new Date().toISOString()
      });

    logger.info('Profile completion reminder sent successfully', {
      userId: user.create_user_id,
      email: user.email,
      reminderType
    });

    return true;

  } catch (error) {
    logger.error('Error sending profile completion reminder:', error);
    return false;
  }
}

/**
 * Process all users and send reminders where appropriate
 * Called by cron job (daily)
 * @returns {Promise<object>} Statistics about reminders sent
 */
async function processProfileReminders() {
  const stats = {
    checked: 0,
    reminders_sent: 0,
    errors: 0,
    already_complete: 0,
    not_yet_due: 0
  };

  try {
    logger.info('🔄 Starting profile completion reminder check...');

    // Fetch all users created in the last 15 days (after that, stop reminding)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: users, error: usersError } = await supabase
      .from('user_signup')
      .select('create_user_id, email, name, created_at')
      .gte('created_at', fifteenDaysAgo.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (usersError) {
      throw usersError;
    }

    logger.info(`Found ${users.length} recent users to check`);

    // Process each user
    for (const user of users) {
      stats.checked++;

      try {
        // Check what items are missing
        const missingItems = await checkMissingItems(user.create_user_id);

        // If profile is complete, skip
        if (missingItems.length === 0) {
          stats.already_complete++;
          continue;
        }

        // Get last reminder sent to this user
        const { data: lastReminders } = await supabase
          .from('profile_completion_reminders')
          .select('reminder_type, sent_at')
          .eq('user_id', user.create_user_id)
          .order('sent_at', { ascending: false })
          .limit(1);

        const lastReminder = lastReminders && lastReminders.length > 0 ? lastReminders[0] : null;

        // Check if we should send a reminder
        const reminderConfig = shouldSendReminder(user, lastReminder);

        if (!reminderConfig) {
          stats.not_yet_due++;
          continue;
        }

        // Send reminder
        const success = await sendReminderEmail(user, missingItems, reminderConfig.label);

        if (success) {
          stats.reminders_sent++;
        } else {
          stats.errors++;
        }

        // Rate limit: wait 1 second between emails to avoid overwhelming Resend
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error('Error processing user for profile reminder:', {
          userId: user.create_user_id,
          error: error.message
        });
        stats.errors++;
      }
    }

    logger.info('✅ Profile completion reminder check complete', stats);

    return stats;

  } catch (error) {
    logger.error('❌ Fatal error in processProfileReminders:', error);
    throw error;
  }
}

module.exports = {
  checkMissingItems,
  sendReminderEmail,
  processProfileReminders
};
