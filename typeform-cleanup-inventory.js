#!/usr/bin/env node
/**
 * Typeform Legacy Code Inventory
 * Comprehensive analysis of all Typeform references for safe removal
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 TYPEFORM LEGACY CODE INVENTORY\n');
console.log('='.repeat(80));

// Find all Typeform references
console.log('\n📁 SEARCHING FOR TYPEFORM REFERENCES...\n');

const searches = [
  { pattern: 'Typeform', label: 'Exact: Typeform' },
  { pattern: 'typeform', label: 'Lowercase: typeform' },
  { pattern: 'TYPEFORM', label: 'Uppercase: TYPEFORM' }
];

const allReferences = new Map();

searches.forEach(({ pattern, label }) => {
  try {
    const result = execSync(
      `grep -r "${pattern}" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git src/ lib/ public/ index.js package.json 2>/dev/null || true`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );

    if (result.trim()) {
      result.trim().split('\n').forEach(line => {
        const [file, ...rest] = line.split(':');
        const content = rest.join(':');
        if (!allReferences.has(file)) {
          allReferences.set(file, []);
        }
        allReferences.get(file).push(content.trim());
      });
    }
  } catch (error) {
    // grep returns exit code 1 if no matches, which throws error
  }
});

console.log(`Found references in ${allReferences.size} files\n`);

// Categorize files
const categories = {
  middleware: [],
  tests: [],
  routes: [],
  controllers: [],
  config: [],
  docs: [],
  other: []
};

allReferences.forEach((lines, file) => {
  const fileInfo = { file, lines };

  if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) {
    categories.tests.push(fileInfo);
  } else if (file.includes('middleware/')) {
    categories.middleware.push(fileInfo);
  } else if (file.includes('routes/')) {
    categories.routes.push(fileInfo);
  } else if (file.includes('controllers/')) {
    categories.controllers.push(fileInfo);
  } else if (file.includes('config') || file === 'package.json') {
    categories.config.push(fileInfo);
  } else if (file.endsWith('.md')) {
    categories.docs.push(fileInfo);
  } else {
    categories.other.push(fileInfo);
  }
});

// Print categorized results
console.log('📊 BREAKDOWN BY CATEGORY\n');

Object.entries(categories).forEach(([category, files]) => {
  if (files.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`${category.toUpperCase()} (${files.length} files)`);
    console.log('─'.repeat(80));

    files.forEach(({ file, lines }) => {
      console.log(`\n📄 ${file}`);
      console.log(`   References: ${lines.length}`);

      // Show first 3 references
      lines.slice(0, 3).forEach(line => {
        const preview = line.length > 80 ? line.substring(0, 77) + '...' : line;
        console.log(`   • ${preview}`);
      });

      if (lines.length > 3) {
        console.log(`   ... and ${lines.length - 3} more`);
      }
    });
  }
});

// Analysis and recommendations
console.log('\n\n' + '='.repeat(80));
console.log('📋 REMOVAL STRATEGY');
console.log('='.repeat(80));

console.log('\n✅ SAFE TO REMOVE (Typeform-only functionality):');
console.log('   • Test files in __tests__/ directories');
console.log('   • Typeform-specific functions not used by active webhooks');

console.log('\n⚠️  REQUIRES CAREFUL REVIEW (Mixed use):');
console.log('   • Middleware that handles multiple webhook types');
console.log('   • CORS config that includes other services');
console.log('   • Generic webhook authentication functions');

console.log('\n📝 KEEP (Documentation):');
console.log('   • Migration history in CLAUDE.md');
console.log('   • Architecture notes about the transition');

console.log('\n\n' + '='.repeat(80));
console.log('NEXT STEPS');
console.log('='.repeat(80));
console.log('\n1. Review middleware files - check if functions handle GitHub too');
console.log('2. Remove Typeform tests first (safest)');
console.log('3. Remove Typeform-only functions');
console.log('4. Clean up mixed functions (preserve GitHub functionality)');
console.log('5. Update documentation to note removal');
console.log('6. Test GitHub webhook if it exists');
console.log('\n');
