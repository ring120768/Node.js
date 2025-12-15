#!/usr/bin/env node

/**
 * Test GET /api/ai/analysis/:incidentId endpoint
 */

const axios = require('axios');

const INCIDENT_ID = '271dec9c-e4de-4982-9f02-f79c803b35f8'; // Latest incident with analysis
const API_URL = 'http://localhost:5000';

async function testGetAnalysis() {
  console.log('🧪 Testing GET /api/ai/analysis/:incidentId\n');
  console.log(`Incident ID: ${INCIDENT_ID}\n`);

  try {
    const response = await axios.get(`${API_URL}/api/ai/analysis/${INCIDENT_ID}`);
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response received successfully\n');
    
    const { success, analysis, message } = response.data;
    
    console.log('Response Data:');
    console.log(`  success: ${success}`);
    console.log(`  message: ${message || 'none'}`);
    console.log(`  analysis: ${analysis ? 'present' : 'null'}\n`);
    
    if (analysis) {
      console.log('Analysis Structure:');
      console.log(`  summary: ${analysis.summary ? analysis.summary.length + ' chars' : 'missing'}`);
      console.log(`  keyPoints: ${Array.isArray(analysis.keyPoints) ? analysis.keyPoints.length + ' items' : 'missing'}`);
      console.log(`  review: ${analysis.review ? 'present' : 'missing'}`);
      console.log(`  combinedReport: ${analysis.combinedReport ? analysis.combinedReport.length + ' chars' : 'missing'}`);
      console.log(`  finalReview: ${analysis.finalReview ? 'present' : 'missing'}\n`);
      
      if (analysis.summary) {
        console.log(`Summary preview: ${analysis.summary.substring(0, 150)}...\n`);
      }
      
      if (analysis.keyPoints && analysis.keyPoints.length > 0) {
        console.log('Key Points:');
        analysis.keyPoints.slice(0, 3).forEach((point, i) => {
          console.log(`  ${i + 1}. ${point}`);
        });
        console.log('');
      }
    } else {
      console.log('⚠️  Analysis is null - this should not happen for this incident!');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ HTTP Error:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

testGetAnalysis()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
