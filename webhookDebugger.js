
/**
 * Simple Webhook Debugger Module
 * Handles webhook logging and debugging functionality
 */

class WebhookDebugger {
  constructor() {
    this.webhooks = [];
    this.maxWebhookStore = 1000;
  }

  /**
   * Store webhook data for debugging
   */
  storeWebhook(webhookData) {
    const stored = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      data: webhookData,
      source: 'typeform'
    };

    this.webhooks.push(stored);

    // Keep only the most recent webhooks
    if (this.webhooks.length > this.maxWebhookStore) {
      this.webhooks = this.webhooks.slice(-this.maxWebhookStore);
    }

    return stored.id;
  }

  /**
   * Get stored webhooks
   */
  getStoredWebhooks(limit = 10) {
    return this.webhooks
      .slice(-limit)
      .reverse();
  }

  /**
   * Get webhook count
   */
  getWebhookCount() {
    return this.webhooks.length;
  }

  /**
   * Clear stored webhooks
   */
  clearWebhooks() {
    this.webhooks = [];
    return true;
  }

  /**
   * Get debugger status
   */
  getStatus() {
    return {
      storedWebhooks: this.webhooks.length,
      webhookStoreStatus: 'healthy',
      maxWebhookStoreSize: this.maxWebhookStore
    };
  }
}

// Create and export a singleton instance
const webhookDebugger = new WebhookDebugger();

module.exports = webhookDebugger;
