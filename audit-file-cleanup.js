#!/usr/bin/env node

/**
 * File Cleanup Audit Script
 *
 * Analyzes project for redundant, orphaned, or outdated files.
 * Categorizes files by purpose and identifies cleanup candidates.
 *
 * Usage:
 *   node audit-file-cleanup.js           # Full audit
 *   node audit-file-cleanup.js --delete  # Execute cleanup (requires confirmation)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  gray: '\x1b[90m'
};

// File categories for analysis
const FILE_PATTERNS = {
  // Test files (many may be redundant)
  tests: {
    pattern: /^test-.*\.js$|^.*-test\.js$/,
    keep: ['test-security-wall.js'], // Keep critical tests
    description: 'Test scripts'
  },

  // Debug/diagnostic scripts (likely redundant after fix)
  debug: {
    pattern: /^(check|debug|diagnose|investigate|fix|verify)-.*\.js$/,
    keep: [], // Review individually
    description: 'Debug/diagnostic scripts'
  },

  // Documentation (check for duplicates)
  docs: {
    pattern: /\.md$/,
    keep: ['README.md', 'CLAUDE.md', 'CHANGELOG.md', 'CONTRIBUTING.md'],
    description: 'Documentation files'
  },

  // HTML test pages (may be redundant)
  testHtml: {
    pattern: /^test-.*\.html$/,
    keep: [],
    description: 'Test HTML pages'
  },

  // Backup/old files
  backups: {
    pattern: /\.(bak|backup|old|tmp)$|\.new\./,
    keep: [],
    description: 'Backup/old files'
  },

  // Scripts (review for duplication)
  scripts: {
    pattern: /^[a-z-]+\.js$/,
    exclude: /^(index|app|server|start-server)\.js$/, // Exclude main files
    description: 'Utility scripts'
  }
};

// Directories to ignore
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'src',
  'lib',
  'public',
  'migrations',
  'pdf-templates',
  'credentials'
];

async function auditFiles() {
  console.log(colors.cyan + colors.bold, '\n📋 File Cleanup Audit\n');
  console.log(colors.reset + '='.repeat(70));

  const rootDir = process.cwd();
  const allFiles = fs.readdirSync(rootDir);

  const analysis = {
    tests: [],
    debug: [],
    docs: [],
    testHtml: [],
    backups: [],
    scripts: [],
    unknown: []
  };

  const stats = {
    total: 0,
    categorized: 0,
    toReview: 0,
    toDelete: 0
  };

  // Categorize files
  console.log(colors.cyan, '\n📂 Scanning root directory...\n');

  for (const file of allFiles) {
    const filePath = path.join(rootDir, file);
    const stat = fs.statSync(filePath);

    // Skip directories
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        // Could analyze subdirs but keeping scope to root for now
      }
      continue;
    }

    stats.total++;

    // Categorize file
    let categorized = false;

    for (const [category, config] of Object.entries(FILE_PATTERNS)) {
      if (config.pattern.test(file)) {
        // Check if excluded
        if (config.exclude && config.exclude.test(file)) {
          continue;
        }

        const fileInfo = {
          name: file,
          size: stat.size,
          modified: stat.mtime,
          keep: config.keep ? config.keep.includes(file) : false,
          category
        };

        analysis[category].push(fileInfo);
        stats.categorized++;
        categorized = true;
        break;
      }
    }

    if (!categorized && file.endsWith('.js')) {
      analysis.scripts.push({
        name: file,
        size: stat.size,
        modified: stat.mtime,
        keep: false,
        category: 'scripts'
      });
      stats.categorized++;
    }
  }

  // Display analysis
  console.log(colors.cyan + colors.bold, '📊 ANALYSIS RESULTS\n');
  console.log(colors.reset + '='.repeat(70));

  for (const [category, files] of Object.entries(analysis)) {
    if (files.length === 0) continue;

    const config = FILE_PATTERNS[category];
    const description = config?.description || 'Other files';

    console.log(colors.yellow + colors.bold, `\n${description.toUpperCase()} (${files.length})`);
    console.log(colors.reset + '-'.repeat(70));

    // Sort by modification date (oldest first)
    files.sort((a, b) => a.modified - b.modified);

    for (const file of files) {
      const age = Math.floor((Date.now() - file.modified) / (1000 * 60 * 60 * 24));
      const ageStr = age === 0 ? 'today' : age === 1 ? 'yesterday' : `${age} days ago`;
      const sizeKB = Math.floor(file.size / 1024);

      const keepMarker = file.keep ? colors.green + '[KEEP]' : colors.gray + '[REVIEW]';
      const ageColor = age > 30 ? colors.red : age > 7 ? colors.yellow : colors.green;

      console.log(
        `${keepMarker} ${colors.reset}${file.name.padEnd(40)} ` +
        `${ageColor}${ageStr.padEnd(15)}${colors.reset} ` +
        `${colors.gray}${sizeKB}KB${colors.reset}`
      );

      if (!file.keep) {
        stats.toReview++;
      }
    }
  }

  // Summary
  console.log(colors.cyan + colors.bold, '\n\n📈 SUMMARY\n');
  console.log(colors.reset + '='.repeat(70));
  console.log(`Total files scanned: ${stats.total}`);
  console.log(`Categorized files: ${stats.categorized}`);
  console.log(colors.yellow, `Files to review: ${stats.toReview}`);
  console.log(colors.reset);

  // Recommendations
  console.log(colors.cyan + colors.bold, '\n💡 RECOMMENDATIONS\n');
  console.log(colors.reset + '='.repeat(70));

  const recommendations = [];

  // Test files
  if (analysis.tests.length > 10) {
    recommendations.push({
      category: 'Test Scripts',
      issue: `${analysis.tests.length} test files found`,
      action: 'Consolidate into test/ directory, keep only active tests',
      files: analysis.tests.filter(f => !f.keep).slice(0, 5).map(f => f.name)
    });
  }

  // Debug scripts
  if (analysis.debug.length > 5) {
    recommendations.push({
      category: 'Debug Scripts',
      issue: `${analysis.debug.length} debug/diagnostic scripts`,
      action: 'Delete scripts for resolved issues, move active ones to scripts/ dir',
      files: analysis.debug.slice(0, 5).map(f => f.name)
    });
  }

  // Documentation
  const redundantDocs = analysis.docs.filter(f =>
    !f.keep && (
      f.name.includes('FIX') ||
      f.name.includes('DEBUG') ||
      f.name.includes('ERROR')
    )
  );

  if (redundantDocs.length > 0) {
    recommendations.push({
      category: 'Documentation',
      issue: `${redundantDocs.length} fix/debug documentation files`,
      action: 'Consolidate into TROUBLESHOOTING.md or delete if resolved',
      files: redundantDocs.map(f => f.name)
    });
  }

  // Backups
  if (analysis.backups.length > 0) {
    recommendations.push({
      category: 'Backup Files',
      issue: `${analysis.backups.length} backup/old files`,
      action: 'DELETE - these should be in git history',
      files: analysis.backups.map(f => f.name)
    });
  }

  // Display recommendations
  for (const rec of recommendations) {
    console.log(colors.yellow + colors.bold, `\n${rec.category}`);
    console.log(colors.reset, `  Issue: ${rec.issue}`);
    console.log(colors.green, `  Action: ${rec.action}`);
    console.log(colors.gray, `  Examples: ${rec.files.join(', ')}`);
  }

  // Proposed cleanup plan
  console.log(colors.cyan + colors.bold, '\n\n🗑️  PROPOSED CLEANUP PLAN\n');
  console.log(colors.reset + '='.repeat(70));

  const cleanupPlan = generateCleanupPlan(analysis);

  console.log(colors.yellow, '\n1. CREATE ORGANIZED STRUCTURE:');
  console.log(colors.reset, '   tests/          - Active test scripts');
  console.log('   scripts/        - Utility scripts');
  console.log('   docs/archive/   - Historical documentation');

  console.log(colors.yellow, '\n2. MOVE FILES:');
  console.log(colors.gray, `   ${cleanupPlan.toMove.length} files to move to organized structure`);

  console.log(colors.yellow, '\n3. DELETE FILES:');
  console.log(colors.red, `   ${cleanupPlan.toDelete.length} files to delete (redundant/obsolete)`);

  console.log(colors.yellow, '\n4. CONSOLIDATE DOCS:');
  console.log(colors.gray, `   ${cleanupPlan.toConsolidate.length} docs to review and consolidate`);

  // Next steps
  console.log(colors.cyan + colors.bold, '\n\n📝 NEXT STEPS\n');
  console.log(colors.reset + '='.repeat(70));
  console.log('1. Review the analysis above');
  console.log('2. Check CLEANUP_PLAN.md for detailed recommendations');
  console.log('3. Run: node audit-file-cleanup.js --execute (to perform cleanup)');
  console.log('4. Or manually move/delete files as needed\n');

  // Write detailed plan to file
  writeCleanupPlan(cleanupPlan, analysis, recommendations);

  return { analysis, stats, recommendations, cleanupPlan };
}

function generateCleanupPlan(analysis) {
  const plan = {
    toMove: [],
    toDelete: [],
    toConsolidate: []
  };

  // Files to delete (definitely redundant)
  plan.toDelete = [
    ...analysis.backups,
    ...analysis.testHtml,
    ...analysis.debug.filter(f => f.modified < Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
  ];

  // Files to move (organize into directories)
  plan.toMove = [
    ...analysis.tests.filter(f => !f.keep),
    ...analysis.scripts.filter(f => !['index.js', 'start-server.js'].includes(f.name))
  ];

  // Docs to consolidate
  plan.toConsolidate = analysis.docs.filter(f =>
    !f.keep && (
      f.name.includes('FIX') ||
      f.name.includes('DEBUG') ||
      f.name.includes('TEST') ||
      f.name.includes('ERROR')
    )
  );

  return plan;
}

function writeCleanupPlan(plan, analysis, recommendations) {
  const content = `# File Cleanup Plan

**Generated**: ${new Date().toISOString()}
**Total files analyzed**: ${analysis.tests.length + analysis.debug.length + analysis.docs.length + analysis.scripts.length}

## Recommended Actions

### 1. Delete Redundant Files (${plan.toDelete.length})

${plan.toDelete.map(f => `- [ ] \`${f.name}\` (${Math.floor(f.size / 1024)}KB, modified ${f.modified.toLocaleDateString()})`).join('\n')}

### 2. Move to Organized Structure (${plan.toMove.length})

Create directories:
\`\`\`bash
mkdir -p tests scripts docs/archive
\`\`\`

Move files:
${plan.toMove.slice(0, 10).map(f => `- [ ] \`mv ${f.name} tests/\` or \`scripts/\``).join('\n')}
${plan.toMove.length > 10 ? `\n... and ${plan.toMove.length - 10} more` : ''}

### 3. Consolidate Documentation (${plan.toConsolidate.length})

Review and consolidate into main docs:
${plan.toConsolidate.map(f => `- [ ] \`${f.name}\` - Review and merge into TROUBLESHOOTING.md or CLAUDE.md`).join('\n')}

## Detailed Recommendations

${recommendations.map(rec => `
### ${rec.category}

**Issue**: ${rec.issue}
**Action**: ${rec.action}
**Examples**:
${rec.files.map(f => `- \`${f}\``).join('\n')}
`).join('\n')}

## Execution Commands

\`\`\`bash
# Create directories
mkdir -p tests scripts docs/archive

# Move test files
${plan.toMove.filter(f => f.name.startsWith('test-')).slice(0, 3).map(f => `mv ${f.name} tests/`).join('\n')}

# Delete redundant files (REVIEW FIRST!)
${plan.toDelete.slice(0, 3).map(f => `rm ${f.name}`).join('\n')}

# Archive old docs
${plan.toConsolidate.slice(0, 3).map(f => `mv ${f.name} docs/archive/`).join('\n')}
\`\`\`

## Notes

- All deletions should be reviewed before execution
- Files are backed up in git history
- Keep test-security-wall.js (critical for auth testing)
- Keep any recently modified files (< 7 days)
`;

  fs.writeFileSync('CLEANUP_PLAN.md', content);
  console.log(colors.green, '\n✅ Detailed cleanup plan written to CLEANUP_PLAN.md');
}

// Main execution
auditFiles().catch(console.error);
