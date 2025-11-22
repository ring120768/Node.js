/**
 * Dashboard WebSocket Initialization
 * Sets up real-time updates for the dashboard
 *
 * Usage:
 * 1. Include this script in dashboard.html after websocket-client.js and toast-notifications.js
 * 2. Call initializeDashboardWebSocket(userId) when user is authenticated
 */

(function() {
  'use strict';

  let wsClient = null;

  /**
   * Initialize WebSocket connection for dashboard
   * @param {string} userId - Authenticated user ID
   */
  window.initializeDashboardWebSocket = function(userId) {
    if (!userId) {
      console.error('[Dashboard] Cannot initialize WebSocket - no user ID provided');
      return null;
    }

    // Don't reinitialize if already connected to same user
    if (wsClient && wsClient.userId === userId && wsClient.getState().isConnected) {
      console.log('[Dashboard] WebSocket already connected for user:', userId);
      return wsClient;
    }

    console.log('[Dashboard] Initializing WebSocket for user:', userId);

    // Create WebSocket client
    wsClient = new DashboardWebSocketClient({
      debug: window.location.hostname === 'localhost', // Debug mode for localhost
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000
    });

    // ==================== CONNECTION EVENTS ====================

    wsClient.on('connected', () => {
      console.log('[Dashboard] ✅ WebSocket connected');
      updateConnectionStatus('connected');
    });

    wsClient.on('disconnected', (event) => {
      console.log('[Dashboard] ⚠️ WebSocket disconnected');
      updateConnectionStatus('disconnected');
    });

    wsClient.on('error', (error) => {
      console.error('[Dashboard] ❌ WebSocket error:', error);
      updateConnectionStatus('error');
    });

    // ==================== IMAGE PROCESSING EVENTS ====================

    wsClient.on('image_processed', (data) => {
      console.log('[Dashboard] Image processed:', data);

      // Refresh images section if it exists
      if (typeof window.loadImages === 'function') {
        window.loadImages();
      }

      // Update dashboard counts
      if (typeof window.updateCounts === 'function') {
        window.updateCounts();
      }

      // Show visual feedback in UI
      highlightDashboardSection('images');
    });

    wsClient.on('image_processing_failed', (data) => {
      console.error('[Dashboard] Image processing failed:', data);
    });

    // ==================== PDF GENERATION EVENTS ====================

    wsClient.on('pdf_generated', (data) => {
      console.log('[Dashboard] PDF generated:', data);

      // Refresh reports section
      if (typeof window.loadReports === 'function') {
        window.loadReports();
      }

      // Update dashboard counts
      if (typeof window.updateCounts === 'function') {
        window.updateCounts();
      }

      // Show visual feedback
      highlightDashboardSection('reports');
    });

    wsClient.on('pdf_generation_failed', (data) => {
      console.error('[Dashboard] PDF generation failed:', data);
    });

    // ==================== TRANSCRIPTION EVENTS ====================

    wsClient.on('transcription_complete', (data) => {
      console.log('[Dashboard] Transcription complete:', data);

      // Refresh transcriptions section
      if (typeof window.loadTranscriptions === 'function') {
        window.loadTranscriptions();
      }

      // Update dashboard counts
      if (typeof window.updateCounts === 'function') {
        window.updateCounts();
      }

      // Show visual feedback
      highlightDashboardSection('transcriptions');
    });

    wsClient.on('transcription_failed', (data) => {
      console.error('[Dashboard] Transcription failed:', data);
    });

    // ==================== GENERIC STATUS UPDATES ====================

    wsClient.on('status_update', (data) => {
      console.log('[Dashboard] Status update:', data);

      // Refresh relevant section based on update type
      switch (data.updateType) {
        case 'incident_report':
          if (typeof window.loadIncidentReports === 'function') {
            window.loadIncidentReports();
          }
          break;

        case 'dashboard_refresh':
          if (typeof window.updateCounts === 'function') {
            window.updateCounts();
          }
          break;
      }
    });

    // Connect to WebSocket server
    wsClient.connect(userId);

    return wsClient;
  };

  /**
   * Disconnect WebSocket
   */
  window.disconnectDashboardWebSocket = function() {
    if (wsClient) {
      wsClient.disconnect();
      wsClient = null;
      updateConnectionStatus('disconnected');
    }
  };

  /**
   * Get WebSocket client instance
   */
  window.getDashboardWebSocket = function() {
    return wsClient;
  };

  /**
   * Update connection status indicator in UI
   * @param {string} status - Connection status (connected, disconnected, error)
   */
  function updateConnectionStatus(status) {
    const indicator = document.getElementById('ws-connection-status');
    if (!indicator) return;

    const statusConfig = {
      connected: {
        color: '#10B981',
        text: 'Live',
        icon: '●'
      },
      disconnected: {
        color: '#6B7280',
        text: 'Offline',
        icon: '○'
      },
      error: {
        color: '#EF4444',
        text: 'Error',
        icon: '⚠'
      }
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    indicator.style.color = config.color;
    indicator.innerHTML = `<span style="margin-right: 4px;">${config.icon}</span>${config.text}`;
    indicator.title = status === 'connected' ? 'Real-time updates active' : 'Reconnecting...';
  }

  /**
   * Highlight dashboard section with brief animation
   * @param {string} sectionId - Section ID to highlight
   */
  function highlightDashboardSection(sectionId) {
    const section = document.getElementById(`section-${sectionId}`);
    if (!section) return;

    // Add highlight class
    section.style.transition = 'all 0.3s ease';
    section.style.boxShadow = '0 0 0 3px #0B7AB0';

    // Remove after animation
    setTimeout(() => {
      section.style.boxShadow = '';
    }, 1000);
  }

  /**
   * Auto-initialize on page load if user is logged in
   */
  document.addEventListener('DOMContentLoaded', () => {
    // Check if user ID is available (e.g., from session storage or data attribute)
    const userId = sessionStorage.getItem('user_id') ||
                   document.body.dataset.userId ||
                   window.currentUserId;

    if (userId) {
      console.log('[Dashboard] Auto-initializing WebSocket for user:', userId);
      window.initializeDashboardWebSocket(userId);
    } else {
      console.log('[Dashboard] No user ID found - WebSocket not initialized');
    }
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (wsClient) {
      wsClient.disconnect();
    }
  });

})();
