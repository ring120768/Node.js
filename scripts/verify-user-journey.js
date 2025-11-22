#!/usr/bin/env node
/**
 * Verify user journey fields against extracted CSV
 *
 * This script helps identify:
 * 1. Fields user saw but aren't in CSV
 * 2. Fields in CSV but user didn't see
 * 3. Fields that match
 */

const fs = require('fs');

// Read the CSV
const csvContent = fs.readFileSync('UI_FORM_FIELDS.csv', 'utf8');
const lines = csvContent.trim().split('\n').slice(1); // Skip header

const extractedFields = new Set();
lines.forEach(line => {
  const match = line.match(/"([^"]+)","([^"]+)"/);
  if (match) {
    extractedFields.add(match[2]); // Field name
  }
});

console.log('\n📋 CSV Analysis\n');
console.log(`Total fields in CSV: ${extractedFields.size}`);
console.log('\nExtracted fields by category:\n');

// Group by category
const categories = {
  medical: [],
  weather: [],
  road: [],
  vehicle: [],
  other_party: [],
  witness: [],
  police: [],
  location: [],
  damage: [],
  other: []
};

extractedFields.forEach(field => {
  if (field.startsWith('medical_')) categories.medical.push(field);
  else if (field.startsWith('weather_')) categories.weather.push(field);
  else if (field.startsWith('road_')) categories.road.push(field);
  else if (field.startsWith('vehicle_') || field.includes('speed') || field.includes('airbag')) categories.vehicle.push(field);
  else if (field.startsWith('other_')) categories.other_party.push(field);
  else if (field.startsWith('witness_')) categories.witness.push(field);
  else if (field.startsWith('police_')) categories.police.push(field);
  else if (field.includes('location') || field.includes('junction') || field.includes('landmark')) categories.location.push(field);
  else if (field.includes('damage') || field.includes('impact')) categories.damage.push(field);
  else categories.other.push(field);
});

Object.keys(categories).forEach(cat => {
  if (categories[cat].length > 0) {
    console.log(`  ${cat}: ${categories[cat].length} fields`);
  }
});

console.log('\n\n💡 To verify your user journey:\n');
console.log('1. Create a text file listing the fields you saw (one per line)');
console.log('2. Save it as "user-journey-fields.txt"');
console.log('3. Run this script again to compare\n');

// If user journey file exists, compare
if (fs.existsSync('user-journey-fields.txt')) {
  const userFields = fs.readFileSync('user-journey-fields.txt', 'utf8')
    .trim()
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  console.log('🔍 Comparing with your user journey...\n');

  const inBoth = userFields.filter(f => extractedFields.has(f));
  const userOnly = userFields.filter(f => !extractedFields.has(f));
  const csvOnly = Array.from(extractedFields).filter(f => !userFields.includes(f));

  console.log(`✅ Fields in both: ${inBoth.length}`);
  console.log(`⚠️  You saw but NOT in CSV: ${userOnly.length}`);
  console.log(`📋 In CSV but you didn't see: ${csvOnly.length}`);

  if (userOnly.length > 0) {
    console.log('\n⚠️  Fields you saw but NOT in CSV:');
    userOnly.forEach(f => console.log(`   - ${f}`));
  }

  if (csvOnly.length > 0 && csvOnly.length < 20) {
    console.log('\n📋 In CSV but you didn\'t encounter:');
    csvOnly.forEach(f => console.log(`   - ${f}`));
  }
}
