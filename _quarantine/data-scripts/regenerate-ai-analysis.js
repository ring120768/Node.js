#!/usr/bin/env node

/**
 * Regenerate AI Analysis - Trigger AI analysis regeneration for an incident
 * Use this after fixing the schema mismatch to see updated preview with form data
 *
 * Usage: node regenerate-ai-analysis.js [incident-id]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

async function regenerateAIAnalysis(incidentId) {
  console.log('🤖 Regenerating AI Analysis\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Fetch incident data
    console.log('📋 Fetching incident data...');
    const { data: incident, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (incidentError) {
      console.error('❌ Error fetching incident:', incidentError.message);
      process.exit(1);
    }

    if (!incident) {
      console.log('❌ No incident found with ID:', incidentId);
      process.exit(1);
    }

    console.log('✅ Incident found:', incident.id);
    console.log('   Created:', new Date(incident.created_at).toLocaleString('en-GB'));
    console.log('   User ID:', incident.create_user_id);
    console.log('');

    // Delete old AI analysis if it exists
    console.log('🗑️  Clearing old AI analysis...');
    const { error: deleteError } = await supabase
      .from('completed_incident_forms')
      .delete()
      .eq('incident_id', incidentId);

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.warn('⚠️  Warning: Could not delete old analysis:', deleteError.message);
    } else {
      console.log('✅ Old analysis cleared (if it existed)');
    }
    console.log('');

    // Trigger new AI analysis via API endpoint
    console.log('🔄 Triggering new AI analysis...');
    console.log('   Calling POST /api/ai/analyze-incident');
    console.log('');

    const response = await fetch(`http://localhost:5000/api/ai/analyze-incident`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `access_token=${process.env.TEST_USER_TOKEN || ''}`
      },
      body: JSON.stringify({
        incidentId: incidentId,
        userId: incident.create_user_id
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API call failed:', response.status, errorText);
      console.log('');
      console.log('💡 Alternative: You can manually trigger AI analysis from the dashboard');
      console.log('   Visit: http://localhost:5000/dashboard.html');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ AI analysis triggered successfully!');
    console.log('');

    // Wait a moment for processing
    console.log('⏳ Waiting for AI processing (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Check for new analysis
    console.log('🔍 Checking for new analysis...');
    const { data: newAnalysis, error: checkError } = await supabase
      .from('completed_incident_forms')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️  Warning: Could not fetch new analysis:', checkError.message);
      console.log('');
      console.log('   Analysis may still be processing. Check dashboard in a few moments.');
    } else if (newAnalysis) {
      console.log('✅ New analysis created:', newAnalysis.id);
      console.log('   Created:', new Date(newAnalysis.created_at).toLocaleString('en-GB'));
      console.log('   Has Summary:', !!newAnalysis.summary);
      console.log('   Has Closing Statement:', !!newAnalysis.closing_statement);
      console.log('   Closing Statement Length:', newAnalysis.closing_statement?.length || 0, 'chars');
      console.log('');

      // Check if form data is now included
      const hasWeather = newAnalysis.closing_statement?.toLowerCase().includes('weather') ||
                        newAnalysis.closing_statement?.toLowerCase().includes('sunlight') ||
                        newAnalysis.closing_statement?.toLowerCase().includes('bright');
      const hasRoad = newAnalysis.closing_statement?.toLowerCase().includes('road') ||
                     newAnalysis.closing_statement?.toLowerCase().includes('dry');
      const hasMedical = newAnalysis.closing_statement?.toLowerCase().includes('symptom') ||
                        newAnalysis.closing_statement?.toLowerCase().includes('medical');

      console.log('📊 Form Data Check in Closing Statement:');
      console.log('   Weather conditions mentioned:', hasWeather ? '✅' : '❌');
      console.log('   Road conditions mentioned:', hasRoad ? '✅' : '❌');
      console.log('   Medical information mentioned:', hasMedical ? '✅' : '❌');
      console.log('');

      if (hasWeather && hasRoad) {
        console.log('🎉 SUCCESS! Form data is now included in AI analysis!');
        console.log('');
        console.log('📱 View updated preview:');
        console.log('   http://localhost:5000/dashboard.html');
      } else {
        console.log('⚠️  Form data may not be fully included yet.');
        console.log('');
        console.log('   This could be because:');
        console.log('   1. AI analysis is still processing');
        console.log('   2. AI chose not to mention these details in this specific narrative');
        console.log('   3. Additional investigation needed');
        console.log('');
        console.log('📝 Check the full closing statement:');
        console.log(newAnalysis.closing_statement?.substring(0, 300) + '...');
      }
    } else {
      console.log('⏳ Analysis is still processing...');
      console.log('');
      console.log('   Check dashboard in a few moments:');
      console.log('   http://localhost:5000/dashboard.html');
    }
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Regeneration Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.log('');
    console.log('💡 Manual steps:');
    console.log('   1. Open dashboard: http://localhost:5000/dashboard.html');
    console.log('   2. Click "Regenerate AI Analysis" button (if available)');
    console.log('   3. Or manually delete completed_incident_forms record and resubmit form');
    process.exit(1);
  }
}

// Get incident ID from command line or use default
const incidentId = process.argv[2] || '3aead998-97f7-4626-9b59-47f58e1fe601';

regenerateAIAnalysis(incidentId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
