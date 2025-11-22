const fs = require('fs');
const path = require('path');

console.log('='.repeat(70));
console.log('PDF FIELD COUNT VERIFICATION');
console.log('='.repeat(70));

// Read the field list JSON
const fieldListPath = path.join(__dirname, '../field-list.json');
const fieldData = JSON.parse(fs.readFileSync(fieldListPath, 'utf8'));

console.log(`\n📊 BASIC STATISTICS:`);
console.log(`Total fields reported: ${fieldData.total_fields}`);
console.log(`Fields array length: ${fieldData.fields.length}`);
console.log(`Extraction timestamp: ${fieldData.extracted_at}`);

// Count by type
const typeCounts = {};
fieldData.fields.forEach(field => {
  typeCounts[field.type] = (typeCounts[field.type] || 0) + 1;
});

console.log(`\n📝 FIELD TYPES BREAKDOWN:`);
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Verify calculation
const totalCalc = Object.values(typeCounts).reduce((a, b) => a + b, 0);
console.log(`  ─────────────`);
console.log(`  TOTAL: ${totalCalc}`);

// Check for duplicate field names
const fieldNames = {};
const duplicates = [];
fieldData.fields.forEach(field => {
  if (fieldNames[field.name]) {
    duplicates.push({
      name: field.name,
      indices: [fieldNames[field.name], field.index]
    });
  } else {
    fieldNames[field.name] = field.index;
  }
});

console.log(`\n🔍 DUPLICATE FIELD NAME CHECK:`);
if (duplicates.length > 0) {
  console.log(`  ⚠️  Found ${duplicates.length} duplicate field names:`);
  duplicates.forEach(dup => {
    console.log(`    - "${dup.name}" appears at indices: ${dup.indices.join(', ')}`);
  });
} else {
  console.log(`  ✅ No duplicate field names found`);
}

// Check for missing index numbers
console.log(`\n🔢 INDEX SEQUENCE CHECK:`);
const indices = fieldData.fields.map(f => f.index).sort((a, b) => a - b);
const missing = [];
for (let i = 1; i <= indices[indices.length - 1]; i++) {
  if (!indices.includes(i)) {
    missing.push(i);
  }
}

if (missing.length > 0) {
  console.log(`  ⚠️  Missing indices: ${missing.join(', ')}`);
  console.log(`  This could explain the discrepancy!`);
} else {
  console.log(`  ✅ Index sequence is continuous from 1 to ${indices[indices.length - 1]}`);
}

// Multiline field analysis
const multilineFields = fieldData.fields.filter(f => f.multiline === true);
const singleLineFields = fieldData.fields.filter(f => f.multiline === false);
const noMultilineInfo = fieldData.fields.filter(f => f.multiline === undefined);

console.log(`\n📄 MULTILINE FIELD ANALYSIS:`);
console.log(`  Multiline text fields: ${multilineFields.length}`);
console.log(`  Single-line text fields: ${singleLineFields.length}`);
console.log(`  No multiline info (signatures/checkboxes): ${noMultilineInfo.length}`);

// List all field names alphabetically for manual verification
console.log(`\n📋 ALL FIELD NAMES (Alphabetically):`);
const sortedNames = Object.keys(fieldNames).sort();
sortedNames.forEach((name, idx) => {
  console.log(`  ${(idx + 1).toString().padStart(3, ' ')}. ${name} (index: ${fieldNames[name]})`);
});

// Check for potential issues
console.log(`\n🔎 POTENTIAL ISSUES:`);
let issueCount = 0;

// Check for unusual field names
const unusualNames = sortedNames.filter(name =>
  name.includes('_2') ||
  name.includes('_3') ||
  name.includes('undefined') ||
  name.includes('null') ||
  name.length < 2
);

if (unusualNames.length > 0) {
  issueCount++;
  console.log(`  ⚠️  ${unusualNames.length} fields with unusual naming patterns:`);
  unusualNames.forEach(name => {
    console.log(`    - "${name}"`);
  });
}

// Check for very similar field names that might be duplicates
const similarNames = [];
for (let i = 0; i < sortedNames.length - 1; i++) {
  const current = sortedNames[i];
  const next = sortedNames[i + 1];

  // Check if names are very similar (differ by only 1-2 characters)
  if (current.length > 5 && next.length > 5) {
    const similarity = calculateSimilarity(current, next);
    if (similarity > 0.9) {
      similarNames.push({ name1: current, name2: next, similarity });
    }
  }
}

if (similarNames.length > 0) {
  issueCount++;
  console.log(`\n  ⚠️  ${similarNames.length} pairs of very similar field names:`);
  similarNames.forEach(pair => {
    console.log(`    - "${pair.name1}" vs "${pair.name2}" (${(pair.similarity * 100).toFixed(1)}% similar)`);
  });
}

if (issueCount === 0) {
  console.log(`  ✅ No obvious issues detected`);
}

// FINAL SUMMARY
console.log(`\n${'='.repeat(70)}`);
console.log(`SUMMARY:`);
console.log(`${'='.repeat(70)}`);
console.log(`Extracted field count: ${fieldData.fields.length}`);
console.log(`User reported count: 209`);
console.log(`Discrepancy: ${209 - fieldData.fields.length} fields`);

if (missing.length > 0) {
  console.log(`\n💡 LIKELY EXPLANATION:`);
  console.log(`   The extraction may have skipped ${missing.length} index positions.`);
  console.log(`   These could be read-only fields, calculated fields, or hidden fields`);
  console.log(`   that pdf-lib doesn't detect as editable form fields.`);
}

console.log(`\n✅ Verification complete!`);
console.log('='.repeat(70));

// Helper function to calculate string similarity
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
