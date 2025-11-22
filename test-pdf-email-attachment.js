/**
 * Test PDF Email Attachment
 *
 * Tests that PDF attachments are correctly encoded and can be opened
 * after being emailed.
 *
 * Run: node test-pdf-email-attachment.js [user-uuid]
 */

require('dotenv').config();

const emailService = require('./lib/emailService');
const logger = require('./src/utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_EMAIL = process.env.TEST_EMAIL || process.env.SMTP_USER;
const USER_ID = process.argv[2]; // Optional: use existing user UUID

console.log('========================================');
console.log('📧 PDF Email Attachment Test');
console.log('========================================\n');

async function testPdfEmailAttachment() {
  try {
    console.log('[1/4] Checking environment variables...');

    if (!process.env.EMAIL_ENABLED || process.env.EMAIL_ENABLED !== 'true') {
      console.log('⚠️ EMAIL_ENABLED is not "true". Set EMAIL_ENABLED=true in .env');
      process.exit(1);
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('❌ Missing SMTP credentials in .env');
      process.exit(1);
    }

    console.log('✅ Environment configured\n');

    console.log('[2/4] Creating test PDF...');

    // Create a simple test PDF buffer
    // PDF Header
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(PDF Email Attachment Test) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'utf-8');
    console.log(`✅ Test PDF created (${pdfBuffer.length} bytes)\n`);

    console.log('[3/4] Sending PDF email...');
    console.log(`   To: ${TEST_EMAIL}`);
    console.log(`   User ID: ${USER_ID || 'TEST_USER_123'}\n`);

    const result = await emailService.sendEmails(
      TEST_EMAIL,
      pdfBuffer,
      USER_ID || 'TEST_USER_123'
    );

    if (!result.success) {
      console.log('❌ Email send failed:', result.error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log(`   User email ID: ${result.userEmailId}`);
    console.log(`   Accounts email ID: ${result.accountsEmailId}\n`);

    console.log('[4/4] Verification steps...\n');

    console.log('========================================');
    console.log('📋 Manual Verification Required');
    console.log('========================================\n');

    console.log('1. Check your inbox at:', TEST_EMAIL);
    console.log('2. Check accounts inbox at: accounts@carcrashlawyerai.co.uk');
    console.log('3. Verify the PDF attachment is present');
    console.log('4. Download and open the PDF');
    console.log('5. Confirm it opens without errors');
    console.log('6. Verify it shows "PDF Email Attachment Test" text\n');

    console.log('========================================');
    console.log('✅ TEST COMPLETE');
    console.log('========================================\n');

    console.log('If the PDF opens successfully, the attachment fix is working correctly.');
    console.log('If the PDF is corrupted or won\'t open, there may be additional issues.\n');

  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

// Run test
testPdfEmailAttachment();
