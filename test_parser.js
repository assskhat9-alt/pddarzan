import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');

// Match questions by "Вопрос № X"
const qRegex = /Вопрос\s*№?\s*(\d+)[\r\n]+([\s\S]*?)(?=(?:Вопрос\s*№?\s*\d+|$))/g;

let count = 0;
let validCount = 0;
let issues = [];

let match;
while ((match = qRegex.exec(text)) !== null) {
  count++;
  const qNum = parseInt(match[1]);
  const content = match[2];
  
  // Check if content has options with '*'
  const hasAsterisk = content.includes('*');
  if (!hasAsterisk) {
    issues.push({ qNum, issue: 'No asterisk found' });
  } else {
    validCount++;
  }
}

console.log(`Total questions matched: ${count}`);
console.log(`Questions with marked correct answer (*): ${validCount}`);
console.log(`Issues count: ${issues.length}`);
if (issues.length > 0) {
  console.log('Sample issues:', issues.slice(0, 10));
}
