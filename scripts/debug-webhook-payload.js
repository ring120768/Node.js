#!/usr/bin/env node
/**
 * Debug Webhook Payload Analyzer
 *
 * Purpose: Analyzes saved webhook payloads from logs/webhooks/ to identify
 *          field extraction issues in Typeform → Supabase processing
 *
 * Usage:
 *   node scripts/debug-webhook-payload.js [payload-file.json]
 *   node scripts/debug-webhook-payload.js --latest
 *   node scripts/debug-webhook-payload.js --all
 *
 * What it does:
 *   1. Reads webhook payload from logs/webhooks/
 *   2. Builds titleMap from form definition
 *   3. Tests extraction for ALL fields (not just sample 10)
 *   4. Reports which fields match vs fail
 *   5. Identifies normalization issues in titleMap
 */

const fs = require('fs');
const path = require('path');

// Terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

/**
 * Build title map from form definition (same logic as webhook.controller.js)
 */
function buildFieldTitleMap(definition) {
  const titleMap = new Map();

  if (!definition || !definition.fields) {
    console.log(colors.red, '⚠️  No form definition found in payload');
    return titleMap;
  }

  definition.fields.forEach(field => {
    if (field.ref && field.title) {
      // Phase 3.5: Match production normalization logic exactly
      let normalizedTitle = field.title
        .toLowerCase()
        .replace(/\(optional\)/gi, '_optional')  // Handle (optional) first

        // Remove emojis and Unicode symbols (critical fix for Typeform!)
        .replace(/[\u{1F000}-\u{1F9FF}]/gu, '')  // Emoticons
        .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/[\u{2600}-\u{27BF}✅❌🛡️]/gu, '') // Checkmarks, X, shields

        .replace(/[:.;?!'"(),]/g, '')             // Remove common punctuation
        .replace(/-/g, '_')                       // Convert hyphens to underscores
        .replace(/\//g, '_')                      // Convert forward slashes to underscores
        .replace(/@/g, '')                        // Remove @ symbols
        .replace(/\s+/g, '_')                     // Replace spaces with underscore
        .replace(/_+/g, '_')                      // Replace multiple underscores with single
        .replace(/^_|_$/g, '')                    // Remove leading/trailing underscores
        .trim();

      // CRITICAL: Remove common prefixes from Typeform questions
      normalizedTitle = normalizedTitle
        .replace(/^title_+/, '')                  // Remove "title_" prefix
        .replace(/^question_+/, '')               // Remove "question_" prefix
        .replace(/^field_+/, '');                 // Remove "field_" prefix

      titleMap.set(field.ref, normalizedTitle);
    }
  });

  return titleMap;
}

/**
 * Extract answer value (same logic as webhook.controller.js)
 */
function extractAnswerValue(answer) {
  if (!answer) return null;

  const answerType = answer.type;

  switch (answerType) {
    case 'text':
    case 'email':
    case 'url':
    case 'phone_number':
      return answer.text || null;

    case 'choice':
      if (answer.choice?.label) return answer.choice.label;
      if (answer.choice?.other) return answer.choice.other;
      return null;

    case 'choices':
      if (answer.choices?.labels) {
        return answer.choices.labels.join(', ');
      }
      if (answer.choices?.other) return answer.choices.other;
      return null;

    case 'boolean':
      return answer.boolean || false;

    case 'number':
      return answer.number || null;

    case 'date':
      return answer.date || null;

    case 'file_url':
      return answer.file_url || null;

    default:
      return null;
  }
}

/**
 * Attempt to get answer by field reference (3-tier matching strategy)
 */
function getAnswerByRef(answers, ref, titleMap) {
  // STRATEGY 1: Try direct ref match first
  const directMatch = answers.find(a => a.field?.ref === ref);
  if (directMatch) {
    return {
      value: extractAnswerValue(directMatch),
      matchType: 'DIRECT',
      uuid: directMatch.field.ref
    };
  }

  // STRATEGY 2: Try exact titleMap match
  if (titleMap) {
    const titleMapMatch = answers.find(a => {
      const fieldRef = a.field?.ref;
      if (!fieldRef) return false;
      const normalizedTitle = titleMap.get(fieldRef);
      return normalizedTitle === ref;
    });

    if (titleMapMatch) {
      return {
        value: extractAnswerValue(titleMapMatch),
        matchType: 'TITLE',
        uuid: titleMapMatch.field.ref
      };
    }
  }

  // STRATEGY 3: Fuzzy/keyword matching - look for ref as substring in normalized title
  // This handles long Typeform questions like "🛡️ Quick safety check: Are you safe?"
  // which normalizes to "quick_safety_check_are_you_safe" and should match "are_you_safe"
  // Also matches "airbags_deployed" in "were_the_airbags_deployed"
  if (titleMap && ref.length >= 4) { // Only for meaningful field names
    const fuzzyMatch = answers.find(a => {
      const fieldRef = a.field?.ref;
      if (!fieldRef) return false;
      const normalizedTitle = titleMap.get(fieldRef);
      if (!normalizedTitle) return false;

      // Check if the expected field name appears anywhere in the normalized title
      // Use simple substring match (word boundaries were too strict)
      return normalizedTitle.includes(ref);
    });

    if (fuzzyMatch) {
      return {
        value: extractAnswerValue(fuzzyMatch),
        matchType: 'FUZZY',
        uuid: fuzzyMatch.field.ref,
        normalizedTitle: titleMap.get(fuzzyMatch.field.ref)
      };
    }
  }

  return {
    value: null,
    matchType: 'NONE',
    uuid: null
  };
}

/**
 * Get all expected field names from incident_reports table
 */
function getExpectedFields() {
  // This is the complete list of fields we try to extract in webhook.controller.js
  return [
    // Medical fields
    'medical_how_are_you_feeling',
    'medical_attention_from_who',
    'further_medical_attention',
    'are_you_safe',
    'medical_attention',
    'six_point_safety_check',
    'call_emergency_contact',
    'medical_chest_pain',
    'medical_breathlessness',
    'medical_abdominal_bruising',
    'medical_uncontrolled_bleeding',
    'medical_severe_headache',
    'medical_change_in_vision',
    'medical_abdominal_pain',
    'medical_limb_pain',
    'medical_limb_weakness',
    'medical_loss_of_consciousness',
    'medical_none_of_these',
    'medical_please_be_completely_honest',

    // Incident details
    'when_did_the_accident_happen',
    'what_time_did_the_accident_happen',
    'where_exactly_did_this_happen',
    'weather_conditions',
    'wearing_seatbelts',
    'airbags_deployed',
    'damage_to_your_vehicle',

    // Weather checkboxes
    'weather_overcast',
    'weather_street_lights',
    'weather_heavy_rain',
    'weather_wet_road',
    'weather_fog',
    'weather_snow_on_road',
    'weather_bright_daylight',
    'weather_light_rain',
    'weather_clear_and_dry',
    'weather_dusk',
    'weather_snow',

    // Road details
    'reason_no_seatbelts',
    'road_type',
    'speed_limit',
    'junction_information',
    'special_conditions_roadworks',
    'junction_information_roundabout',
    'special_conditions_defective_road',
    'special_conditions_oil_spills',
    'special_conditions_workman',
    'junction_information_t_junction',
    'junction_information_traffic_lights',
    'detailed_account_of_what_happened',
    'special_conditions',
    'junction_information_crossroads',
    'special_conditions_animals',

    // Vehicle details
    'make_of_car',
    'model_of_car',
    'license_plate_number',
    'direction_and_speed',
    'impact',
    'damage_caused_by_accident',
    'any_damage_prior',

    // Other driver
    'other_drivers_name',
    'other_drivers_number',
    'other_drivers_address',
    'other_make_of_vehicle',
    'other_model_of_vehicle',
    'vehicle_license_plate',
    'other_policy_number',
    'other_insurance_company',
    'other_policy_cover',
    'other_policy_holder',
    'other_damage_accident',
    'other_damage_prior',

    // Police/witnesses
    'accident_reference_number',
    'police_officer_badge_number',
    'police_officers_name',
    'police_force_details',
    'did_police_attend',
    'breath_test',
    'other_breath_test',
    'anything_else',
    'witness_contact_information',
    'any_witness',

    // Other
    'call_recovery',
    'upgrade_to_premium',

    // File uploads
    'file_url_documents',
    'file_url_documents_1',
    'file_url_record_detailed_account_of_what_happened',
    'file_url_what3words',
    'file_url_scene_overview',
    'file_url_scene_overview_1',
    'file_url_other_vehicle',
    'file_url_other_vehicle_1',
    'file_url_vehicle_damage',
    'file_url_vehicle_damage_1',
    'file_url_vehicle_damage_2'
  ];
}

/**
 * Analyze webhook payload for field extraction issues
 */
function analyzePayload(payloadPath) {
  console.log(colors.cyan, `\n🔍 WEBHOOK PAYLOAD ANALYZER`);
  console.log('='.repeat(80));
  console.log(colors.reset);

  // Read payload file
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

  // Handle both payload structures:
  // 1. Wrapped: payload.form_response.answers (from webhook body)
  // 2. Direct: payload.answers (from saveWebhookPayload)
  const answers = payload.form_response?.answers || payload.answers || [];
  const definition = payload.form_response?.definition || payload.definition || {};

  console.log(`📄 Payload file: ${path.basename(payloadPath)}`);
  console.log(`📋 Answers received: ${answers.length}`);
  console.log(`📋 Definition fields: ${definition.fields?.length || 0}`);
  console.log('');

  // Build title map
  const titleMap = buildFieldTitleMap(definition);
  console.log(colors.yellow, `\n📊 TITLE MAP ANALYSIS`);
  console.log('-'.repeat(80));
  console.log(colors.reset);
  console.log(`Total mappings: ${titleMap.size}`);
  console.log('');

  // Show first 20 mappings
  console.log('Sample mappings (first 20):');
  Array.from(titleMap.entries()).slice(0, 20).forEach(([uuid, normalizedTitle], index) => {
    console.log(`  ${index + 1}. ${uuid.substring(0, 12)}... → "${normalizedTitle}"`);
  });

  if (titleMap.size > 20) {
    console.log(`  ... and ${titleMap.size - 20} more`);
  }

  // Test extraction for all expected fields
  const expectedFields = getExpectedFields();
  console.log(colors.yellow, `\n📊 FIELD EXTRACTION TEST (All ${expectedFields.length} fields)`);
  console.log('-'.repeat(80));
  console.log(colors.reset);

  const results = {
    directMatch: [],
    titleMatch: [],
    noMatch: []
  };

  expectedFields.forEach(fieldName => {
    const result = getAnswerByRef(answers, fieldName, titleMap);

    if (result.matchType === 'DIRECT') {
      results.directMatch.push({ fieldName, ...result });
    } else if (result.matchType === 'TITLE') {
      results.titleMatch.push({ fieldName, ...result });
    } else {
      results.noMatch.push({ fieldName, ...result });
    }
  });

  // Summary
  console.log(colors.green, `✅ DIRECT matches: ${results.directMatch.length}`);
  console.log(colors.cyan, `✅ TITLE matches: ${results.titleMatch.length}`);
  console.log(colors.red, `❌ NO matches: ${results.noMatch.length}`);
  console.log(colors.reset, '');

  // Show direct matches (these work perfectly)
  if (results.directMatch.length > 0) {
    console.log(colors.green, '\n✅ DIRECT MATCHES (Field ref matched exactly):');
    console.log('-'.repeat(80));
    console.log(colors.reset);
    results.directMatch.slice(0, 10).forEach(({ fieldName, uuid, value }, index) => {
      const displayValue = value !== null && value !== undefined
        ? JSON.stringify(value).substring(0, 40)
        : 'null';
      console.log(`  ${index + 1}. ${fieldName}`);
      console.log(`     UUID: ${uuid.substring(0, 12)}...`);
      console.log(`     Value: ${displayValue}`);
    });
    if (results.directMatch.length > 10) {
      console.log(`  ... and ${results.directMatch.length - 10} more direct matches`);
    }
  }

  // Show title matches (working via normalization)
  if (results.titleMatch.length > 0) {
    console.log(colors.cyan, '\n✅ TITLE MATCHES (Normalized title matched):');
    console.log('-'.repeat(80));
    console.log(colors.reset);
    results.titleMatch.slice(0, 10).forEach(({ fieldName, uuid, value }, index) => {
      const displayValue = value !== null && value !== undefined
        ? JSON.stringify(value).substring(0, 40)
        : 'null';
      const normalizedTitle = titleMap.get(uuid);
      console.log(`  ${index + 1}. ${fieldName}`);
      console.log(`     UUID: ${uuid.substring(0, 12)}...`);
      console.log(`     Normalized: "${normalizedTitle}"`);
      console.log(`     Value: ${displayValue}`);
    });
    if (results.titleMatch.length > 10) {
      console.log(`  ... and ${results.titleMatch.length - 10} more title matches`);
    }
  }

  // Show no matches (THE PROBLEM!)
  if (results.noMatch.length > 0) {
    console.log(colors.red, `\n❌ NO MATCHES (These fields FAILED to extract):`);
    console.log('-'.repeat(80));
    console.log(colors.reset);
    results.noMatch.forEach(({ fieldName }, index) => {
      console.log(`  ${index + 1}. ${fieldName}`);
    });

    // Try to suggest possible matches
    console.log(colors.yellow, '\n💡 POSSIBLE MATCHES (Finding similar titles in titleMap):');
    console.log('-'.repeat(80));
    console.log(colors.reset);

    results.noMatch.slice(0, 10).forEach(({ fieldName }) => {
      const similarTitles = Array.from(titleMap.entries())
        .filter(([uuid, normalizedTitle]) => {
          // Check for partial matches
          return normalizedTitle.includes(fieldName.replace(/_/g, ' ').toLowerCase()) ||
                 fieldName.replace(/_/g, ' ').toLowerCase().includes(normalizedTitle);
        });

      if (similarTitles.length > 0) {
        console.log(`  Looking for: "${fieldName}"`);
        similarTitles.forEach(([uuid, normalizedTitle]) => {
          console.log(`    → Possible: "${normalizedTitle}" (${uuid.substring(0, 12)}...)`);
        });
      }
    });
  }

  // Final summary
  console.log(colors.bright, '\n📊 EXTRACTION SUMMARY:');
  console.log('-'.repeat(80));
  console.log(colors.reset);
  console.log(`Total expected fields: ${expectedFields.length}`);
  console.log(`Successfully extracted: ${results.directMatch.length + results.titleMatch.length}`);
  console.log(`Failed to extract: ${results.noMatch.length}`);
  console.log(`Extraction success rate: ${Math.round((results.directMatch.length + results.titleMatch.length) / expectedFields.length * 100)}%`);
  console.log('');
}

/**
 * Find latest webhook payload file
 */
function findLatestPayload() {
  const logsDir = path.join(__dirname, '../logs/webhooks');

  if (!fs.existsSync(logsDir)) {
    console.log(colors.red, '❌ No logs/webhooks/ directory found');
    console.log(colors.reset, 'Run a test webhook submission first to generate payloads');
    process.exit(1);
  }

  const files = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('incident_report_') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(logsDir, f),
      mtime: fs.statSync(path.join(logsDir, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log(colors.red, '❌ No incident_report webhook payloads found');
    console.log(colors.reset, 'Run a test webhook submission first');
    process.exit(1);
  }

  return files[0].path;
}

/**
 * Find all webhook payload files
 */
function findAllPayloads() {
  const logsDir = path.join(__dirname, '../logs/webhooks');

  if (!fs.existsSync(logsDir)) {
    console.log(colors.red, '❌ No logs/webhooks/ directory found');
    process.exit(1);
  }

  return fs.readdirSync(logsDir)
    .filter(f => f.startsWith('incident_report_') && f.endsWith('.json'))
    .map(f => path.join(logsDir, f));
}

// Main
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--latest') {
  const latestPayload = findLatestPayload();
  console.log(colors.cyan, `📄 Analyzing latest payload: ${path.basename(latestPayload)}`);
  console.log(colors.reset);
  analyzePayload(latestPayload);
} else if (args[0] === '--all') {
  const allPayloads = findAllPayloads();
  console.log(colors.cyan, `📄 Found ${allPayloads.length} payloads to analyze`);
  console.log(colors.reset);

  allPayloads.forEach((payloadPath, index) => {
    console.log(colors.bright, `\n${'='.repeat(80)}`);
    console.log(colors.cyan, `PAYLOAD ${index + 1} of ${allPayloads.length}`);
    console.log(colors.bright, '='.repeat(80));
    console.log(colors.reset);
    analyzePayload(payloadPath);
  });
} else {
  const payloadPath = path.resolve(args[0]);
  if (!fs.existsSync(payloadPath)) {
    console.log(colors.red, `❌ File not found: ${payloadPath}`);
    process.exit(1);
  }
  analyzePayload(payloadPath);
}
