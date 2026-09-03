import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');
const pages = text.split(/--\s*\d+\s*of\s*\d+\s*--/);

// Build map of qNum to full text (handling overflow pages 572 and 596)
const qTexts = {};
let currentQ = null;

pages.forEach((p, idx) => {
  const m = p.match(/Вопрос\s*№?\s*(\d+)/i);
  if (m) {
    currentQ = parseInt(m[1]);
    qTexts[currentQ] = p;
  } else if (currentQ) {
    // overflow page
    qTexts[currentQ] += '\n' + p;
  }
});

console.log('Total question entries:', Object.keys(qTexts).length);

function parseQuestion(raw, num) {
  // Remove header
  let body = raw.replace(/Вопрос\s*№?\s*\d+/i, '').trim();
  
  // Find lines starting with numbers followed by dot: e.g. "1. "
  // We have 3 language blocks: Russian, Kazakh, English.
  // In each language block:
  // Question text
  // 1. Option 1
  // 2. Option 2...
  
  // Let's identify the options in Russian, Kazakh, English
  // A clean way is to find blocks by number lists
  // Notice English starts with Latin characters, Kazakh has Kazakh specific letters or typical words
  // Let's analyze how the blocks are separated
  return { num, len: body.length };
}

let parsedCount = 0;
for (let i = 1; i <= 1103; i++) {
  if (qTexts[i]) parsedCount++;
}
console.log('Parsed count matching 1..1103:', parsedCount);
