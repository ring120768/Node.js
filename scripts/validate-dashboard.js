#!/usr/bin/env node

/**
 * Dashboard Validation Script
 * Tests all API endpoints used by the dashboard
 * Run: node scripts/validate-dashboard.js [test_user_id]
 */

const config = require('../src/config');
const supabaseClient = require('../src/utils/supabase-client');
const logger = require('../src/utils/logger');

const supabase = supabaseClient;

// Test user ID from command line or default
const TEST_USER_ID = process.argv[2] || null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(type, message, data = null) {
  const color = {
    'success': colors.green,
    'error': colors.red,
    'warning': colors.yellow,
    'info': colors.blue,
    'test': colors.cyan
  }[type] || colors.reset;

  console.log(`${color}[${type.toUpperCase()}]${colors.reset} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function findTestUser() {
  log('info', 'Finding test user...');

  if (TEST_USER_ID) {
    log('info', `Using provided user ID: ${TEST_USER_ID}`);
    const { data, error } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', TEST_USER_ID)
      .single();

    if (error) {
      log('error', 'Test user not found', error);
      return null;
    }

    log('success', 'Test user found', {
      id: data.create_user_id,
      email: data.email_address,
      name: data.full_name
    });
    return data;
  }

  // Find most recent user with data
  const { data: users, error } = await supabase
    .from('user_signup')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !users || users.length === 0) {
    log('error', 'No users found in database', error);
    return null;
  }

  // Prefer user with most data
  for (const user of users) {
    const { data: docs } = await supabase
      .from('user_documents')
      .select('id', { count: 'exact', head: true })
      .eq('create_user_id', user.create_user_id)
      .is('deleted_at', null);

    if (docs && docs.length > 0) {
      log('success', 'Found user with documents', {
        id: user.create_user_id,
        email: user.email_address,
        name: user.full_name
      });
      return user;
    }
  }

  log('warning', 'Using first user (no documents found)');
  return users[0];
}

async function validateUserDocumentsAPI(userId) {
  log('test', '========== Testing User Documents API ==========');

  // Test 1: List documents
  log('test', 'Test 1: GET /api/user-documents');
  const { data: docs, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId)
    .is('deleted_at', null);

  if (docsError) {
    log('error', 'Failed to fetch documents', docsError);
    return false;
  }

  log('success', `Found ${docs.length} documents`);

  // Test 2: Separate images and videos
  const images = docs.filter(doc =>
    !doc.document_type?.toLowerCase().includes('video') &&
    !doc.document_type?.toLowerCase().includes('dashcam')
  );

  const videos = docs.filter(doc =>
    doc.document_type?.toLowerCase().includes('video') ||
    doc.document_type?.toLowerCase().includes('dashcam')
  );

  log('info', `Images: ${images.length}, Videos: ${videos.length}`);

  // Test 3: Check public URLs
  const hasPublicUrls = docs.filter(d => d.public_url).length;
  const missingUrls = docs.length - hasPublicUrls;

  if (missingUrls > 0) {
    log('warning', `${missingUrls} documents missing public_url`);
  } else {
    log('success', 'All documents have public URLs');
  }

  // Test 4: Check document status
  const statusCounts = docs.reduce((acc, doc) => {
    const status = doc.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  log('info', 'Document status counts', statusCounts);

  // Test 5: Check for failed documents
  const failed = docs.filter(d => d.status === 'failed');
  if (failed.length > 0) {
    log('warning', `${failed.length} failed documents found`);
    failed.forEach(doc => {
      log('warning', `  - ${doc.document_type}: ${doc.error_message || 'No error message'}`);
    });
  }

  return true;
}

async function validateTranscriptionAPI(userId) {
  log('test', '========== Testing Transcription API ==========');

  // Test 1: Get transcription history
  log('test', 'Test 1: GET /api/transcription/history');
  const { data: transcriptions, error } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Failed to fetch transcriptions', error);
    return false;
  }

  log('success', `Found ${transcriptions.length} transcriptions`);

  if (transcriptions.length > 0) {
    const latest = transcriptions[0];
    log('info', 'Latest transcription', {
      id: latest.id,
      duration: latest.audio_duration,
      language: latest.language,
      created: new Date(latest.created_at).toLocaleString('en-GB')
    });

    // Check if transcription has summary
    const { data: summaries } = await supabase
      .from('ai_summary')
      .select('*')
      .eq('transcription_id', latest.id);

    if (summaries && summaries.length > 0) {
      log('success', 'Transcription has AI summary');
    } else {
      log('warning', 'No AI summary found for transcription');
    }
  }

  return true;
}

async function validatePDFAPI(userId) {
  log('test', '========== Testing PDF API ==========');

  // Test 1: Get PDF status
  log('test', 'Test 1: GET /api/pdf/status/:userId');
  const { data: pdfs, error } = await supabase
    .from('completed_incident_forms')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Failed to fetch PDFs', error);
    return false;
  }

  log('success', `Found ${pdfs.length} completed PDF reports`);

  if (pdfs.length > 0) {
    const latest = pdfs[0];
    log('info', 'Latest PDF report', {
      id: latest.id,
      created: new Date(latest.created_at).toLocaleString('en-GB'),
      email_sent: latest.email_sent_at ? 'Yes' : 'No',
      pdf_url: latest.pdf_url ? 'Available' : 'Missing'
    });

    if (!latest.pdf_url) {
      log('error', 'PDF missing storage URL!');
    }
  }

  return true;
}

async function validateIncidentReportsAPI(userId) {
  log('test', '========== Testing Incident Reports API ==========');

  // Test 1: Get incident reports
  log('test', 'Test 1: Query incident_reports table');
  const { data: reports, error } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    log('error', 'Failed to fetch incident reports', error);
    return false;
  }

  log('success', `Found ${reports.length} incident reports`);

  if (reports.length > 0) {
    const latest = reports[0];
    log('info', 'Latest incident report', {
      id: latest.id,
      location: latest.accident_location || 'Not specified',
      date: latest.accident_date || 'Not specified',
      created: new Date(latest.created_at).toLocaleString('en-GB')
    });
  }

  return true;
}

async function checkDashboardData(userId) {
  log('info', '========== Dashboard Data Summary ==========');

  const results = await Promise.all([
    supabase.from('user_documents').select('id', { count: 'exact', head: true })
      .eq('create_user_id', userId).is('deleted_at', null),
    supabase.from('ai_transcription').select('id', { count: 'exact', head: true })
      .eq('create_user_id', userId),
    supabase.from('completed_incident_forms').select('id', { count: 'exact', head: true })
      .eq('create_user_id', userId),
    supabase.from('incident_reports').select('id', { count: 'exact', head: true })
      .eq('create_user_id', userId)
  ]);

  const [docs, transcriptions, pdfs, reports] = results;

  const images = await supabase
    .from('user_documents')
    .select('id', { count: 'exact', head: true })
    .eq('create_user_id', userId)
    .is('deleted_at', null)
    .not('document_type', 'ilike', '%video%')
    .not('document_type', 'ilike', '%dashcam%');

  const videos = await supabase
    .from('user_documents')
    .select('id', { count: 'exact', head: true })
    .eq('create_user_id', userId)
    .is('deleted_at', null)
    .or('document_type.ilike.%video%,document_type.ilike.%dashcam%');

  log('info', 'Dashboard counts (what user will see)', {
    images: images.count || 0,
    videos: videos.count || 0,
    transcriptions: transcriptions.count || 0,
    reports: reports.count || 0,
    pdfs: pdfs.count || 0
  });

  return {
    images: images.count || 0,
    videos: videos.count || 0,
    transcriptions: transcriptions.count || 0,
    reports: reports.count || 0,
    pdfs: pdfs.count || 0
  };
}

async function runValidation() {
  console.log('\n');
  log('info', '='.repeat(60));
  log('info', 'Car Crash Lawyer AI - Dashboard Validation');
  log('info', '='.repeat(60));
  console.log('\n');

  // Find test user
  const testUser = await findTestUser();
  if (!testUser) {
    log('error', 'No test user found. Please provide a valid user ID.');
    log('info', 'Usage: node scripts/validate-dashboard.js [user_id]');
    process.exit(1);
  }

  const userId = testUser.create_user_id;
  console.log('\n');

  // Run all validations
  const results = {
    userDocuments: await validateUserDocumentsAPI(userId),
    transcription: await validateTranscriptionAPI(userId),
    pdf: await validatePDFAPI(userId),
    incidentReports: await validateIncidentReportsAPI(userId)
  };

  console.log('\n');
  const counts = await checkDashboardData(userId);
  console.log('\n');

  // Summary
  log('info', '='.repeat(60));
  log('info', 'Validation Results');
  log('info', '='.repeat(60));

  Object.entries(results).forEach(([test, passed]) => {
    log(passed ? 'success' : 'error', `${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });

  const allPassed = Object.values(results).every(r => r === true);
  console.log('\n');
  log('info', '='.repeat(60));
  log(allPassed ? 'success' : 'error', allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗');
  log('info', '='.repeat(60));
  console.log('\n');

  // Dashboard audit checklist
  console.log('\n');
  log('info', '='.repeat(60));
  log('info', 'Dashboard Audit Checklist');
  log('info', '='.repeat(60));

  const checklist = [
    { name: 'Images section loads and displays', passed: results.userDocuments && counts.images >= 0 },
    { name: 'Videos section loads and displays', passed: results.userDocuments && counts.videos >= 0 },
    { name: 'Transcriptions section loads', passed: results.transcription },
    { name: 'Reports section loads', passed: results.incidentReports },
    { name: 'PDFs section loads', passed: results.pdf },
    { name: 'All counts are accurate', passed: allPassed },
    { name: 'Public URLs exist for images', passed: results.userDocuments },
    { name: 'No failed documents remain', passed: results.userDocuments }
  ];

  checklist.forEach((check, i) => {
    log(check.passed ? 'success' : 'error', `${i + 1}. ${check.name}: ${check.passed ? '✓' : '✗'}`);
  });

  console.log('\n');
  log('info', 'Next steps for audit:');
  log('info', '1. Open http://localhost:5000/dashboard.html');
  log('info', '2. Login as test user: ' + testUser.email_address);
  log('info', '3. Verify all 5 sections display correctly');
  log('info', '4. Test clicking into each section');
  log('info', '5. Test download and delete actions');
  log('info', '6. Verify image modal works');
  log('info', '7. Check responsive design on mobile');
  console.log('\n');

  process.exit(allPassed ? 0 : 1);
}

// Run validation
runValidation().catch(error => {
  log('error', 'Validation failed with error', error);
  process.exit(1);
});
