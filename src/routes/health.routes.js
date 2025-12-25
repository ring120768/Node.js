
/**
 * Health check routes for monitoring and readiness probes
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const config = require('../config');

// Health check with comprehensive system information
router.get('/healthz', (req, res) => {
  const agentService = req.app.locals.agentService;
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
    port: config.app.port,
    agentRunning: !!global.__AGENT_RUNNING__ && agentService ? agentService.isRunning : false,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown'
  };
  
  res.status(200).json(health);
});

// Readiness probe with dependency checks
router.get('/readyz', async (req, res) => {
  const checks = {};
  let overallStatus = 'ready';
  let statusCode = 200;

  try {
    // Check PORT presence
    checks.port = {
      status: process.env.PORT ? 'ok' : 'error',
      value: process.env.PORT,
      message: 'PORT environment variable'
    };

    // Check environment variables
    checks.environment = {
      status: process.env.SUPABASE_URL && process.env.OPENAI_API_KEY ? 'ok' : 'error',
      message: 'Required environment variables present'
    };

    // Quick Supabase connection test (if available)
    const supabase = req.app.locals.supabase;
    if (supabase) {
      try {
        // Simple SELECT 1 equivalent - just test connection
        const { error } = await supabase
          .from('user_signup')
          .select('id')
          .limit(1);
        
        checks.supabase = {
          status: error && error.code !== '42P01' ? 'error' : 'ok',
          message: error && error.code !== '42P01' ? error.message : 'Database connection healthy'
        };
      } catch (supabaseError) {
        checks.supabase = {
          status: 'error',
          message: 'Database connection failed',
          error: supabaseError.message
        };
      }
    } else {
      checks.supabase = {
        status: 'warning',
        message: 'Supabase not configured'
      };
    }

    // Check webhook routes are mounted
    const app = req.app;
    const webhookRouteExists = app._router && 
      app._router.stack.some(layer => 
        layer.regexp && layer.regexp.toString().includes('webhooks')
      );
    
    checks.webhooks = {
      status: webhookRouteExists ? 'ok' : 'error',
      message: 'Webhook routes mounted'
    };

    // Check agent service
    const agentService = req.app.locals.agentService;
    checks.agent = {
      status: agentService && agentService.isRunning ? 'ok' : 'warning',
      message: 'Background agent service',
      running: !!global.__AGENT_RUNNING__
    };

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memThreshold = 512 * 1024 * 1024; // 512MB threshold
    checks.memory = {
      status: memUsage.heapUsed < memThreshold ? 'ok' : 'warning',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      threshold: '512MB'
    };

    // Determine overall status
    const hasErrors = Object.values(checks).some(check => check.status === 'error');
    if (hasErrors) {
      overallStatus = 'not ready';
      statusCode = 503;
    } else if (Object.values(checks).some(check => check.status === 'warning')) {
      overallStatus = 'ready with warnings';
    }

  } catch (error) {
    logger.error('Readiness check failed:', error, req.requestId);
    overallStatus = 'error';
    statusCode = 503;
    checks.error = {
      status: 'error',
      message: error.message
    };
  }

  const readiness = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  };

  res.status(statusCode).json(readiness);
});

// Liveness probe (simple heartbeat)
router.get('/livez', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

// Puppeteer health check - test if browser can be launched
router.get('/puppeteer-health', async (req, res) => {
  const htmlToPdfConverter = require('../services/htmlToPdfConverter');

  try {
    logger.info('Starting Puppeteer health check...');
    console.log('🔍 Puppeteer health check starting...');

    const startTime = Date.now();
    const isHealthy = await htmlToPdfConverter.healthCheck();
    const duration = Date.now() - startTime;

    if (isHealthy) {
      console.log('✅ Puppeteer health check passed in', duration, 'ms');
      res.status(200).json({
        status: 'ok',
        message: 'Puppeteer is working',
        duration: duration + 'ms',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Puppeteer health check failed');
      res.status(503).json({
        status: 'error',
        message: 'Puppeteer failed to generate PDF',
        duration: duration + 'ms',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Puppeteer health check exception:', error.message);
    console.error('   Stack:', error.stack);
    res.status(503).json({
      status: 'error',
      message: 'Puppeteer health check failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// TEMPORARY: Test PDF generation with font fix
// TODO: Remove after confirming fix works
router.get('/test-pdf/:userId', async (req, res) => {
  const { fetchAllData } = require('../../lib/dataFetcher');
  const pdfService = require('../services/adobePdfFormFillerService');

  try {
    const userId = req.params.userId;
    console.log('🧪 Test PDF generation for:', userId);

    // Fetch data
    const data = await fetchAllData(userId);
    if (!data.currentIncident) {
      return res.status(404).json({ error: 'No incident data found' });
    }

    console.log('📊 AI data present:',
      'voice_transcription:', data.currentIncident.voice_transcription?.length || 0,
      'ai_summary:', data.currentIncident.ai_summary?.length || 0
    );

    // Generate PDF
    const pdfBuffer = await pdfService.fillPdfForm(data);

    console.log('✅ PDF generated:', pdfBuffer.length, 'bytes');

    // Return PDF directly
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=test-pdf.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Test PDF error:', error.message);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// DIAGNOSTIC: Test HTML template rendering with Puppeteer
router.get('/test-html-pdf', async (req, res) => {
  const aiAnalysisHtmlRenderer = require('../services/aiAnalysisHtmlRenderer');
  const htmlToPdfConverter = require('../services/htmlToPdfConverter');

  try {
    console.log('🧪 Testing HTML template rendering...');

    // Use minimal test data
    const testData = {
      voice_transcription: 'Test transcription content for Railway debugging.',
      analysis_metadata: JSON.stringify({ model: 'test', timestamp: new Date().toISOString() }),
      quality_review: 'Test quality review.',
      ai_summary: 'Test AI summary content.',
      closing_statement: '<p>Test closing statement with HTML.</p>',
      final_review: 'Test final review content.'
    };

    // Step 1: Render HTML
    console.log('📝 Rendering HTML templates...');
    const htmlPages = await aiAnalysisHtmlRenderer.renderAllPages(testData);
    console.log('✅ HTML rendered, sizes:', {
      page13: htmlPages.page13?.length || 0,
      page14: htmlPages.page14?.length || 0,
      page15: htmlPages.page15?.length || 0,
      page16: htmlPages.page16?.length || 0
    });

    // Step 2: Convert to PDF
    console.log('🔄 Converting HTML to PDF with Puppeteer...');
    const pdfBuffers = await htmlToPdfConverter.convertMultiplePages(htmlPages);
    console.log('✅ PDF conversion complete, sizes:', {
      page13: pdfBuffers.page13?.length || 0,
      page14: pdfBuffers.page14?.length || 0,
      page15: pdfBuffers.page15?.length || 0,
      page16: pdfBuffers.page16?.length || 0
    });

    // Return the first page as test
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename=test-html.pdf',
      'Content-Length': pdfBuffers.page13.length
    });
    res.send(pdfBuffers.page13);

  } catch (error) {
    console.error('❌ HTML PDF test failed:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      step: 'html-to-pdf'
    });
  }
});

module.exports = router;
