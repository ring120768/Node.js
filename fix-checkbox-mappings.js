const fs = require('fs');

const filePath = '/Users/ianring/Node.js/src/services/adobePdfFormFillerService.js';
let content = fs.readFileSync(filePath, 'utf8');

// Count fixes
let count = 0;

// Fix pattern: checkField('fieldname', value === true) -> checkField('fieldname', value)
content = content.replace(/checkField\(([^,]+),\s*([^)]+)\s*===\s*true\)/g, (match, fieldName, value) => {
  count++;
  return `checkField(${fieldName}, ${value.trim()})`;
});

console.log(`Fixed ${count} === true checks`);

// Save the file
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully');
