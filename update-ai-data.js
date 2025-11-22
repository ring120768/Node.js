require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateAIData() {
  const userId = '5326c2aa-f1d5-4edc-a972-7fb14995ed0f';

  console.log('Updating AI analysis data with realistic content...\n');

  const updatedData = {
    voice_transcription: `I was driving north on the A40 Western Avenue approaching the Hanger Lane junction when the accident occurred. It was around 2:30 PM on Monday, 18th November 2025. The weather was clear but the roads were slightly wet from earlier rain. I was in the middle lane doing about 40 mph when suddenly a silver Ford Focus in the right lane swerved into my lane without indicating. I braked hard and sounded my horn, but the driver didn't seem to notice and continued moving left, striking the front right corner of my vehicle with their rear left panel. The impact caused my car to veer slightly but I managed to maintain control. We both pulled over to the hard shoulder near the junction. The other driver admitted they hadn't checked their blind spot properly.`,
    
    analysis_metadata: {
      model: "gpt-4o",
      version: "1.0",
      timestamp: new Date().toISOString(),
      confidence: 0.95,
      analysis_duration_ms: 2341
    },
    
    quality_review: `STRENGTHS:
• Excellent chronological narrative with precise timeline
• Specific location details (A40 Western Avenue, Hanger Lane junction)
• Clear description of weather and road conditions
• Detailed account of the collision mechanics
• Other driver's admission documented
• Professional and objective tone throughout

AREAS FOR IMPROVEMENT:
• Could include speed limit of the road for context
• Witness information would strengthen the case
• Photographs of road markings would be beneficial
• Note any CCTV cameras in the vicinity

OVERALL ASSESSMENT:
This is a well-documented incident report with strong factual basis. The account is credible, detailed and consistent. The other driver's admission of fault significantly strengthens your position.`,

    ai_summary: `INCIDENT OVERVIEW:
Road traffic collision on the A40 Western Avenue near Hanger Lane junction, London, on Monday 18th November 2025 at approximately 14:30. Two vehicles involved: claimant's vehicle (traveling north, middle lane) and third party's silver Ford Focus (right lane).

KEY POINTS:
• Clear dry weather, roads slightly wet from previous rain
• Claimant maintaining appropriate speed (~40 mph)
• Third party changed lanes without indicating
• Third party failed to check blind spot (admitted at scene)
• Impact: Third party's rear left panel struck claimant's front right corner
• No injuries reported at scene
• Both vehicles safely pulled to hard shoulder
• Other driver accepted responsibility verbally

LIABILITY ASSESSMENT:
Strong case for third party liability. The lane change violation, failure to indicate, and admission of not checking blind spot clearly establish fault. Claimant's defensive actions (braking, horn warning) demonstrate reasonable care.

SUPPORTING EVIDENCE:
• Photographic evidence of vehicle damage
• Damage pattern consistent with described collision
• Location details precisely documented
• Weather conditions recorded
• Timeline clearly established`,

    closing_statement: `Based on the comprehensive evidence provided in this incident report, there is a clear and unequivocal case for third party liability. The collision occurred as a direct result of the other driver's negligent lane change manoeuvre, compounded by their failure to indicate and check their blind spot - actions they themselves admitted at the scene.

Your account demonstrates careful attention to road safety: maintaining an appropriate speed, remaining alert to surrounding traffic, and taking defensive action when the danger became apparent. The evasive braking and horn warning show you did everything reasonably possible to avoid the collision.

The physical damage to both vehicles (your front right corner, their rear left panel) is entirely consistent with your description of events, providing objective corroboration of your account. Combined with the other driver's admission of fault, this creates a compelling evidence base for your claim.

I recommend proceeding with a full claim against the third party's insurance. The evidence strongly supports a finding of 100% liability against the other driver, and you should be entitled to full recovery of vehicle repair costs, any associated expenses, and compensation for inconvenience.`,

    final_review: `NEXT STEPS AND RECOMMENDATIONS:

1. IMMEDIATE ACTIONS REQUIRED:
   • Obtain three independent repair estimates for your vehicle
   • Keep all receipts for any expenses incurred (hire car, taxi fares, etc.)
   • Do NOT accept any early settlement offers without legal advice
   • Ensure you have copies of all photographic evidence
   • Note down any witnesses you may have forgotten to mention

2. MEDICAL CONSIDERATIONS:
   • Monitor for any delayed injury symptoms (whiplash can manifest 24-48 hours later)
   • If symptoms develop, seek immediate medical attention
   • Keep detailed records of any medical consultations or treatments
   • Photograph any visible injuries

3. INSURANCE CLAIM PROCESS:
   • Report the incident to your insurance company within 24 hours
   • Provide them with this completed incident report
   • Request confirmation that they will pursue the third party's insurer
   • Keep a diary of all communications with insurance companies
   • Note reference numbers and names of all representatives you speak with

4. LEGAL POSITION:
   • You have a strong case with multiple supporting factors
   • The other driver's admission significantly strengthens your position
   • Expect the third party's insurance to accept liability
   • If liability is disputed, this report provides solid foundation for legal action

5. DOCUMENTATION TO PRESERVE:
   • All photographs taken at the scene
   • Any dashcam footage if available
   • Repair estimates and invoices
   • Hire car agreements and receipts
   • Medical reports if applicable
   • Correspondence with insurance companies

6. POTENTIAL COMPENSATION:
   • Full vehicle repair costs or pre-accident value if written off
   • Hire car expenses during repair period
   • Loss of use if not hiring replacement vehicle
   • Out-of-pocket expenses (recovery fees, excess paid, etc.)
   • Personal injury compensation if injuries sustained
   • Distress and inconvenience (minor amount)

FINAL ASSESSMENT:
This is a straightforward liability case with excellent prospects for full recovery. The other driver's admission, combined with the physical evidence and your detailed account, creates an overwhelming case for their insurance company to accept fault. Proceed with confidence, but ensure all steps above are followed to maximise your claim value.

IMPORTANT: Keep this report and all supporting documents in a safe place. They form the foundation of your claim and may be needed for several months during the claims process.`
  };

  const { data, error } = await supabase
    .from('incident_reports')
    .update(updatedData)
    .eq('create_user_id', userId)
    .select();

  if (error) {
    console.error('❌ Error updating data:', error);
    return;
  }

  console.log('✅ AI analysis data updated successfully!\n');
  console.log('Updated fields:');
  console.log('  • voice_transcription:', updatedData.voice_transcription.length, 'chars');
  console.log('  • analysis_metadata: ', JSON.stringify(updatedData.analysis_metadata));
  console.log('  • quality_review:', updatedData.quality_review.length, 'chars');
  console.log('  • ai_summary:', updatedData.ai_summary.length, 'chars');
  console.log('  • closing_statement:', updatedData.closing_statement.length, 'chars');
  console.log('  • final_review:', updatedData.final_review.length, 'chars');
  console.log('\n✅ Database updated. Now regenerate the PDF to see the changes.');
}

updateAIData().catch(console.error);
