/**
 * WhatsApp Webhook Controller
 * Handles incoming messages and delivery status updates from Meta WhatsApp Business Platform
 */

const logger = require('../utils/logger');

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Webhook verification (GET request from Meta)
 * Meta sends this to verify your webhook URL
 */
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.token'];
  const challenge = req.query['hub.challenge'];

  logger.info('WhatsApp webhook verification request', { mode, token: token ? '***' : null });

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token: token ? 'invalid' : 'missing' });
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * Handle incoming webhook events (POST request from Meta)
 * Processes:
 * - Incoming messages (user replies)
 * - Message status updates (sent, delivered, read, failed)
 */
async function handleWebhook(req, res) {
  try {
    const body = req.body;

    logger.info('WhatsApp webhook received', {
      object: body.object,
      entryCount: body.entry?.length
    });

    // Validate webhook payload
    if (body.object !== 'whatsapp_business_account') {
      logger.warn('Invalid WhatsApp webhook object', { object: body.object });
      return res.status(400).json({ error: 'Invalid object type' });
    }

    // Process each entry (can be multiple)
    for (const entry of body.entry || []) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages) {
          await handleIncomingMessages(value.messages, value.contacts);
        }

        // Handle message status updates
        if (value.statuses) {
          await handleStatusUpdates(value.statuses);
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (error) {
    logger.error('WhatsApp webhook processing error', {
      error: error.message,
      stack: error.stack
    });
    
    // Still return 200 to prevent Meta from retrying
    return res.status(200).json({ error: error.message });
  }
}

/**
 * Process incoming messages from users
 */
async function handleIncomingMessages(messages, contacts) {
  for (const message of messages) {
    const { from, id, type, timestamp } = message;
    
    logger.info('Incoming WhatsApp message', {
      from,
      messageId: id,
      type,
      timestamp
    });

    // Extract message content based on type
    let messageContent = '';
    
    switch (type) {
      case 'text':
        messageContent = message.text?.body || '';
        break;
      case 'image':
        messageContent = `[Image: ${message.image?.id}]`;
        break;
      case 'document':
        messageContent = `[Document: ${message.document?.filename}]`;
        break;
      case 'audio':
        messageContent = `[Audio: ${message.audio?.id}]`;
        break;
      default:
        messageContent = `[${type}]`;
    }

    // Get contact info
    const contact = contacts?.find(c => c.wa_id === from);
    const userName = contact?.profile?.name || 'Unknown';

    logger.info('WhatsApp message content', {
      from,
      userName,
      type,
      content: messageContent
    });

    // TODO: Implement your business logic here
    // Examples:
    // - Store message in database
    // - Trigger auto-reply
    // - Forward to support team
    // - Update user case status
    
    // For now, just log it
    logger.info('WhatsApp message logged', { from, userName, messageContent });
  }
}

/**
 * Process message status updates
 */
async function handleStatusUpdates(statuses) {
  for (const status of statuses) {
    const { id, status: messageStatus, timestamp, recipient_id } = status;

    logger.info('WhatsApp message status update', {
      messageId: id,
      status: messageStatus,
      recipientId: recipient_id,
      timestamp
    });

    // Update message delivery status in database
    // Possible statuses: sent, delivered, read, failed
    
    if (messageStatus === 'failed') {
      const errorCode = status.errors?.[0]?.code;
      const errorMessage = status.errors?.[0]?.title;
      
      logger.error('WhatsApp message failed', {
        messageId: id,
        errorCode,
        errorMessage,
        recipientId: recipient_id
      });
      
      // TODO: Implement retry logic or alert
    } else {
      logger.info('WhatsApp message status', {
        messageId: id,
        status: messageStatus
      });
    }
  }
}

module.exports = {
  verifyWebhook,
  handleWebhook
};
