
const logger = require('../utils/logger');
const { isDuplicate } = require('../utils/idempotency');

async function queueWebhook(payload) {
  logger.info({ source: 'zapier', size: JSON.stringify(payload || {}).length });
}

module.exports = function zapierController(req, res) {
  const shared = process.env.ZAPIER_SHARED_SECRET;
  if (shared) {
    const got = req.get('X-Zapier-Secret');
    if (got !== shared) return res.status(401).send('Unauthorized');
  }
  const id = req.get('X-Request-Id') || req.body?.id || req.body?.event_id || '';
  if (isDuplicate(id)) return res.sendStatus(204);
  queueWebhook(req.body).catch(e => logger.error('zapier enqueue error', e));
  return res.sendStatus(204);
};
