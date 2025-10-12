
/**
 * WebSocket module for Car Crash Lawyer AI
 * Handles real-time communication for transcription updates
 */

const WebSocket = require('ws');
const logger = require('../utils/logger');
const config = require('../config');

// WebSocket server instance
let wss = null;

// Connection tracking
const activeSessions = new Map(); // queueId -> WebSocket
const userSessions = new Map(); // userId -> Set of WebSockets
const transcriptionStatuses = new Map(); // Store transcription statuses with timestamps

// Cleanup interval reference
let cleanupInterval = null;
let heartbeatInterval = null;

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @returns {WebSocket.Server} WebSocket server instance
 */
function initializeWebSocket(server) {
  // Create WebSocket server
  wss = new WebSocket.Server({
    noServer: true,
    clientTracking: true,
    maxPayload: 10 * 1024 * 1024 // 10MB max message size
  });

  // Enhanced cleanup for stale WebSocket connections and old statuses
  cleanupInterval = setInterval(() => {
    // Clean up WebSocket sessions
    activeSessions.forEach((ws, queueId) => {
      if (ws.readyState !== WebSocket.OPEN) {
        activeSessions.delete(queueId);
        logger.debug(`Cleaned up stale session for queue ${queueId}`);
      }
    });

    userSessions.forEach((wsSets, userId) => {
      const activeSockets = Array.from(wsSets).filter(ws => ws.readyState === WebSocket.OPEN);
      if (activeSockets.length !== wsSets.size) {
        userSessions.set(userId, new Set(activeSockets));
        logger.debug(`Cleaned up ${wsSets.size - activeSockets.length} stale sockets for user ${userId}`);
      }
      if (activeSockets.length === 0) {
        userSessions.delete(userId);
      }
    });

    // Clean up old transcription statuses (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    let cleaned = 0;

    transcriptionStatuses.forEach((status, queueId) => {
      if (status.updatedAt && status.updatedAt < oneHourAgo) {
        transcriptionStatuses.delete(queueId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old transcription statuses`);
    }
  }, 60000); // Clean up every minute

  // Handle WebSocket upgrade
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    logger.info('New WebSocket connection established');

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.connectionTime = Date.now();
    ws.messageCount = 0;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        ws.messageCount++;
        logger.debug('WebSocket message received', {
          type: data.type,
          messageCount: ws.messageCount
        });

        switch (data.type) {
          case config.constants.WS_MESSAGE_TYPES.SUBSCRIBE:
            if (data.queueId) {
              activeSessions.set(data.queueId, ws);
              ws.queueId = data.queueId;
              ws.send(JSON.stringify({
                type: 'subscribed',
                queueId: data.queueId,
                message: 'Successfully subscribed to transcription updates'
              }));
            }

            if (data.userId) {
              if (!userSessions.has(data.userId)) {
                userSessions.set(data.userId, new Set());
              }
              userSessions.get(data.userId).add(ws);
              ws.userId = data.userId;
              ws.send(JSON.stringify({
                type: 'subscribed',
                userId: data.userId,
                message: 'Successfully subscribed to user updates'
              }));
            }
            break;

          case config.constants.WS_MESSAGE_TYPES.UNSUBSCRIBE:
            if (data.queueId && activeSessions.has(data.queueId)) {
              activeSessions.delete(data.queueId);
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                queueId: data.queueId
              }));
            }
            if (data.userId && userSessions.has(data.userId)) {
              userSessions.get(data.userId).delete(ws);
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                userId: data.userId
              }));
            }
            break;

          case config.constants.WS_MESSAGE_TYPES.PING:
            ws.send(JSON.stringify({ type: config.constants.WS_MESSAGE_TYPES.PONG }));
            break;

          default:
            logger.debug('Unknown message type:', data.type);
            ws.send(JSON.stringify({
              type: config.constants.WS_MESSAGE_TYPES.ERROR,
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        logger.error('WebSocket message error', error);
        ws.send(JSON.stringify({
          type: config.constants.WS_MESSAGE_TYPES.ERROR,
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      const connectionDuration = Date.now() - ws.connectionTime;
      logger.debug('WebSocket connection closed', {
        duration: connectionDuration,
        messages: ws.messageCount
      });

      if (ws.queueId) {
        activeSessions.delete(ws.queueId);
      }
      if (ws.userId && userSessions.has(ws.userId)) {
        userSessions.get(ws.userId).delete(ws);
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', error);
    });
  });

  // WebSocket heartbeat interval
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.debug('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  logger.success('WebSocket server initialized');
  return wss;
}

/**
 * Send real-time updates to specific queue
 */
function sendTranscriptionUpdate(queueId, data) {
  const ws = activeSessions.get(queueId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      logger.error('Error sending transcription update', error);
    }
  }
}

/**
 * Broadcast to specific user
 */
function broadcastToUser(userId, data) {
  if (userSessions.has(userId)) {
    userSessions.get(userId).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(data));
        } catch (error) {
          logger.error('Error broadcasting to user', error);
        }
      }
    });
  }
}

/**
 * Broadcast transcription updates
 */
function broadcastTranscriptionUpdate(queueId, data) {
  // Update memory store
  if (transcriptionStatuses.has(queueId)) {
    Object.assign(transcriptionStatuses.get(queueId), data);
  }

  // Send WebSocket update to queue subscribers
  sendTranscriptionUpdate(queueId, data);

  // Also broadcast to user subscribers if we have the userId
  const statusData = transcriptionStatuses.get(queueId);
  if (statusData?.create_user_id) {
    broadcastToUser(statusData.create_user_id, data);
  }
}

/**
 * Handle realtime transcription updates
 */
function handleRealtimeTranscriptionUpdate(payload) {
  try {
    const { eventType, new: newData, old: oldData, table } = payload;
    let queueId, userId, status, transcription;

    if (table === 'transcription_queue') {
      queueId = newData?.id || oldData?.id;
      userId = newData?.create_user_id || oldData?.create_user_id;
      status = newData?.status;
      transcription = newData?.transcription_text;
    } else if (table === 'ai_transcription') {
      userId = newData?.create_user_id;
      transcription = newData?.transcription_text;
      status = 'transcribed';
    }

    if (queueId) {
      if (transcriptionStatuses.has(queueId)) {
        transcriptionStatuses.set(queueId, {
          ...transcriptionStatuses.get(queueId),
          status: status,
          transcription: transcription || transcriptionStatuses.get(queueId).transcription,
          updatedAt: Date.now()
        });
      }

      broadcastTranscriptionUpdate(queueId, {
        type: config.constants.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'supabase_realtime',
        table: table,
        eventType: eventType,
        status: status,
        transcription: transcription,
        error: newData?.error_message
      });
    }

    if (userId) {
      broadcastToUser(userId, {
        type: config.constants.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'supabase_realtime',
        table: table,
        eventType: eventType,
        data: newData
      });
    }
  } catch (error) {
    logger.error('Error handling realtime transcription update', error);
  }
}

/**
 * Handle realtime summary updates
 */
function handleRealtimeSummaryUpdate(payload) {
  try {
    const { new: summaryData } = payload;
    const userId = summaryData?.create_user_id;
    const queueId = summaryData?.incident_id;

    if (queueId && transcriptionStatuses.has(queueId)) {
      transcriptionStatuses.set(queueId, {
        ...transcriptionStatuses.get(queueId),
        status: config.constants.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summaryData,
        updatedAt: Date.now()
      });
    }

    if (queueId) {
      broadcastTranscriptionUpdate(queueId, {
        type: config.constants.WS_MESSAGE_TYPES.REALTIME_UPDATE,
        source: 'ai_summary',
        status: config.constants.TRANSCRIPTION_STATUS.COMPLETED,
        summary: summaryData,
        message: 'AI summary generated successfully!'
      });
    }

    if (userId) {
      broadcastToUser(userId, {
        type: 'summary_ready',
        summary: summaryData
      });
    }
  } catch (error) {
    logger.error('Error handling realtime summary update', error);
  }
}

/**
 * Get transcription status from memory
 */
function getTranscriptionStatus(queueId) {
  return transcriptionStatuses.get(queueId.toString());
}

/**
 * Set transcription status in memory
 */
function setTranscriptionStatus(queueId, status) {
  transcriptionStatuses.set(queueId.toString(), {
    ...status,
    updatedAt: Date.now()
  });
}

/**
 * Get WebSocket server stats
 */
function getWebSocketStats() {
  return {
    connectedClients: wss ? wss.clients.size : 0,
    activeQueueSessions: activeSessions.size,
    activeUserSessions: userSessions.size,
    transcriptionStatusCount: transcriptionStatuses.size
  };
}

/**
 * Close WebSocket server gracefully
 */
function closeWebSocket() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (wss) {
    wss.close(() => {
      logger.info('WebSocket server closed');
    });
    wss = null;
  }

  // Clear all sessions
  activeSessions.clear();
  userSessions.clear();
  transcriptionStatuses.clear();
}

module.exports = {
  initializeWebSocket,
  broadcastTranscriptionUpdate,
  broadcastToUser,
  sendTranscriptionUpdate,
  handleRealtimeTranscriptionUpdate,
  handleRealtimeSummaryUpdate,
  getTranscriptionStatus,
  setTranscriptionStatus,
  getWebSocketStats,
  closeWebSocket
};
