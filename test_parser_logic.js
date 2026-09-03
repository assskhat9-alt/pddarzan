import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');
const pages = text.split(/--\s*\d+\s*of\s*\d+\s*--/);

const qTexts = {};
let currentQ = null;

pages.forEach((p, idx) => {
  const m = p.match(/Вопрос\s*№?\s*(\d+)/i);
  if (m) {
    currentQ = parseInt(m[1]);
    qTexts[currentQ] = p;
  } else if (currentQ) {
    qTexts[currentQ] += '\n' + p;
  }
});

function parseOne(rawText, qNum) {
  const clean = rawText.replace(/Вопрос\s*№?\s*\d+/i, '').trim();
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // Find all lines that start with a number like "1. ", "2. ", "3. ", "4. ", "5. "
  // Or "1) "
  const optionRegex = /^(\d+)[\.\)]\s*(.*)/;
  
  // Group into language sections
  // Each language section has: questionText, options: [ { text, isCorrect } ]
  const sections = [];
  let curQText = [];
  let curOptions = [];
  let inOptions = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(optionRegex);
    
    if (match) {
      const optNum = parseInt(match[1]);
      if (optNum === 1 && inOptions) {
        // We hit the next language section's options?
        // Wait, if curQText was collected, this is the options for curQText.
      }
      inOptions = true;
      const isCorrect = line.includes('*');
      const optClean = match[2].replace(/\*/g, '').trim();
      curOptions.push({
        num: optNum,
        text: optClean,
        isCorrect
      });
    } else {
      if (inOptions) {
        // Previous options finished, or this is continuation of previous option?
        // If line is continuation of previous option:
        // Wait! How do we know if it's continuation of previous option vs start of next question?
        // In Russian/Kazakh/English:
        // A continuation of an option usually doesn't end with '?'
        // And the next question usually starts with capital letter or question word or ends with '?'
      }
    }
  }
}
