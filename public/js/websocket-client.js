/**
 * WebSocket Client for Car Crash Lawyer AI Dashboard
 * Handles real-time notifications with automatic reconnection
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - User session management
 * - Event-driven architecture
 * - Connection health monitoring
 * - Toast notifications for updates
 */

class DashboardWebSocketClient {
  constructor(options = {}) {
    this.options = {
      url: options.url || this.getWebSocketUrl(),
      reconnectDelay: options.reconnectDelay || 1000, // Start at 1 second
      maxReconnectDelay: options.maxReconnectDelay || 30000, // Max 30 seconds
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      debug: options.debug || false,
      ...options
    };

    this.ws = null;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.isIntentionallyClosed = false;
    this.messageHandlers = new Map();
    this.connectionState = 'disconnected'; // disconnected, connecting, connected

    // Message type constants (matches backend)
    this.MESSAGE_TYPES = {
      SUBSCRIBE: 'subscribe',
      UNSUBSCRIBE: 'unsubscribe',
      PING: 'ping',
      PONG: 'pong',
      ERROR: 'error',

      // Transcription
      TRANSCRIPTION_QUEUED: 'transcription_queued',
      TRANSCRIPTION_PROCESSING: 'transcription_processing',
      TRANSCRIPTION_PROGRESS: 'transcription_progress',
      TRANSCRIPTION_COMPLETE: 'transcription_complete',
      TRANSCRIPTION_FAILED: 'transcription_failed',

      // Image processing
      IMAGE_PROCESSING_STARTED: 'image_processing_started',
      IMAGE_PROCESSING_PROGRESS: 'image_processing_progress',
      IMAGE_PROCESSED: 'image_processed',
      IMAGE_PROCESSING_FAILED: 'image_processing_failed',

      // PDF generation
      PDF_GENERATION_STARTED: 'pdf_generation_started',
      PDF_GENERATION_PROGRESS: 'pdf_generation_progress',
      PDF_GENERATED: 'pdf_generated',
      PDF_GENERATION_FAILED: 'pdf_generation_failed',

      // Generic
      REALTIME_UPDATE: 'realtime_update',
      STATUS_UPDATE: 'status_update'
    };

    this.log('WebSocket client initialized', this.options);
  }

  /**
   * Generate WebSocket URL based on current page location
   */
  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  /**
   * Debug logging
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  /**
   * Error logging (always shown)
   */
  error(...args) {
    console.error('[WebSocket]', ...args);
  }

  /**
   * Connect to WebSocket server
   * @param {string} userId - User ID to subscribe to updates
   */
  connect(userId) {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      this.log('Already connected or connecting');
      return;
    }

    this.userId = userId;
    this.isIntentionallyClosed = false;
    this.connectionState = 'connecting';

    try {
      this.log('Connecting to', this.options.url);
      this.ws = new WebSocket(this.options.url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onclose = (event) => this.handleClose(event);

    } catch (error) {
      this.error('Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    this.log('Connected successfully');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Subscribe to user updates
    if (this.userId) {
      this.send({
        type: this.MESSAGE_TYPES.SUBSCRIBE,
        userId: this.userId
      });
      this.log('Subscribed to user updates:', this.userId);
    }

    // Start heartbeat
    this.startHeartbeat();

    // Trigger connection event
    this.trigger('connected');
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.log('Received message:', data.type, data);

      // Handle specific message types
      switch (data.type) {
        case this.MESSAGE_TYPES.PONG:
          this.log('Heartbeat acknowledged');
          break;

        case this.MESSAGE_TYPES.ERROR:
          this.error('Server error:', data.message);
          this.trigger('error', data);
          break;

        case 'subscribed':
          this.log('Subscription confirmed:', data);
          break;

        case this.MESSAGE_TYPES.IMAGE_PROCESSED:
          this.handleImageProcessed(data);
          break;

        case this.MESSAGE_TYPES.IMAGE_PROCESSING_FAILED:
          this.handleImageProcessingFailed(data);
          break;

        case this.MESSAGE_TYPES.PDF_GENERATED:
          this.handlePDFGenerated(data);
          break;

        case this.MESSAGE_TYPES.PDF_GENERATION_FAILED:
          this.handlePDFGenerationFailed(data);
          break;

        case this.MESSAGE_TYPES.TRANSCRIPTION_COMPLETE:
          this.handleTranscriptionComplete(data);
          break;

        case this.MESSAGE_TYPES.TRANSCRIPTION_FAILED:
          this.handleTranscriptionFailed(data);
          break;

        case this.MESSAGE_TYPES.STATUS_UPDATE:
          this.handleStatusUpdate(data);
          break;

        default:
          // Trigger generic message handler
          this.trigger('message', data);
          this.trigger(data.type, data);
      }

    } catch (error) {
      this.error('Message parse error:', error, event.data);
    }
  }

  /**
   * Handle WebSocket errors
   */
  handleError(error) {
    this.error('WebSocket error:', error);
    this.trigger('error', error);
  }

  /**
   * Handle WebSocket close event
   */
  handleClose(event) {
    this.log('Connection closed', event.code, event.reason);
    this.connectionState = 'disconnected';

    this.stopHeartbeat();
    this.trigger('disconnected', event);

    // Reconnect unless intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.isIntentionallyClosed) return;
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );

    this.reconnectAttempts++;
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.log('Attempting reconnect...');
      this.connect(this.userId);
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing timer

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: this.MESSAGE_TYPES.PING });
        this.log('Heartbeat sent');
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send message to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.error('Cannot send message - not connected');
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    this.log('Disconnecting...');
    this.isIntentionallyClosed = true;

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.trigger('disconnected');
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   */
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  /**
   * Trigger event handlers
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  trigger(event, data) {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // ==================== SPECIFIC MESSAGE HANDLERS ====================

  /**
   * Handle image processed notification
   */
  handleImageProcessed(data) {
    this.log('Image processed:', data.documentType);
    this.showToast('Image Processed', `${data.documentType} uploaded successfully!`, 'success');
    this.trigger('image_processed', data);

    // Refresh dashboard counts
    if (typeof window.updateCounts === 'function') {
      window.updateCounts();
    }
  }

  /**
   * Handle image processing failure
   */
  handleImageProcessingFailed(data) {
    this.log('Image processing failed:', data.documentType);
    this.showToast('Upload Failed', `Failed to process ${data.documentType}`, 'error');
    this.trigger('image_processing_failed', data);
  }

  /**
   * Handle PDF generated notification
   */
  handlePDFGenerated(data) {
    this.log('PDF generated:', data.reportId);
    this.showToast('Report Ready', 'Your incident report is ready to download!', 'success');
    this.trigger('pdf_generated', data);

    // Refresh dashboard
    if (typeof window.updateCounts === 'function') {
      window.updateCounts();
    }
  }

  /**
   * Handle PDF generation failure
   */
  handlePDFGenerationFailed(data) {
    this.log('PDF generation failed:', data.error);
    this.showToast('Generation Failed', 'Failed to generate report. Please try again.', 'error');
    this.trigger('pdf_generation_failed', data);
  }

  /**
   * Handle transcription complete notification
   */
  handleTranscriptionComplete(data) {
    this.log('Transcription complete');
    this.showToast('Transcription Ready', 'Your audio has been transcribed!', 'success');
    this.trigger('transcription_complete', data);

    // Refresh dashboard
    if (typeof window.updateCounts === 'function') {
      window.updateCounts();
    }
  }

  /**
   * Handle transcription failure
   */
  handleTranscriptionFailed(data) {
    this.log('Transcription failed:', data.error);
    this.showToast('Transcription Failed', 'Failed to transcribe audio. Please try again.', 'error');
    this.trigger('transcription_failed', data);
  }

  /**
   * Handle generic status update
   */
  handleStatusUpdate(data) {
    this.log('Status update:', data.updateType);
    this.trigger('status_update', data);
  }

  /**
   * Show toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, info, warning)
   */
  showToast(title, message, type = 'info') {
    // Check if there's a global toast function
    if (typeof window.showToast === 'function') {
      window.showToast(title, message, type);
      return;
    }

    // Fallback to console
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    console.log(`${prefix} ${title}: ${message}`);
  }

  /**
   * Get current connection state
   */
  getState() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      userId: this.userId,
      isConnected: this.ws && this.ws.readyState === WebSocket.OPEN
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardWebSocketClient;
} else {
  window.DashboardWebSocketClient = DashboardWebSocketClient;
}
