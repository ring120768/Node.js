#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function loadCSV(filename) {
  const filepath = path.join(__dirname, '..', filename);
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
  return matrix[b.length][a.length];
}

function findTypos() {
  log('\n========================================', 'cyan');
  log('  PDF Typo Matcher', 'cyan');
  log('========================================\n', 'cyan');

  const pdfFields = loadCSV('PDF_FIELDS_LOCAL.csv');
  const typos = loadCSV('PDF_TYPOS.csv');

  const pdfFieldNames = pdfFields.map(p => p['Field Name']);

  log(`📊 Analyzing ${typos.length} mismatches...\n`, 'blue');

  const corrections = [];

  typos.forEach(typo => {
    const wrongField = typo['PDF Field (Wrong)'];
    
    // Find closest match
    let bestMatch = null;
    let bestDistance = Infinity;
    
    pdfFieldNames.forEach(pdfField => {
      const distance = levenshtein(wrongField.toLowerCase(), pdfField.toLowerCase());
      if (distance < bestDistance && distance <= 5) {
        bestDistance = distance;
        bestMatch = pdfField;
      }
    });

    corrections.push({
      line: typo.Line,
      wrong: wrongField,
      correct: bestMatch || 'NOT FOUND',
      distance: bestDistance,
      dbColumn: typo['DB Column']
    });
  });

  // Sort by likelihood (lower distance = more likely match)
  corrections.sort((a, b) => a.distance - b.distance);

  // Generate report
  let report = '# PDF Field Name Corrections\n\n';
  report += `Found ${typos.length} field name mismatches. Here are the suggested corrections:\n\n`;
  report += '## 🔧 Corrections Needed in PDF or Code\n\n';
  report += '| Line | Wrong Field Name (in Code) | Correct PDF Field | Distance | DB Column |\n';
  report += '|------|---------------------------|-------------------|----------|-----------|\ n';

  corrections.forEach(c => {
    const emoji = c.distance <= 2 ? '✅' : c.distance <= 4 ? '⚠️' : '❌';
    report += `| ${c.line} | \`${c.wrong}\` | \`${c.correct}\` | ${emoji} ${c.distance} | \`${c.dbColumn}\` |\n`;
  });

  report += '\n**Legend**:\n';
  report += '- ✅ Distance 0-2: Very close match (likely typo)\n';
  report += '- ⚠️ Distance 3-4: Possible match\n';
  report += '- ❌ Distance 5+: May need manual review\n\n';

  // Show high-confidence matches
  const highConfidence = corrections.filter(c => c.distance <= 2);
  
  if (highConfidence.length > 0) {
    log(`✅ Found ${highConfidence.length} high-confidence matches:\n`, 'green');
    highConfidence.slice(0, 10).forEach(c => {
      log(`  Line ${c.line}: ${c.wrong} → ${c.correct}`, 'cyan');
    });
    if (highConfidence.length > 10) {
      log(`  ... and ${highConfidence.length - 10} more\n`, 'yellow');
    }
  }

  fs.writeFileSync(path.join(__dirname, '..', 'PDF_FIELD_CORRECTIONS.md'), report, 'utf8');
  log(`\n✅ Saved: PDF_FIELD_CORRECTIONS.md\n`, 'green');

  // Also save CSV
  const csv = 'Line,Wrong Field,Correct PDF Field,Distance,DB Column\n' +
    corrections.map(c => `${c.line},"${c.wrong}","${c.correct}",${c.distance},"${c.dbColumn}"`).join('\n');
  
  fs.writeFileSync(path.join(__dirname, '..', 'PDF_FIELD_CORRECTIONS.csv'), csv, 'utf8');
  log(`✅ Saved: PDF_FIELD_CORRECTIONS.csv\n`, 'green');
}

findTypos();
