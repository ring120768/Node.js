// lib/aiSummaryGenerator.js
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// System prompt from your template
const LEGAL_NARRATIVE_SYSTEM_PROMPT = `You are a legal summarisation engine for UK road-traffic incidents. Produce a concise, strictly factual FIRST-PERSON narrative of the accident suitable for insurers and solicitors. Use ONLY the data provided in accident_data. Do NOT invent, infer, or speculate. Use UK spelling, plain legal English, and neutral tone (no blame or fault apportionment). Prefer past tense ("I was…", "I drove…", "the road was…").
- Treat checkbox-style values like "On/Off" or "Yes/No" as booleans. If value is "Off", treat as false; if "On" or "Yes", treat as true.
- Dates/times: reproduce exactly as provided (do not re-interpret time zones). If both date and time exist, put them together.
- If a MAJOR category is missing (e.g., time/location, accident description, injuries, other party, police, evidence), include a brief sentence like: "Assessed: no data provided / not applicable." Minor missing items may be omitted.
- Keep personally identifying contact details in-line only where they have clear legal/insurance relevance (e.g., other driver name, policy number). Avoid redundant repetition.
- Numbers and references (policy numbers, police ref, What3Words, reg plates) must be reproduced verbatim.
- Length target: {{target_length}}. If not provided, default ~350-500 words.
- End with an optional "Evidence collected" line if requested.
- Never include headings except the final optional evidence line. No bullet points in the narrative.

ORDER & COVERAGE (weave into a flowing narrative):
1) Who I am + my vehicle (name if given, license plate, make/model/colour/condition). Seatbelt/airbags if known.
2) When & where (date, time, exact location incl. What3Words if present). Weather, visibility, road type, speed limit, junction/traffic control, special conditions.
3) What happened (direction of travel, estimated speed if given, succinct step-by-step account). Avoid speculation.
4) Damage & mechanical state (to my vehicle; prior damage vs new damage). Recovery if applicable.
5) Injuries & medical state (only what is checked/declared). If medical attention was required or received, state who by.
6) Other vehicle/party (driver name, contact if present; vehicle make/model/plate; insurer/policy; observed damage).
7) Police & breath test (attendance, officer name/badge/force, reference number; test results if provided).
8) Witnesses (present/absent; contact kept on file if present).
9) Declaration/consent only if a clear declaration field is provided—otherwise omit.`;

/**
 * Prepare accident data for AI processing
 * Combines data from all relevant tables into a single object
 */
async function prepareAccidentData(create_user_id, incident_report_id) {
  try {
    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', create_user_id)
      .single();

    if (userError) throw userError;

    // Fetch incident data
    const { data: incidentData, error: incidentError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', incident_report_id)
      .single();

    if (incidentError) throw incidentError;

    // Fetch AI transcription if available
    const { data: transcriptionData } = await supabase
      .from('ai_transcription')
      .select('transcription_text')
      .eq('create_user_id', create_user_id)
      .eq('incident_report_id', incident_report_id)
      .single();

    // Combine all data into a single object matching PDF field names
    const accidentData = {
      // User information
      driver_name: userData.driver_name,
      driver_surname: userData.driver_surname,
      driver_email: userData.driver_email,
      driver_mobile: userData.driver_mobile,
      driver_street: userData.driver_street,
      driver_town: userData.driver_town,
      driver_postcode: userData.driver_postcode,
      driver_country: userData.driver_country,
      license_number: userData.license_number,

      // Vehicle information
      license_plate: userData.license_plate,
      vehicle_make: userData.vehicle_make,
      vehicle_model: userData.vehicle_model,
      vehicle_colour: userData.vehicle_colour,
      vehicle_condition: userData.vehicle_condition,

      // Insurance information
      insurance_company: userData.insurance_company,
      policy_number: userData.policy_number,
      policy_holder: userData.policy_holder,
      cover_type: userData.cover_type,

      // Incident details
      when_did_the_accident_happen: incidentData.when_did_the_accident_happen,
      what_time_did_the_accident_happen: incidentData.what_time_did_the_accident_happen,
      where_exactly_did_the_accident_happen: incidentData.where_exactly_did_the_accident_happen,

      // Safety equipment
      wearing_seatbelts: incidentData.wearing_seatbelts ? "On" : "Off",
      airbags_deployed: incidentData.airbags_deployed ? "On" : "Off",
      why_werent_seat_belts_being_worn: incidentData.why_werent_seat_belts_being_worn,

      // Road conditions
      road_type: incidentData.road_type,
      speed_limit: incidentData.speed_limit,
      junction_information: incidentData.junction_information,
      special_conditions: incidentData.special_conditions,

      // Weather conditions
      weather_overcast: incidentData.overcast_dull,
      weather_heavy_rain: incidentData.heavy_rain,
      weather_wet_road: incidentData.wet_road,
      weather_fog: incidentData.fog_poor_visibility,
      weather_street_lights: incidentData.street_lights,
      weather_dusk: incidentData.dusk,
      weather_clear_dry: incidentData.clear_and_dry,
      weather_snow_ice: incidentData.snow_ice_on_road,
      weather_light_rain: incidentData.light_rain,
      weather_bright_daylight: incidentData.bright_daylight,

      // Accident description
      describe_what_happened: incidentData.describe_what_happened,
      direction_of_travel_and_estimated_speed: incidentData.direction_of_travel_and_estimated_speed,
      impact_point: incidentData.impact_point,
      damage_caused_by_accident: incidentData.damage_caused_by_accident,
      damage_prior_to_accident: incidentData.damage_prior_to_accident,

      // Medical information
      medical_attention_required: incidentData.medical_attention_required ? "On" : "Off",
      medical_attention_from_who: incidentData.medical_attention_from_who,
      how_are_you_feeling: incidentData.how_are_you_feeling,

      // Other vehicle information
      other_driver_name: incidentData.other_driver_name,
      other_driver_number: incidentData.other_driver_number,
      other_driver_address: incidentData.other_driver_address,
      other_make_of_vehicle: incidentData.other_make_of_vehicle,
      other_model_of_vehicle: incidentData.other_model_of_vehicle,
      other_vehicle_license_plate: incidentData.other_vehicle_license_plate,
      other_insurance_company: incidentData.other_insurance_company,
      other_policy_number: incidentData.other_policy_number,
      other_policy_cover_type: incidentData.other_policy_cover_type,
      other_policy_holder: incidentData.other_policy_holder,

      // Police information
      did_the_police_attend_the_scene: incidentData.did_the_police_attend_the_scene ? "On" : "Off",
      accident_reference_number: incidentData.accident_reference_number,
      police_officer_name: incidentData.police_officer_name,
      police_officer_badge_number: incidentData.police_officer_badge_number,
      police_force_details: incidentData.police_force_details,
      breath_test: incidentData.breath_test ? "On" : "Off",
      other_breath_test: incidentData.other_breath_test ? "On" : "Off",

      // Witness information
      witness_present: incidentData.witness_present ? "On" : "Off",
      witness_information: incidentData.witness_information,

      // Evidence URLs
      file_url_what3words: incidentData.file_url_what3words,
      file_url_scene_overview: incidentData.file_url_scene_overview,
      file_url_scene_overview_1: incidentData.file_url_scene_overview_1,
      file_url_vehicle_damage: incidentData.file_url_vehicle_damage,
      file_url_vehicle_damage_1: incidentData.file_url_vehicle_damage_1,
      file_url_vehicle_damage_2: incidentData.file_url_vehicle_damage_2,
      file_url_other_vehicle: incidentData.file_url_other_vehicle,
      file_url_other_vehicle_1: incidentData.file_url_other_vehicle_1,
      file_url_documents: incidentData.file_url_documents,
      file_url_documents_1: incidentData.file_url_documents_1,

      // AI transcription if available
      ai_transcription: transcriptionData?.transcription_text || incidentData.detailed_account_of_what_happened,

      // Additional info
      anything_else_important: incidentData.anything_else_important
    };

    // Clean up undefined values
    Object.keys(accidentData).forEach(key => {
      if (accidentData[key] === undefined || accidentData[key] === null) {
        delete accidentData[key];
      }
    });

    return accidentData;

  } catch (error) {
    console.error('Error preparing accident data:', error);
    throw error;
  }
}

/**
 * Generate legal narrative using OpenAI
 */
async function generateLegalNarrative(accidentData, options = {}) {
  const {
    target_length = "350-500 words",
    include_evidence_section = true,
    include_missing_notes = true
  } = options;

  try {
    // Replace template variables in system prompt
    const systemPrompt = LEGAL_NARRATIVE_SYSTEM_PROMPT
      .replace('{{target_length}}', target_length);

    // Prepare user prompt
    const userPrompt = `Summarise the following incident data into a strictly factual, first-person narrative per the system rules above.

Parameters:
- target_length: "${target_length}"
- include_evidence_section: ${include_evidence_section}
- include_missing_notes: ${include_missing_notes}

accident_data (keys match the PDF field names exactly):
${JSON.stringify(accidentData, null, 2)}`;

    console.log('🤖 Generating legal narrative with OpenAI...');

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // or "gpt-4-0125-preview" for latest
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual output
      max_tokens: 1000,
    });

    const narrative = completion.choices[0].message.content;
    console.log('✅ Legal narrative generated successfully');

    return narrative;

  } catch (error) {
    console.error('Error generating legal narrative:', error);
    throw error;
  }
}

/**
 * Save legal narrative to database
 */
async function saveLegalNarrative(create_user_id, incident_report_id, narrative) {
  try {
    // Check if summary already exists
    const { data: existing } = await supabase
      .from('ai_summary')
      .select('id')
      .eq('create_user_id', create_user_id)
      .eq('incident_id', incident_report_id)
      .single();

    if (existing) {
      // Update existing summary
      const { error } = await supabase
        .from('ai_summary')
        .update({
          summary_text: narrative,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
      console.log('✅ Legal narrative updated in database');
    } else {
      // Create new summary
      const { error } = await supabase
        .from('ai_summary')
        .insert({
          create_user_id,
          incident_id: incident_report_id,
          summary_text: narrative,
          key_points: [], // Not used in PDF but kept for compatibility
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      console.log('✅ Legal narrative saved to database');
    }

    return true;

  } catch (error) {
    console.error('Error saving legal narrative:', error);
    throw error;
  }
}

/**
 * Main function to generate and save legal narrative
 */
async function generateAndSaveLegalNarrative(create_user_id, incident_report_id, options = {}) {
  try {
    console.log(`📝 Starting legal narrative generation for user: ${create_user_id}, incident: ${incident_report_id}`);

    // Step 1: Prepare data
    const accidentData = await prepareAccidentData(create_user_id, incident_report_id);

    // Step 2: Generate narrative
    const narrative = await generateLegalNarrative(accidentData, options);

    // Step 3: Save to database
    await saveLegalNarrative(create_user_id, incident_report_id, narrative);

    console.log('✅ Legal narrative process complete');
    return narrative;

  } catch (error) {
    console.error('❌ Error in legal narrative generation:', error);
    throw error;
  }
}

module.exports = {
  generateAndSaveLegalNarrative,
  generateLegalNarrative,
  prepareAccidentData
};