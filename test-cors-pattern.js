#!/usr/bin/env node

/**
 * Test CORS Pattern Matching for Replit Domains
 * Verifies that our CORS configuration correctly matches various Replit domain formats
 */

// The user's actual Replit domain
const userDomain = 'https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev';

// Our CORS patterns from corsConfig.js
const replitPatterns = [
  /^https:\/\/[a-z0-9-]+\.replit\.(app|dev)$/,
  /^https:\/\/[a-z0-9-]+\.[a-z]+\.replit\.dev$/,  // Should match subdomain.riker.replit.dev
  /^https:\/\/[a-z0-9-]+\.replit\.co$/  // Legacy format
];

// Test domains to check
const testDomains = [
  userDomain,
  'https://test.replit.app',
  'https://test.replit.dev',
  'https://abc123.riker.replit.dev',
  'https://my-project.wren.replit.dev',
  'https://test.replit.co',
  'http://test.replit.dev',  // Should fail - not HTTPS
  'https://malicious.com',   // Should fail - not Replit
];

console.log('🔍 Testing CORS Pattern Matching for Replit Domains\n');
console.log('=====================================\n');

// Test each domain against all patterns
testDomains.forEach(domain => {
  const matches = replitPatterns.some(pattern => pattern.test(domain));
  const icon = matches ? '✅' : '❌';
  const status = matches ? 'ALLOWED' : 'BLOCKED';

  console.log(`${icon} ${status}: ${domain}`);

  if (domain === userDomain) {
    console.log(`   ^ THIS IS THE USER'S DOMAIN - ${matches ? 'WILL WORK!' : 'PROBLEM DETECTED!'}\n`);

    if (matches) {
      // Show which pattern matched
      replitPatterns.forEach((pattern, index) => {
        if (pattern.test(domain)) {
          console.log(`   Matched by pattern ${index + 1}: ${pattern.source}`);
        }
      });
      console.log('');
    }
  }
});

console.log('\n=====================================\n');

// Test the specific pattern for the new Replit format
const newReplitPattern = /^https:\/\/[a-z0-9-]+\.[a-z]+\.replit\.dev$/;

console.log('📋 Testing New Replit Domain Format Pattern:\n');
console.log(`Pattern: ${newReplitPattern.source}\n`);

const newFormatDomains = [
  userDomain,
  'https://abc123.riker.replit.dev',
  'https://my-project-123.wren.replit.dev',
  'https://test-app-2025.sparrow.replit.dev',
  'https://8eb321a3-1f5e-47c6-a6fe-e5b806ca8c54-00-3pzgrnpj2hcui.riker.replit.dev'
];

newFormatDomains.forEach(domain => {
  const matches = newReplitPattern.test(domain);
  console.log(`${matches ? '✅' : '❌'} ${domain}`);

  if (!matches) {
    // Debug why it didn't match
    const parts = domain.match(/^(https?):\/\/([^.]+)\.([^.]+)\.(.+)$/);
    if (parts) {
      console.log(`   Protocol: ${parts[1]}`);
      console.log(`   Subdomain: ${parts[2]}`);
      console.log(`   Middle: ${parts[3]}`);
      console.log(`   Domain: ${parts[4]}`);
    }
  }
});

console.log('\n=====================================\n');
console.log('📝 Summary:\n');

if (replitPatterns.some(pattern => pattern.test(userDomain))) {
  console.log('✅ SUCCESS: User\'s Replit domain WILL BE ALLOWED by CORS');
  console.log('👍 The CORS configuration is correctly set up for the new Replit domain format');
  console.log('\n🚀 Next Steps:');
  console.log('1. Set environment variable: CORS_ALLOW_REPLIT_SUBDOMAINS=true');
  console.log('2. Restart the server');
  console.log('3. Test from the Replit URL');
} else {
  console.log('❌ PROBLEM: User\'s Replit domain WILL BE BLOCKED by CORS');
  console.log('🔧 The CORS configuration needs to be updated');
}

console.log('\n');