#!/usr/bin/env node
/**
 * Create minimal test data for PDF generation testing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const userId = uuidv4();
  console.log('Creating test data with user ID:', userId);

  // 1. Create user_signup (minimal required fields only)
  const { error: userError } = await supabase.from('user_signup').insert({
    create_user_id: userId,
    email: 'test@example.com'
  });

  if (userError) {
    console.error('Failed to create user:', userError.message);
    process.exit(1);
  }
  console.log('✅ Created user_signup');

  // 2. Create incident_report with AI data
  const { error: incidentError } = await supabase.from('incident_reports').insert({
    create_user_id: userId,
    user_id: userId,

    // Basic incident info
    incident_date: '2025-12-20',
    incident_time: '08:30',
    incident_location: 'London Road, Watford',
    weather_conditions: 'Rainy',
    road_conditions: 'Wet',

    // AI fields - this is what we're testing!
    voice_transcription: `This morning, about half seven, I was approaching the roundabout at the junction of London Road and Station Road in Watford. It was pouring with rain, visibility wasn't great. I was indicating right to take the third exit. As I entered the roundabout, a white van came flying round from my left, clearly not slowing down. He hit my front passenger side. I slammed on my brakes but couldn't avoid him. The impact pushed my car sideways. The other driver got out and immediately started apologising, saying he didn't see me.`,

    analysis_metadata: JSON.stringify({
      model: 'gpt-4o',
      timestamp: new Date().toISOString(),
      confidence: 0.95
    }),

    quality_review: 'Comprehensive account with good detail about weather conditions, location, and sequence of events. Clear description of the other party\'s admission of fault.',

    closing_statement: `<h3>Summary of Events</h3>
<p>On 20th December 2025 at approximately 08:30, I was involved in a road traffic collision at the roundabout junction of London Road and Station Road in Watford.</p>
<p>Weather conditions were poor with heavy rain reducing visibility. I was proceeding correctly through the roundabout when a white van failed to yield and collided with my vehicle.</p>
<h3>Key Points</h3>
<ul>
<li>I was correctly indicating and following roundabout rules</li>
<li>The other driver admitted fault at the scene</li>
<li>Weather conditions contributed to reduced visibility</li>
<li>Impact was to the front passenger side of my vehicle</li>
</ul>`,

    ai_summary: `Road traffic collision occurred on 20/12/2025 at 08:30 at London Road/Station Road roundabout, Watford. Claimant was navigating roundabout correctly when struck by white van that failed to yield. Other driver admitted fault at scene. Weather was rainy with wet roads. Damage to claimant's front passenger side. Strong liability case with witness admission.`,

    final_review: `<h3>Case Assessment</h3>
<p><strong>Liability:</strong> Strong - other party admitted fault at scene</p>
<p><strong>Evidence Quality:</strong> Good - clear narrative with specific details</p>
<h3>Recommended Next Steps</h3>
<ol>
<li>Obtain police report if one was filed</li>
<li>Gather any witness contact details</li>
<li>Document all medical treatment</li>
<li>Keep records of all expenses</li>
</ol>
<h3>Notes</h3>
<p>The admission of fault by the other driver significantly strengthens this claim. Weather conditions may be cited by the defence but the claimant's account shows they were driving appropriately for conditions.</p>`
  });

  if (incidentError) {
    console.error('Failed to create incident:', incidentError.message);
    process.exit(1);
  }
  console.log('✅ Created incident_reports with AI data');

  console.log('\n🎉 Test data created successfully!');
  console.log('User ID:', userId);
  console.log('\nNow run: node test-railway-pdf.js');
}

main().catch(console.error);
