
/**
 * Simple Debug Server
 * A lightweight server for debugging purposes
 */

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.DEBUG_PORT || 3001;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug info endpoint
app.get('/debug', (req, res) => {
  res.json({
    message: 'Debug server is running',
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐛 Debug Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔍 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`📊 Debug info: http://0.0.0.0:${PORT}/debug`);
});
