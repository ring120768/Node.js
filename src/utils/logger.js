
/**
 * Enhanced structured logging utility with levels and formatting
 * Provides consistent logging across the application
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const LOG_COLORS = {
  ERROR: '\x1b[31m',   // Red
  WARN: '\x1b[33m',    // Yellow
  INFO: '\x1b[36m',    // Cyan
  DEBUG: '\x1b[35m',   // Magenta
  SUCCESS: '\x1b[32m', // Green
  RESET: '\x1b[0m'     // Reset
};

class Logger {
  constructor() {
    this.level = this.getLogLevel();
    this.requestContext = new Map();
  }

  getLogLevel() {
    const level = (process.env.LOG_LEVEL || 'info').toUpperCase();
    return LOG_LEVELS[level] !== undefined ? LOG_LEVELS[level] : LOG_LEVELS.INFO;
  }

  formatMessage(level, message, data, requestId) {
    const timestamp = new Date().toISOString();
    const colorCode = LOG_COLORS[level] || '';
    const resetCode = LOG_COLORS.RESET;
    
    let formattedMessage = `${colorCode}[${level}]${resetCode} ${timestamp}`;
    
    if (requestId) {
      formattedMessage += ` [${requestId.slice(-8)}]`;
    }
    
    formattedMessage += ` ${message}`;
    
    if (data && typeof data === 'object') {
      if (data instanceof Error) {
        formattedMessage += ` Error: ${data.message}`;
      } else {
        const sanitizedData = this.sanitizeLogData(data);
        formattedMessage += ` ${JSON.stringify(sanitizedData)}`;
      }
    } else if (data) {
      formattedMessage += ` ${data}`;
    }
    
    return formattedMessage;
  }

  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = Array.isArray(data) ? [] : {};
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'];
    
    // PII regex patterns for GDPR compliance
    const piiPatterns = {
      email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Z|a-z]{2,}/g,
      phone: /(+44|0)[0-9]{9,10}/g,
      postcode: /[A-Z]{1,2}[0-9]{1,2}[A-Z]?s?[0-9][A-Z]{2}/gi,
      nin: /[A-Z]{2}[0-9]{6}[A-Z]/g,
      card: /[0-9]{4}[s-]?[0-9]{4}[s-]?[0-9]{4}[s-]?[0-9]{4}/g
    };

    for (const [key, value] of Object.entries(data)) {
      // Redact sensitive keys
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      // Recurse for nested objects
      if (value && typeof value === 'object' && !(value instanceof Error)) {
        sanitized[key] = this.sanitizeLogData(value);
        continue;
      }

      // Sanitize PII in strings
      if (typeof value === 'string') {
        let clean = value;
        if (piiPatterns.email.test(clean)) clean = clean.replace(piiPatterns.email, '[REDACTED-EMAIL]');
        if (piiPatterns.phone.test(clean)) clean = clean.replace(piiPatterns.phone, '[REDACTED-PHONE]');
        if (piiPatterns.postcode.test(clean)) clean = clean.replace(piiPatterns.postcode, '[REDACTED-POSTCODE]');
        if (piiPatterns.nin.test(clean)) clean = clean.replace(piiPatterns.nin, '[REDACTED-NIN]');
        if (piiPatterns.card.test(clean)) clean = clean.replace(piiPatterns.card, '[REDACTED-CARD]');
        if (clean.includes('/user/')) clean = clean.replace(//user/[^/]+/g, '/user/[REDACTED]');
        sanitized[key] = clean;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  setRequestContext(requestId, context) {
    this.requestContext.set(requestId, context);
  }

  getRequestContext(requestId) {
    return this.requestContext.get(requestId) || {};
  }

  clearRequestContext(requestId) {
    this.requestContext.delete(requestId);
  }

  error(message, data, requestId) {
    if (this.level >= LOG_LEVELS.ERROR) {
      const formatted = this.formatMessage('ERROR', message, data, requestId);
      console.error(formatted);
      
      if (data instanceof Error && data.stack) {
        console.error(data.stack);
      }
    }
  }

  warn(message, data, requestId) {
    if (this.level >= LOG_LEVELS.WARN) {
      const formatted = this.formatMessage('WARN', message, data, requestId);
      console.warn(formatted);
    }
  }

  info(message, data, requestId) {
    if (this.level >= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('INFO', message, data, requestId);
      console.log(formatted);
    }
  }

  debug(message, data, requestId) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      const formatted = this.formatMessage('DEBUG', message, data, requestId);
      console.log(formatted);
    }
  }

  success(message, data, requestId) {
    if (this.level >= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('SUCCESS', message, data, requestId);
      console.log(formatted);
    }
  }

  trace(message, data, requestId) {
    if (this.level >= LOG_LEVELS.TRACE) {
      const formatted = this.formatMessage('TRACE', message, data, requestId);
      console.log(formatted);
    }
  }

  // Request-specific logging methods
  request(req, message, data) {
    const requestId = req?.requestId;
    const context = this.getRequestContext(requestId);
    const enrichedData = { ...context, ...data, method: req?.method, url: req?.url };
    this.info(message, enrichedData, requestId);
  }

  requestError(req, message, error) {
    const requestId = req?.requestId;
    const context = this.getRequestContext(requestId);
    const enrichedData = { 
      ...context, 
      method: req?.method, 
      url: req?.url,
      userAgent: req?.get('user-agent')
    };
    this.error(message, { ...enrichedData, error }, requestId);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
