#!/usr/bin/env node
/**
 * Field Extraction Test Tool
 *
 * Purpose: Tests the buildFieldTitleMap() normalization logic to identify
 *          why certain field names don't match Typeform question titles
 *
 * Usage:
 *   node scripts/test-field-extraction.js
 *
 * What it does:
 *   1. Shows example normalization transformations
 *   2. Tests common edge cases (punctuation, special chars, etc.)
 *   3. Suggests improvements to normalization logic
 *   4. Can be used without saved webhook payloads
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

/**
 * Current normalization logic (from webhook.controller.js)
 * Updated with Phase 3 fixes
 */
function normalizeTitle(title) {
  let normalized = title
    .toLowerCase()
    .replace(/\(optional\)/gi, '_optional')  // Handle (optional) first

    // Remove emojis and Unicode symbols (Phase 3.5 fix!)
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
  normalized = normalized
    .replace(/^title_+/, '')                  // Remove "title_" prefix
    .replace(/^question_+/, '')               // Remove "question_" prefix
    .replace(/^field_+/, '');                 // Remove "field_" prefix

  return normalized;
}

/**
 * Test cases with expected vs actual results
 */
const testCases = [
  // Medical fields
  {
    typeformTitle: 'How are you feeling?',
    expectedField: 'medical_how_are_you_feeling',
    category: 'Medical'
  },
  {
    typeformTitle: 'Are you safe?',
    expectedField: 'are_you_safe',
    category: 'Safety'
  },
  {
    typeformTitle: 'When did the accident happen?',
    expectedField: 'when_did_the_accident_happen',
    category: 'Incident Details'
  },
  {
    typeformTitle: 'What time did the accident happen?',
    expectedField: 'what_time_did_the_accident_happen',
    category: 'Incident Details'
  },
  {
    typeformTitle: 'Where exactly did this happen?',
    expectedField: 'where_exactly_did_this_happen',
    category: 'Location'
  },

  // Weather conditions
  {
    typeformTitle: 'Weather conditions',
    expectedField: 'weather_conditions',
    category: 'Weather'
  },
  {
    typeformTitle: 'Overcast',
    expectedField: 'weather_overcast',
    category: 'Weather'
  },
  {
    typeformTitle: 'Heavy rain',
    expectedField: 'weather_heavy_rain',
    category: 'Weather'
  },

  // Vehicle details
  {
    typeformTitle: 'Make of car',
    expectedField: 'make_of_car',
    category: 'Vehicle'
  },
  {
    typeformTitle: 'License plate number',
    expectedField: 'license_plate_number',
    category: 'Vehicle'
  },

  // Police details
  {
    typeformTitle: "Police officer's name",
    expectedField: 'police_officers_name',
    category: 'Police'
  },
  {
    typeformTitle: 'Police force details',
    expectedField: 'police_force_details',
    category: 'Police'
  },

  // Edge cases with special characters
  {
    typeformTitle: 'Did police attend?',
    expectedField: 'did_police_attend',
    category: 'Police'
  },
  {
    typeformTitle: 'Call emergency contact?',
    expectedField: 'call_emergency_contact',
    category: 'Emergency'
  },

  // Hyphenated words
  {
    typeformTitle: 'T-junction',
    expectedField: 'junction_information_t_junction',
    category: 'Road'
  },

  // Multiple spaces
  {
    typeformTitle: 'Detailed  account  of  what  happened',
    expectedField: 'detailed_account_of_what_happened',
    category: 'Incident'
  },

  // Emoji test cases (Phase 3.5)
  {
    typeformTitle: '🛡️ Quick safety check: Are you safe?',
    expectedField: 'are_you_safe',
    category: 'Safety'
  },
  {
    typeformTitle: 'Title: Weather conditions ✅',
    expectedField: 'weather_conditions',
    category: 'Weather'
  },
  {
    typeformTitle: '📋 License plate number',
    expectedField: 'license_plate_number',
    category: 'Vehicle'
  },
  {
    typeformTitle: 'Title - Medical attention ❌',
    expectedField: 'medical_attention',
    category: 'Medical'
  }
];

/**
 * Test normalization logic
 */
function testNormalization() {
  console.log(colors.cyan, '\n🧪 FIELD NORMALIZATION TEST\n');
  console.log('='.repeat(80));
  console.log(colors.reset);

  const results = {
    pass: [],
    fail: [],
    partial: []
  };

  testCases.forEach(({ typeformTitle, expectedField, category }) => {
    const normalized = normalizeTitle(typeformTitle);
    const expectedBase = expectedField.replace(/^(medical_|weather_|junction_information_|special_conditions_|file_url_|other_)/g, '');

    let status = 'fail';
    if (normalized === expectedField) {
      status = 'pass';
    } else if (normalized === expectedBase) {
      status = 'partial';
    }

    const result = {
      typeformTitle,
      expectedField,
      normalized,
      category,
      status
    };

    if (status === 'pass') {
      results.pass.push(result);
    } else if (status === 'partial') {
      results.partial.push(result);
    } else {
      results.fail.push(result);
    }
  });

  // Summary
  console.log(colors.green, `✅ EXACT MATCHES: ${results.pass.length}`);
  console.log(colors.yellow, `⚠️  PARTIAL MATCHES: ${results.partial.length}`);
  console.log(colors.red, `❌ FAILED MATCHES: ${results.fail.length}`);
  console.log(colors.reset, '\n');

  // Show passing tests
  if (results.pass.length > 0) {
    console.log(colors.green, '✅ EXACT MATCHES (These work perfectly):\n');
    console.log(colors.reset);
    results.pass.forEach(({ typeformTitle, expectedField, normalized }) => {
      console.log(`  Typeform: "${typeformTitle}"`);
      console.log(`  Expected: "${expectedField}"`);
      console.log(`  Got:      "${normalized}"`);
      console.log(colors.green, '  ✅ Match!\n');
      console.log(colors.reset);
    });
  }

  // Show partial matches
  if (results.partial.length > 0) {
    console.log(colors.yellow, '⚠️  PARTIAL MATCHES (Prefix missing):\n');
    console.log(colors.reset);
    results.partial.forEach(({ typeformTitle, expectedField, normalized }) => {
      const prefix = expectedField.replace(normalized, '').replace(/_$/, '');
      console.log(`  Typeform: "${typeformTitle}"`);
      console.log(`  Expected: "${expectedField}"`);
      console.log(`  Got:      "${normalized}"`);
      console.log(colors.yellow, `  ⚠️  Missing prefix: "${prefix}"\n`);
      console.log(colors.reset);
    });
  }

  // Show failing tests
  if (results.fail.length > 0) {
    console.log(colors.red, '❌ FAILED MATCHES (Normalization issues):\n');
    console.log(colors.reset);
    results.fail.forEach(({ typeformTitle, expectedField, normalized, category }) => {
      console.log(`  Typeform: "${typeformTitle}"`);
      console.log(`  Expected: "${expectedField}"`);
      console.log(`  Got:      "${normalized}"`);

      // Highlight differences
      const differences = [];
      if (normalized.includes('\'')) differences.push('Contains apostrophe');
      if (normalized.includes('-')) differences.push('Contains hyphen');
      if (normalized !== normalized.replace(/\s+/g, '_')) differences.push('Spaces not replaced');

      if (differences.length > 0) {
        console.log(colors.red, `  ❌ Issues: ${differences.join(', ')}`);
      }
      console.log(colors.reset, '');
    });
  }

  return results;
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log(colors.cyan, '\n🔬 EDGE CASE TESTS\n');
  console.log('='.repeat(80));
  console.log(colors.reset);

  const edgeCases = [
    {
      input: "What's your name?",
      description: 'Apostrophe in contraction'
    },
    {
      input: 'License plate number (UK format)',
      description: 'Parentheses with clarification'
    },
    {
      input: 'T-junction or crossroads?',
      description: 'Hyphen in compound word'
    },
    {
      input: 'Street lights: on/off?',
      description: 'Colon and slash'
    },
    {
      input: 'Weather   conditions   (multiple spaces)',
      description: 'Multiple consecutive spaces'
    },
    {
      input: 'Email: user@example.com',
      description: 'Email address in title'
    },
    {
      input: '6-point safety check',
      description: 'Number with hyphen'
    },
    {
      input: 'Call 999?',
      description: 'Number in question'
    }
  ];

  edgeCases.forEach(({ input, description }) => {
    const normalized = normalizeTitle(input);
    console.log(`  Input: "${input}"`);
    console.log(`  Description: ${description}`);
    console.log(`  Output: "${normalized}"`);
    console.log('');
  });
}

/**
 * Suggest improvements to normalization
 */
function suggestImprovements(results) {
  console.log(colors.cyan, '\n💡 SUGGESTED IMPROVEMENTS\n');
  console.log('='.repeat(80));
  console.log(colors.reset);

  const suggestions = [];

  // Check for apostrophe issues
  const apostropheIssues = results.fail.filter(r =>
    r.typeformTitle.includes("'") && !r.normalized.includes("'")
  );
  if (apostropheIssues.length > 0) {
    suggestions.push({
      issue: 'Apostrophes removed from contractions',
      count: apostropheIssues.length,
      fix: "Don't remove apostrophes, or handle contractions specially (what's → whats)"
    });
  }

  // Check for hyphen issues
  const hyphenIssues = results.fail.filter(r =>
    r.typeformTitle.includes('-') && !r.normalized.includes('_')
  );
  if (hyphenIssues.length > 0) {
    suggestions.push({
      issue: 'Hyphens not converted to underscores',
      count: hyphenIssues.length,
      fix: 'Replace hyphens with underscores: .replace(/-/g, \'_\')'
    });
  }

  // Check for prefix issues
  if (results.partial.length > 0) {
    suggestions.push({
      issue: 'Missing category prefixes',
      count: results.partial.length,
      fix: 'Add prefix detection or use direct field ref matching instead of titles'
    });
  }

  if (suggestions.length === 0) {
    console.log(colors.green, '✅ No critical issues found!\n');
  } else {
    suggestions.forEach((suggestion, index) => {
      console.log(colors.yellow, `${index + 1}. ${suggestion.issue}`);
      console.log(colors.reset, `   Affected fields: ${suggestion.count}`);
      console.log(colors.cyan, `   Suggested fix: ${suggestion.fix}\n`);
      console.log(colors.reset);
    });
  }
}

/**
 * Show example improved normalization
 */
function showImprovedNormalization() {
  console.log(colors.cyan, '\n🔧 IMPROVED NORMALIZATION EXAMPLE\n');
  console.log('='.repeat(80));
  console.log(colors.reset);

  console.log('Current normalization:');
  console.log(colors.dim, `
  function normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[?.,;:!'"()]/g, '')  // ❌ Removes too much
      .replace(/\\s+/g, '_')
      .trim();
  }
  `);
  console.log(colors.reset);

  console.log('Suggested improvements:');
  console.log(colors.green, `
  function normalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[?.,;:!()"]/g, '')    // ✅ Keep apostrophes for now
      .replace(/'/g, '')               // ✅ Remove apostrophes separately
      .replace(/-/g, '_')              // ✅ Convert hyphens to underscores
      .replace(/\\s+/g, '_')           // ✅ Multiple spaces → single underscore
      .replace(/_+/g, '_')             // ✅ Multiple underscores → single
      .trim();
  }
  `);
  console.log(colors.reset);

  console.log('Test with improved normalization:');
  const testTitle = "What's your T-junction response?";
  const currentResult = normalizeTitle(testTitle);
  const improvedResult = testTitle
    .toLowerCase()
    .replace(/[?.,;:!()"]/g, '')
    .replace(/'/g, '')
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  console.log(`  Input: "${testTitle}"`);
  console.log(colors.red, `  Current: "${currentResult}"`);
  console.log(colors.green, `  Improved: "${improvedResult}"`);
  console.log(colors.reset, '\n');
}

// Main
console.log(colors.bright, '\n📊 TYPEFORM FIELD EXTRACTION DIAGNOSTIC TOOL');
console.log('='.repeat(80));
console.log(colors.reset);

const results = testNormalization();
testEdgeCases();
suggestImprovements(results);
showImprovedNormalization();

console.log(colors.cyan, '\n📋 SUMMARY\n');
console.log('='.repeat(80));
console.log(colors.reset);
console.log(`Total test cases: ${testCases.length}`);
console.log(colors.green, `Passing: ${results.pass.length} (${Math.round(results.pass.length / testCases.length * 100)}%)`);
console.log(colors.yellow, `Partial: ${results.partial.length} (${Math.round(results.partial.length / testCases.length * 100)}%)`);
console.log(colors.red, `Failing: ${results.fail.length} (${Math.round(results.fail.length / testCases.length * 100)}%)`);
console.log(colors.reset, '\n');

if (results.fail.length > 0 || results.partial.length > 0) {
  console.log(colors.yellow, '⚠️  ACTION REQUIRED: Update normalizeTitle() function in webhook.controller.js');
  console.log(colors.reset, '   See improved normalization example above');
  console.log('');
  process.exit(1);
} else {
  console.log(colors.green, '✅ All tests passing! Normalization logic looks good.');
  console.log(colors.reset, '');
  process.exit(0);
}
