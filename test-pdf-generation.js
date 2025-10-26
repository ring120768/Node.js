#!/usr/bin/env node
/**
 * Test Script: PDF Form Generation with Real User Data
 * Purpose: Test complete PDF generation pipeline and verify field population
 * Usage: node test-pdf-generation.js <user-id>
 * Example: node test-pdf-generation.js nkwxh49sm2swwlzxtx1bnkwxhroukfn7
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

function logField(name, value, populated) {
  const status = populated ? `${colors.green}✓${colors.reset}` : `${colors.dim}○${colors.reset}`;
  const valueDisplay = value !== null && value !== undefined && value !== '' 
    ? String(value).substring(0, 50) 
    : colors.dim + 'empty' + colors.reset;
  console.log(`${status} ${name.padEnd(40)} ${valueDisplay}`);
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('❌ Missing Supabase credentials in .env file', 'red');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetch all data for a specific user
 */
async function fetchUserData(userId) {
  logSection('📊 FETCHING USER DATA FROM SUPABASE');
  log(`User ID: ${userId}`, 'yellow');

  const data = {};
  let totalFields = 0;
  let populatedFields = 0;

  // 1. User Signup Data
  log('\n📝 Fetching user_signup...', 'blue');
  const { data: userSignup, error: signupError } = await supabase
    .from('user_signup')
    .select('*')
    .eq('create_user_id', userId)
    .single();

  if (signupError) {
    log(`⚠️  No user_signup record found: ${signupError.message}`, 'yellow');
  } else {
    data.userSignup = userSignup;
    log('✅ User signup data retrieved', 'green');
  }

  // 2. Incident Reports Data
  log('\n📋 Fetching incident_reports...', 'blue');
  const { data: incidentReports, error: incidentError } = await supabase
    .from('incident_reports')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (incidentError) {
    log(`⚠️  No incident reports found: ${incidentError.message}`, 'yellow');
  } else {
    data.incidentReports = incidentReports;
    log(`✅ Found ${incidentReports.length} incident report(s)`, 'green');
  }

  // 3. DVLA Vehicle Info
  log('\n🚗 Fetching dvla_vehicle_info_new...', 'blue');
  const { data: dvlaInfo, error: dvlaError } = await supabase
    .from('dvla_vehicle_info_new')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (dvlaError) {
    log(`⚠️  No DVLA data found: ${dvlaError.message}`, 'yellow');
  } else {
    data.dvlaInfo = dvlaInfo;
    log(`✅ Found ${dvlaInfo.length} DVLA record(s)`, 'green');
  }

  // 4. AI Transcription
  log('\n🎤 Fetching ai_transcription...', 'blue');
  const { data: transcription, error: transcriptionError } = await supabase
    .from('ai_transcription')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (transcriptionError) {
    log(`⚠️  No transcription data found: ${transcriptionError.message}`, 'yellow');
  } else {
    data.transcription = transcription;
    log(`✅ Found ${transcription.length} transcription(s)`, 'green');
  }

  // 5. AI Summary
  log('\n🤖 Fetching ai_summary...', 'blue');
  const { data: summary, error: summaryError } = await supabase
    .from('ai_summary')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (summaryError) {
    log(`⚠️  No AI summary found: ${summaryError.message}`, 'yellow');
  } else {
    data.summary = summary;
    log(`✅ Found ${summary.length} summary record(s)`, 'green');
  }

  // 6. User Documents
  log('\n📎 Fetching user_documents...', 'blue');
  const { data: documents, error: documentsError } = await supabase
    .from('user_documents')
    .select('*')
    .eq('create_user_id', userId)
    .order('created_at', { ascending: false });

  if (documentsError) {
    log(`⚠️  No documents found: ${documentsError.message}`, 'yellow');
  } else {
    data.documents = documents;
    log(`✅ Found ${documents.length} document(s)`, 'green');
  }

  return data;
}

/**
 * Analyze field population
 */
function analyzeFields(data) {
  logSection('🔍 FIELD POPULATION ANALYSIS');

  const stats = {
    total: 0,
    populated: 0,
    sections: {}
  };

  function analyzeSection(sectionName, record) {
    if (!record) {
      log(`\n${sectionName}: No data available`, 'dim');
      return;
    }

    log(`\n${sectionName}:`, 'cyan');
    const sectionStats = { total: 0, populated: 0 };

    Object.keys(record).forEach(key => {
      // Skip system fields
      if (['id', 'created_at', 'updated_at', 'create_user_id'].includes(key)) {
        return;
      }

      const value = record[key];
      const isPopulated = value !== null && value !== undefined && value !== '';
      
      logField(key, value, isPopulated);
      
      sectionStats.total++;
      stats.total++;
      
      if (isPopulated) {
        sectionStats.populated++;
        stats.populated++;
      }
    });

    const percentage = sectionStats.total > 0 
      ? ((sectionStats.populated / sectionStats.total) * 100).toFixed(1)
      : 0;
    
    log(`  └─ ${sectionStats.populated}/${sectionStats.total} fields (${percentage}%)`, 'yellow');
    stats.sections[sectionName] = sectionStats;
  }

  // Analyze each section
  if (data.userSignup) {
    analyzeSection('👤 User Signup', data.userSignup);
  }

  if (data.incidentReports && data.incidentReports.length > 0) {
    data.incidentReports.forEach((report, index) => {
      analyzeSection(`📋 Incident Report #${index + 1}`, report);
    });
  }

  if (data.dvlaInfo && data.dvlaInfo.length > 0) {
    data.dvlaInfo.forEach((vehicle, index) => {
      analyzeSection(`🚗 DVLA Vehicle #${index + 1}`, vehicle);
    });
  }

  if (data.transcription && data.transcription.length > 0) {
    analyzeSection('🎤 AI Transcription', data.transcription[0]);
  }

  if (data.summary && data.summary.length > 0) {
    analyzeSection('🤖 AI Summary', data.summary[0]);
  }

  return stats;
}

/**
 * Generate PDF form
 */
async function generatePDF(data, userId) {
  logSection('📄 PDF GENERATION');

  // Check if Adobe PDF Services credentials are available
  const hasAdobeCredentials = process.env.ADOBE_CLIENT_ID && 
                              process.env.ADOBE_CLIENT_SECRET && 
                              process.env.ADOBE_FORM_TEMPLATE_PATH;

  if (!hasAdobeCredentials) {
    log('⚠️  Adobe PDF Services credentials not configured', 'yellow');
    log('   PDF generation will use fallback method (pdf-lib)', 'dim');
    log('   To use Adobe PDF Services, add to .env:', 'dim');
    log('     ADOBE_CLIENT_ID=xxx', 'dim');
    log('     ADOBE_CLIENT_SECRET=xxx', 'dim');
    log('     ADOBE_FORM_TEMPLATE_PATH=xxx', 'dim');
    return null;
  }

  try {
    // Import PDF generation service
    const { generateFilledPDF } = await import('./src/services/pdf-form-filler.service.js');

    // Prepare data for PDF
    const pdfData = {
      ...data.userSignup,
      ...(data.incidentReports && data.incidentReports[0] ? data.incidentReports[0] : {}),
      ...(data.dvlaInfo && data.dvlaInfo[0] ? data.dvlaInfo[0] : {}),
    };

    log('\n🔄 Generating PDF with Adobe Form Filler Service...', 'blue');
    const outputDir = path.join(__dirname, 'test-output');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      log(`   Created output directory: ${outputDir}`, 'dim');
    }

    const outputPath = path.join(outputDir, `test-form-${userId}-${Date.now()}.pdf`);
    
    const result = await generateFilledPDF(pdfData, outputPath);

    if (result.success) {
      log('✅ PDF generated successfully!', 'green');
      log(`   File: ${result.filePath}`, 'cyan');
      
      // Get file size
      const stats = fs.statSync(result.filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      log(`   Size: ${fileSizeMB} MB`, 'dim');

      if (result.compressionRatio) {
        log(`   Compression: ${result.compressionRatio}`, 'dim');
      }

      return result;
    } else {
      log(`❌ PDF generation failed: ${result.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ PDF generation error: ${error.message}`, 'red');
    console.error(error);
    return null;
  }
}

/**
 * Display summary statistics
 */
function displaySummary(stats, pdfResult) {
  logSection('📊 SUMMARY');

  const percentage = stats.total > 0 
    ? ((stats.populated / stats.total) * 100).toFixed(1)
    : 0;

  log(`\nTotal Fields Analyzed: ${stats.total}`, 'white');
  log(`Populated Fields: ${stats.populated} (${percentage}%)`, 'green');
  log(`Empty Fields: ${stats.total - stats.populated} (${(100 - percentage).toFixed(1)}%)`, 'dim');

  if (pdfResult && pdfResult.success) {
    log(`\nPDF Generated: ${pdfResult.filePath}`, 'cyan');
  } else if (pdfResult === null) {
    log(`\nPDF Generation: Skipped (no Adobe credentials)`, 'yellow');
  } else {
    log(`\nPDF Generation: Failed`, 'red');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main execution
 */
async function main() {
  log('\n🧪 PDF GENERATION TEST SCRIPT', 'bright');
  log('Testing complete PDF generation pipeline with real user data\n', 'dim');

  // Get user ID from command line
  const userId = process.argv[2];

  if (!userId) {
    log('❌ Usage: node test-pdf-generation.js <user-id>', 'red');
    log('\nExample:', 'dim');
    log('  node test-pdf-generation.js nkwxh49sm2swwlzxtx1bnkwxhroukfn7', 'dim');
    log('\nRecent user IDs from logs:', 'dim');
    log('  - m6xghh4etc4xnokf4dbsgm6xghhutaio', 'dim');
    log('  - nkwxh49sm2swwlzxtx1bnkwxhroukfn7', 'dim');
    process.exit(1);
  }

  try {
    // Step 1: Fetch all user data
    const data = await fetchUserData(userId);

    // Step 2: Analyze field population
    const stats = analyzeFields(data);

    // Step 3: Generate PDF
    const pdfResult = await generatePDF(data, userId);

    // Step 4: Display summary
    displaySummary(stats, pdfResult);

    log('✅ Test completed successfully!', 'green');
    process.exit(0);

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();
