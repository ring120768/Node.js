/**
 * List all PDF template fields grouped by type
 */

const data = require('./pdf-template-fields.json');
const fields = data.fieldInventory;

// Group by type
const byType = {
  text: fields.filter(f => f.type === 'text').map(f => f.name).sort(),
  checkbox: fields.filter(f => f.type === 'checkbox').map(f => f.name).sort(),
  other: fields.filter(f => f.type !== 'text' && f.type !== 'checkbox').map(f => f.name).sort()
};

console.log(`=== TEXT FIELDS (${byType.text.length}) ===`);
byType.text.forEach((name, i) => console.log(`${(i+1).toString().padStart(3)}. ${name}`));

console.log(`\n=== CHECKBOX FIELDS (${byType.checkbox.length}) ===`);
byType.checkbox.forEach((name, i) => console.log(`${(i+1).toString().padStart(3)}. ${name}`));

console.log(`\n=== OTHER FIELDS (${byType.other.length}) ===`);
byType.other.forEach((name, i) => console.log(`${(i+1).toString().padStart(3)}. ${name}`));

console.log(`\n=== TOTALS ===`);
console.log(`Text: ${byType.text.length}`);
console.log(`Checkbox: ${byType.checkbox.length}`);
console.log(`Other: ${byType.other.length}`);
console.log(`Total: ${fields.length}`);
