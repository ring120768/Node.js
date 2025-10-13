
const { verifyTypeform } = require('../middleware/security');
const logger = require('../utils/logger');
const { isDuplicate } = require('../utils/idempotency');

async function queueWebhook(payload) {
  logger.info({ source: 'typeform', size: JSON.stringify(payload || {}).length });
}

module.exports = function typeformController(req, res) {
  const secret = process.env.TYPEFORM_SECRET;
  if (!secret) {
    logger.error('TYPEFORM_SECRET missing');
    return res.status(500).send('TYPEFORM_SECRET not set');
  }
  if (!verifyTypeform(req, secret)) {
    logger.warn('Typeform signature invalid');
    return res.status(401).send('Invalid signature');
  }
  const eventId = req.body?.event_id || req.body?.form_response?.token || '';
  if (isDuplicate(eventId)) return res.sendStatus(204);
  queueWebhook(req.body).catch(e => logger.error('typeform enqueue error', e));
  return res.sendStatus(204);
};
