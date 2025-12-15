#!/usr/bin/env node

/**
 * Login Flow Diagnostic Tool
 * Tests the complete login flow and cookie behavior
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Test credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  rememberMe: true
};

async function testLoginFlow() {
  console.log('🔍 Starting Login Flow Diagnostic\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Test login endpoint
    console.log('\n📝 STEP 1: Testing login endpoint...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        rememberMe: TEST_USER.rememberMe,
        gdprConsent: true,
        consentTimestamp: new Date().toISOString()
      }),
      // Don't send credentials yet - testing if server sets cookies
    });

    console.log('   Status:', loginResponse.status);
    console.log('   Status Text:', loginResponse.statusText);

    // Check Set-Cookie headers
    const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
    console.log('\n   🍪 Set-Cookie Headers Received:');
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie, index) => {
        console.log(`   ${index + 1}. ${cookie}`);
      });
    } else {
      console.log('   ❌ NO SET-COOKIE HEADERS FOUND!');
      console.log('   This is the problem - server is not sending cookies');
    }

    const loginData = await loginResponse.json();
    console.log('\n   Response Body:', JSON.stringify(loginData, null, 2));

    // Step 2: Extract cookies if present
    console.log('\n📝 STEP 2: Extracting cookies from response...');
    const cookies = {};
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookieStr => {
        const [cookiePair] = cookieStr.split(';');
        const [name, value] = cookiePair.split('=');
        cookies[name.trim()] = value.trim();
      });
      console.log('   Extracted cookies:', cookies);
    } else {
      console.log('   ❌ No cookies to extract');
    }

    // Step 3: Test session endpoint with cookies
    if (Object.keys(cookies).length > 0) {
      console.log('\n📝 STEP 3: Testing session endpoint with cookies...');

      const cookieHeader = Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');

      console.log('   Sending Cookie header:', cookieHeader);

      const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader
        }
      });

      console.log('   Status:', sessionResponse.status);
      const sessionData = await sessionResponse.json();
      console.log('   Response:', JSON.stringify(sessionData, null, 2));

      if (sessionResponse.status === 200) {
        console.log('   ✅ Session validated successfully');
      } else {
        console.log('   ❌ Session validation failed');
      }
    } else {
      console.log('\n📝 STEP 3: Skipped - no cookies to test');
    }

    // Step 4: Test auth middleware
    console.log('\n📝 STEP 4: Testing protected endpoint...');
    if (Object.keys(cookies).length > 0) {
      const cookieHeader = Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');

      const protectedResponse = await fetch(`${BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader
        }
      });

      console.log('   Status:', protectedResponse.status);
      if (protectedResponse.status === 200) {
        console.log('   ✅ Auth middleware accepted cookies');
      } else {
        console.log('   ❌ Auth middleware rejected cookies');
        const errorData = await protectedResponse.json();
        console.log('   Error:', JSON.stringify(errorData, null, 2));
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DIAGNOSTIC SUMMARY:');
    console.log('='.repeat(60));

    if (!setCookieHeaders || setCookieHeaders.length === 0) {
      console.log('\n❌ CRITICAL ISSUE: Server is not sending Set-Cookie headers');
      console.log('   Possible causes:');
      console.log('   1. auth.controller.js is not calling res.cookie()');
      console.log('   2. CORS is stripping cookies');
      console.log('   3. Server middleware is interfering');
      console.log('\n   Fix: Check auth.controller.js login function');
    } else if (!cookies.access_token) {
      console.log('\n❌ ISSUE: access_token cookie not being set');
      console.log('   Check: auth.controller.js line ~238-248');
    } else if (!cookies.refresh_token) {
      console.log('\n⚠️  WARNING: refresh_token cookie not being set');
      console.log('   Check: auth.controller.js line ~250-260');
    } else {
      console.log('\n✅ Cookies are being set correctly by server');
      console.log('   The issue is likely on the frontend:');
      console.log('   - Check if credentials:"include" is set in fetch calls');
      console.log('   - Check browser console for CORS errors');
      console.log('   - Check if cookies are httpOnly (view in Network tab)');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/healthz`);
    if (response.status === 200) {
      console.log('✅ Server is running\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error('   Please start the server with: npm start');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await testLoginFlow();
}

main();
