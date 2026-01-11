/**
 * Test Individual Deletion Endpoints
 *
 * Tests the new /api/deletions/* endpoints without actually deleting data.
 * Run: node test-deletion-endpoints.js
 */

const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:5000',
  // Replace with real auth token from browser DevTools -> Application -> Cookies
  authCookie: 'your-auth-token-here'
};

async function testEndpoint(method, path, description) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Testing: ${description}`);
  console.log(`${method} ${path}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const url = `${config.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Cookie': `sb-access-token=${config.authCookie}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const status = response.status;
    const statusText = response.statusText;

    console.log(`Status: ${status} ${statusText}`);

    let data;
    try {
      data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      const text = await response.text();
      console.log('Response (text):', text);
    }

    // Determine if test passed based on status code
    if (status === 401) {
      console.log('⚠️  Authentication required (expected if not logged in)');
    } else if (status === 404) {
      console.log('⚠️  Resource not found (expected for non-existent IDs)');
    } else if (status === 403) {
      console.log('⚠️  Forbidden (expected if testing other user\'s data)');
    } else if (status === 200) {
      console.log('✅ Success');
    } else {
      console.log(`❌ Unexpected status: ${status}`);
    }

    return { status, data };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Individual Deletion Endpoints Test Suite');
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Auth: ${config.authCookie === 'your-auth-token-here' ? '❌ Not configured' : '✅ Configured'}`);

  if (config.authCookie === 'your-auth-token-here') {
    console.log('\n⚠️  WARNING: No auth token configured!');
    console.log('To test authenticated endpoints:');
    console.log('1. Login at http://localhost:5000/login.html');
    console.log('2. Open DevTools → Application → Cookies');
    console.log('3. Copy "sb-access-token" value');
    console.log('4. Set authCookie in this script\n');
  }

  // Test with fake IDs (will return 404, which is expected)
  const fakeDocumentId = '00000000-0000-0000-0000-000000000001';
  const fakeReportId = '00000000-0000-0000-0000-000000000002';
  const fakePdfId = '00000000-0000-0000-0000-000000000003';
  const fakeTranscriptionId = '00000000-0000-0000-0000-000000000004';

  // Test each endpoint
  await testEndpoint('DELETE', `/api/deletions/document/${fakeDocumentId}`, 'Delete Document');
  await testEndpoint('DELETE', `/api/deletions/report/${fakeReportId}`, 'Delete Incident Report');
  await testEndpoint('DELETE', `/api/deletions/pdf/${fakePdfId}`, 'Delete PDF');
  await testEndpoint('DELETE', `/api/deletions/transcription/${fakeTranscriptionId}`, 'Delete Transcription');

  console.log('\n' + '='.repeat(60));
  console.log('Test Suite Complete');
  console.log('='.repeat(60));
  console.log('\n📋 Expected Results:');
  console.log('  - 401 Unauthorized → Auth middleware working ✅');
  console.log('  - 404 Not Found → ID validation working ✅');
  console.log('  - 403 Forbidden → Authorization check working ✅');
  console.log('  - 200 Success → Deletion successful ✅');
  console.log('\n💡 To test with real data:');
  console.log('  1. Get a real document/report ID from dashboard');
  console.log('  2. Replace fake IDs in this script');
  console.log('  3. Run: node test-deletion-endpoints.js');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
