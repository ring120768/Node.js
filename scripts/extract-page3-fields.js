const fs = require('fs');

const content = fs.readFileSync('/Users/ianring/Node.js/public/incident-form-page3.html', 'utf8');
const inputPattern = /<(?:input|select|textarea)[^>]*name="([^"]+)"[^>]*>/g;
const fields = [];
let match;

while ((match = inputPattern.exec(content)) !== null) {
  if (!fields.includes(match[1])) {
    fields.push(match[1]);
  }
}

console.log(`Page Three Fields (${fields.length} total):\n`);
fields.forEach((f, i) => console.log(`${i+1}. ${f}`));
