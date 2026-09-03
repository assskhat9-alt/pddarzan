import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');
const qRegex = /Вопрос\s*№?\s*(\d+)[\r\n]+([\s\S]*?)(?=(?:Вопрос\s*№?\s*\d+|$))/g;

function splitIntoThreeSections(body) {
  // Find the positions of the 3 "1." markers
  const regex = /(?:^|\n)\s*(1[\.\)]\s*)/g;
  const matches = [...body.matchAll(regex)];
  if (matches.length !== 3) return null;
  
  // Section 1: from start of body to start of Kazakh question
  // Section 2: Kazakh question to start of English question
  // Section 3: English question to end
  return matches;
}

let m;
let total = 0;
while ((m = qRegex.exec(text)) !== null) {
  total++;
}
console.log('Total questions tested:', total);
