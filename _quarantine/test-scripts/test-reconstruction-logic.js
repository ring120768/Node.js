#!/usr/bin/env node

/**
 * Test reconstructAnalysisObject() logic with real database data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Copy the reconstruction functions from ai.controller.js
function reconstructAnalysisObject(data) {
  const analysis = {};

  // Extract summary and key points from ai_summary
  if (data.ai_summary) {
    const summaryParts = data.ai_summary.split('\n\nKey Points:\n');
    analysis.summary = summaryParts[0] || '';

    if (summaryParts.length > 1) {
      // Parse key points from bullet list
      analysis.keyPoints = summaryParts[1]
        .split('\n')
        .filter(line => line.trim().startsWith('•'))
        .map(line => line.replace(/^•\s*/, '').trim());
    } else {
      analysis.keyPoints = [];
    }
  }

  // Reconstruct review object from quality_review
  if (data.quality_review) {
    analysis.review = {
      quality: data.quality_review,
      missingInfo: [],
      suggestions: []
    };
  }

  // Add combined report (Page 14 narrative)
  if (data.closing_statement) {
    analysis.combinedReport = data.closing_statement;
  }

  // Reconstruct final review from final_review text
  if (data.final_review) {
    analysis.finalReview = parseFinalReview(data.final_review);
  }

  return analysis;
}

function parseFinalReview(finalReviewText) {
  const finalReview = {};

  // Extract strengths section
  const strengthsMatch = finalReviewText.match(/Strengths:\n([\s\S]*?)\n\nNext Steps:/);
  if (strengthsMatch) {
    finalReview.strengths = strengthsMatch[1].trim();
  }

  // Extract next steps
  const nextStepsMatch = finalReviewText.match(/Next Steps:\n([\s\S]*?)\n\nLegal Considerations:/);
  if (nextStepsMatch) {
    finalReview.nextSteps = nextStepsMatch[1]
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }

  // Extract legal considerations
  const legalMatch = finalReviewText.match(/Legal Considerations:\n([\s\S]*?)$/);
  if (legalMatch) {
    finalReview.legalConsiderations = legalMatch[1].trim();
  }

  return finalReview;
}

async function testReconstruction() {
  console.log('🧪 Testing Analysis Reconstruction Logic\n');

  // Get latest incident with analysis
  const { data: record, error } = await supabase
    .from('incident_reports')
    .select('id, ai_summary, quality_review, closing_statement, final_review')
    .not('ai_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !record) {
    console.error('❌ Failed to fetch test data:', error?.message);
    process.exit(1);
  }

  console.log('📊 Database Record:');
  console.log(`  Incident ID: ${record.id}`);
  console.log(`  ai_summary: ${record.ai_summary ? record.ai_summary.substring(0, 100) + '...' : 'null'}`);
  console.log(`  quality_review: ${record.quality_review ? record.quality_review.substring(0, 100) + '...' : 'null'}`);
  console.log(`  closing_statement: ${record.closing_statement ? record.closing_statement.substring(0, 100) + '...' : 'null'}`);
  console.log(`  final_review: ${record.final_review ? record.final_review.substring(0, 100) + '...' : 'null'}\n`);

  // Test reconstruction
  console.log('🔄 Running Reconstruction...\n');
  const analysis = reconstructAnalysisObject(record);

  console.log('📋 Reconstructed Analysis:');
  console.log(`  summary: ${analysis.summary ? 'present (' + analysis.summary.length + ' chars)' : '❌ MISSING'}`);
  console.log(`  keyPoints: ${analysis.keyPoints ? analysis.keyPoints.length + ' items' : '❌ MISSING'}`);
  console.log(`  review: ${analysis.review ? 'present' : '❌ MISSING'}`);
  console.log(`  combinedReport: ${analysis.combinedReport ? 'present (' + analysis.combinedReport.length + ' chars)' : '❌ MISSING'}`);
  console.log(`  finalReview: ${analysis.finalReview ? 'present' : '❌ MISSING'}\n`);

  if (analysis.summary) {
    console.log(`Summary Preview:\n  ${analysis.summary.substring(0, 200)}...\n`);
  }

  if (analysis.keyPoints && analysis.keyPoints.length > 0) {
    console.log('Key Points:');
    analysis.keyPoints.slice(0, 3).forEach((point, i) => {
      console.log(`  ${i + 1}. ${point}`);
    });
    console.log('');
  } else {
    console.log('⚠️  No key points extracted from ai_summary');
    console.log('ai_summary content:');
    console.log(record.ai_summary.substring(0, 300));
    console.log('');
  }

  if (analysis.finalReview) {
    console.log('Final Review:');
    console.log(`  strengths: ${analysis.finalReview.strengths ? 'present' : 'missing'}`);
    console.log(`  nextSteps: ${analysis.finalReview.nextSteps ? analysis.finalReview.nextSteps.length + ' items' : 'missing'}`);
    console.log(`  legalConsiderations: ${analysis.finalReview.legalConsiderations ? 'present' : 'missing'}\n`);
  }

  // Check if reconstruction is valid
  const isValid = analysis.summary && analysis.keyPoints && analysis.review && analysis.combinedReport && analysis.finalReview;
  
  if (isValid) {
    console.log('✅ Reconstruction successful - all fields present');
  } else {
    console.log('❌ Reconstruction failed - some fields missing');
    process.exit(1);
  }
}

testReconstruction()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
