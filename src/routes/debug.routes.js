
/**
 * Debug Routes for Car Crash Lawyer AI
 * Handles debug endpoints, testing, and system diagnostics
 */

const express = require('express');
const debugController = require('../controllers/debug.controller');

const router = express.Router();

/**
 * Authentication middleware for debug endpoints
 */
function checkSharedKey(req, res, next) {
  const config = require('../config');
  const { sendError } = require('../utils/response');
  const logger = require('../utils/logger');

  const headerKey = req.get('X-Api-Key');
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const provided = headerKey || bearer || '';

  if (!config.webhook.apiKey) {
    logger.warn('No ZAPIER_SHARED_KEY/WEBHOOK_API_KEY set');
    return sendError(res, 503, 'Server missing shared key', 'MISSING_API_KEY');
  }

  if (provided !== config.webhook.apiKey) {
    logger.warn('Debug endpoint authentication failed', { ip: req.clientIp });
    return sendError(res, 401, 'Unauthorized', 'INVALID_API_KEY');
  }

  return next();
}

/**
 * Debug user data
 * GET /api/debug/user/:userId
 * Requires API key authentication
 */
router.get('/user/:userId', checkSharedKey, debugController.debugUser);

/**
 * Test OpenAI API
 * GET /api/debug/test-openai
 */
router.get('/test-openai', debugController.testOpenAI);

/**
 * Manual queue processing
 * GET /api/debug/process-queue
 * Requires API key authentication
 */
router.get('/process-queue', checkSharedKey, debugController.processQueue);

/**
 * Test transcription queue
 * GET /api/debug/transcription-queue
 */
router.get('/transcription-queue', debugController.testTranscriptionQueue);

/**
 * Test process transcription queue
 * POST /api/debug/process-transcription-queue
 * Requires API key authentication
 */
router.post('/process-transcription-queue', checkSharedKey, debugController.testProcessTranscriptionQueue);

/**
 * System health check
 * GET /api/debug/health
 */
router.get('/health', debugController.getHealth);

/**
 * Email Configuration Diagnostic
 * GET /api/debug/email-config
 * Returns email configuration (Resend) to diagnose email issues
 */
router.get('/email-config', (req, res) => {
  const config = {
    RESEND_API_KEY: process.env.RESEND_API_KEY
      ? `${process.env.RESEND_API_KEY.substring(0, 10)}...`
      : 'NOT SET',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'NOT SET (defaults to noreply@carcrashlawyerai.co.uk)',
    ACCOUNTS_EMAIL: process.env.ACCOUNTS_EMAIL || 'accounts@carcrashlawyerai.com',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@carcrashlawyerai.com'
  };

  res.json({
    status: 'Email Configuration (Resend)',
    timestamp: new Date().toISOString(),
    environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
    config,
    diagnosis: {
      resendConfigured: !!process.env.RESEND_API_KEY,
      fromEmailConfigured: !!process.env.RESEND_FROM_EMAIL
    }
  });
});

/**
 * Email Send Test
 * GET /api/debug/email-test?to=test@example.com
 * Sends a test email via Resend
 */
router.get('/email-test', async (req, res) => {
  const { sendEmail } = require('../../lib/emailService');
  const testEmail = req.query.to;

  if (!testEmail) {
    return res.json({
      success: false,
      error: 'Please provide ?to=email@example.com'
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.json({
      success: false,
      error: 'RESEND_API_KEY not configured'
    });
  }

  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email from Car Crash Lawyer AI',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email sent at ${new Date().toLocaleString('en-GB')}.</p>
        <p>If you received this, your email configuration is working correctly.</p>
      `
    });

    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      sentTo: testEmail
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PDF Pipeline Health Check
 * GET /api/debug/pdf-health
 * Comprehensive check of all PDF generation and delivery components
 */
router.get('/pdf-health', checkSharedKey, async (req, res) => {
  const { createClient } = require('@supabase/supabase-js');
  const logger = require('../utils/logger');

  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
    overall: 'unknown',
    components: {}
  };

  let allPassed = true;

  try {
    // 1. Check Supabase connection
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Check incident_reports columns exist (the ones we fixed)
    const { data: columnCheck, error: columnError } = await supabase
      .from('incident_reports')
      .select('id, pdf_send_in_progress, pdf_send_started_at, pdf_sent_at')
      .limit(1);

    if (columnError) {
      checks.components.database_columns = {
        status: 'FAIL',
        error: columnError.message,
        hint: 'Run migration 032_add_pdf_send_guard_to_incident_reports.sql'
      };
      allPassed = false;
    } else {
      checks.components.database_columns = {
        status: 'PASS',
        columns: ['pdf_send_in_progress', 'pdf_send_started_at', 'pdf_sent_at'],
        message: 'All required PDF lock columns exist'
      };
    }

    // 3. Check lock acquisition works (two-step approach without .or())
    const testIncidentId = 'health-check-test-' + Date.now();

    // Test SELECT query (step 1 of our fix)
    const { error: selectTestError } = await supabase
      .from('incident_reports')
      .select('id, pdf_send_in_progress, pdf_send_started_at')
      .eq('id', testIncidentId)
      .is('pdf_sent_at', null);

    if (selectTestError) {
      checks.components.lock_select = {
        status: 'FAIL',
        error: selectTestError.message
      };
      allPassed = false;
    } else {
      checks.components.lock_select = {
        status: 'PASS',
        message: 'Lock eligibility check (SELECT) works correctly'
      };
    }

    // 4. Check pdf_generation_queue table
    const { data: queueStats, error: queueError } = await supabase
      .from('pdf_generation_queue')
      .select('status')
      .limit(100);

    if (queueError) {
      checks.components.queue_table = {
        status: 'FAIL',
        error: queueError.message
      };
      allPassed = false;
    } else {
      const pending = (queueStats || []).filter(q => q.status === 'pending').length;
      const processing = (queueStats || []).filter(q => q.status === 'processing').length;
      const completed = (queueStats || []).filter(q => q.status === 'completed').length;
      const failed = (queueStats || []).filter(q => q.status === 'failed').length;

      checks.components.queue_table = {
        status: 'PASS',
        counts: { pending, processing, completed, failed },
        warning: pending > 10 ? 'High pending count - check queue processor' : null
      };
    }

    // 5. Check completed_incident_forms table
    const { data: formsData, error: formsError } = await supabase
      .from('completed_incident_forms')
      .select('id, generated_at')
      .order('generated_at', { ascending: false })
      .limit(5);

    if (formsError) {
      checks.components.completed_forms_table = {
        status: 'FAIL',
        error: formsError.message
      };
      allPassed = false;
    } else {
      const recentCount = formsData?.length || 0;
      const latestGenerated = formsData?.[0]?.generated_at || null;

      checks.components.completed_forms_table = {
        status: 'PASS',
        recent_count: recentCount,
        latest_generated: latestGenerated,
        message: recentCount > 0
          ? `Found ${recentCount} recent PDFs, latest: ${latestGenerated}`
          : 'Table accessible but no recent PDFs'
      };
    }

    // 6. Check Resend email configuration
    checks.components.email_service = {
      status: process.env.RESEND_API_KEY ? 'PASS' : 'FAIL',
      resend_configured: !!process.env.RESEND_API_KEY,
      from_email: process.env.RESEND_FROM_EMAIL || 'noreply@carcrashlawyerai.com',
      accounts_email: process.env.ACCOUNTS_EMAIL || 'accounts@carcrashlawyerai.com'
    };

    if (!process.env.RESEND_API_KEY) {
      allPassed = false;
    }

    // 7. Check for stuck locks (in_progress for > 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: stuckLocks, error: stuckError } = await supabase
      .from('incident_reports')
      .select('id, pdf_send_in_progress, pdf_send_started_at')
      .eq('pdf_send_in_progress', true)
      .lt('pdf_send_started_at', tenMinutesAgo);

    if (stuckError) {
      checks.components.stuck_locks = {
        status: 'WARN',
        error: stuckError.message
      };
    } else {
      const stuckCount = stuckLocks?.length || 0;
      checks.components.stuck_locks = {
        status: stuckCount > 0 ? 'WARN' : 'PASS',
        count: stuckCount,
        message: stuckCount > 0
          ? `${stuckCount} incidents have stuck PDF locks (>10 min old)`
          : 'No stuck locks detected'
      };

      if (stuckCount > 0) {
        checks.components.stuck_locks.stuck_ids = stuckLocks.map(l => l.id);
      }
    }

    // 8. Check for orphaned queue entries (completed but no form_id)
    const { data: orphanedJobs, error: orphanError } = await supabase
      .from('pdf_generation_queue')
      .select('id, create_user_id, incident_id, completed_at')
      .eq('status', 'completed')
      .is('completed_form_id', null);

    if (orphanError) {
      checks.components.orphaned_jobs = {
        status: 'WARN',
        error: orphanError.message
      };
    } else {
      const orphanCount = orphanedJobs?.length || 0;
      checks.components.orphaned_jobs = {
        status: orphanCount > 0 ? 'FAIL' : 'PASS',
        count: orphanCount,
        message: orphanCount > 0
          ? `${orphanCount} queue jobs marked completed WITHOUT a PDF (BUG DETECTED!)`
          : 'No orphaned jobs - queue integrity OK'
      };

      if (orphanCount > 0) {
        allPassed = false;
        checks.components.orphaned_jobs.action_required =
          'Run node requeue-failed-pdfs.js to reset these jobs';
      }
    }

    // 9. Check PDF service dependencies
    try {
      const fs = require('fs');
      const pdfTemplatePath = process.env.PDF_TEMPLATE_PATH || './pdf-templates/MIB-4-claim-form.pdf';
      const templateExists = fs.existsSync(pdfTemplatePath);

      checks.components.pdf_template = {
        status: templateExists ? 'PASS' : 'FAIL',
        path: pdfTemplatePath,
        exists: templateExists
      };

      if (!templateExists) {
        allPassed = false;
      }
    } catch (fsError) {
      checks.components.pdf_template = {
        status: 'WARN',
        error: fsError.message
      };
    }

    // Overall status
    checks.overall = allPassed ? 'HEALTHY' : 'ISSUES_DETECTED';

    // Add summary
    const passedCount = Object.values(checks.components).filter(c => c.status === 'PASS').length;
    const totalCount = Object.keys(checks.components).length;

    checks.summary = {
      passed: passedCount,
      total: totalCount,
      percentage: Math.round((passedCount / totalCount) * 100) + '%'
    };

    logger.info('PDF health check completed', { overall: checks.overall, summary: checks.summary });

    res.json(checks);

  } catch (error) {
    logger.error('PDF health check failed', { error: error.message });

    checks.overall = 'ERROR';
    checks.error = error.message;
    checks.stack = process.env.NODE_ENV === 'development' ? error.stack : undefined;

    res.status(500).json(checks);
  }
});

// Legacy SMTP endpoints (kept for backwards compatibility)
router.get('/smtp-config', (req, res) => {
  res.redirect('/api/debug/email-config');
});

router.get('/smtp-test', (req, res) => {
  res.json({
    success: false,
    error: 'SMTP has been replaced with Resend. Use /api/debug/email-test?to=your@email.com instead.'
  });
});

/**
 * ============================================
 * COOKIE DEBUGGING ENDPOINTS (TEMPORARY)
 * DELETE THESE AFTER FIXING SESSION ISSUE
 * ============================================
 */

/**
 * Test setting a simple cookie
 * GET /api/debug/test-set-cookie
 */
router.get('/test-set-cookie', (req, res) => {
  console.log('🔧 DEBUG: Setting test cookie...');

  res.cookie('test_cookie', 'test_value_123', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  console.log('✅ Test cookie set');

  res.json({
    success: true,
    message: 'Test cookie set successfully',
    cookieName: 'test_cookie',
    cookieValue: 'test_value_123',
    instructions: 'Now call /api/debug/test-read-cookie to verify it was stored'
  });
});

/**
 * Test reading cookies
 * GET /api/debug/test-read-cookie
 */
router.get('/test-read-cookie', (req, res) => {
  console.log('🔧 DEBUG: Reading cookies...');
  console.log('Cookies received:', req.cookies);

  const testCookie = req.cookies.test_cookie;

  res.json({
    success: true,
    allCookies: req.cookies,
    testCookieFound: !!testCookie,
    testCookieValue: testCookie || 'NOT FOUND',
    diagnosis: testCookie
      ? '✅ Cookies are working! Browser stored and sent the cookie.'
      : '❌ Cookie NOT found. Browser did not store or send the cookie.'
  });
});

/**
 * Test auth-like cookie flow
 * POST /api/debug/test-auth-cookies
 */
router.post('/test-auth-cookies', (req, res) => {
  console.log('🔧 DEBUG: Testing auth cookie flow...');

  const testAccessToken = 'test_access_' + Date.now();
  const testRefreshToken = 'test_refresh_' + Date.now();

  res.cookie('access_token', testAccessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.cookie('refresh_token', testRefreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  console.log('✅ Auth-like cookies set');

  res.json({
    success: true,
    message: 'Auth cookies set (simulated)',
    cookiesSet: ['access_token', 'refresh_token'],
    nextStep: 'Call /api/debug/test-verify-auth-cookies to verify'
  });
});

/**
 * Verify auth cookies are sent
 * GET /api/debug/test-verify-auth-cookies
 */
router.get('/test-verify-auth-cookies', (req, res) => {
  console.log('🔧 DEBUG: Verifying auth cookies...');
  console.log('All cookies:', req.cookies);

  const hasAccessToken = !!req.cookies.access_token;
  const hasRefreshToken = !!req.cookies.refresh_token;

  res.json({
    success: true,
    cookiesPresent: {
      access_token: hasAccessToken,
      refresh_token: hasRefreshToken
    },
    diagnosis: hasAccessToken && hasRefreshToken
      ? '✅ Both cookies working! The cookie mechanism is fine.'
      : '❌ Cookies NOT being sent - browser is not storing them!',
    possibleCauses: !hasAccessToken || !hasRefreshToken ? [
      'Browser blocking cookies',
      'Credentials: include not set in fetch',
      'CORS not allowing credentials',
      'SameSite or Secure flags incompatible'
    ] : []
  });
});

module.exports = router;
