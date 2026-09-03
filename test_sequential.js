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

// Helper to extract sequential options from a text block
function extractOptionsAndQuestion(block) {
  // block contains Question text at top, then 1. ..., 2. ..., 3. ..., etc.
  // Let's find all sequential options: 1, 2, 3...
  const options = [];
  let nextExpected = 1;
  const optMatches = [];
  
  // We search for lines starting with nextExpected followed by '.' or ')'
  const lines = block.split(/\r?\n/);
  let qLines = [];
  let foundFirstOpt = false;
  let currentOpt = null;
  
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this line starts with `nextExpected.` or `nextExpected)`
    const match = trimmed.match(new RegExp(`^${nextExpected}[\\.\\)]\\s*(.*)`));
    if (match) {
      foundFirstOpt = true;
      if (currentOpt) {
        options.push(currentOpt);
      }
      const isCorrect = trimmed.includes('*');
      const textClean = match[1].replace(/\*/g, '').trim();
      currentOpt = {
        num: nextExpected,
        text: textClean,
        isCorrect
      };
      nextExpected++;
    } else {
      if (!foundFirstOpt) {
        qLines.push(trimmed);
      } else if (currentOpt) {
        // Continuation of current option, OR trailing text (e.g. next question)?
        // Wait, in a pure single-language block, any line after an option is continuation of the option.
        // But what if currentOpt contains an asterisk and ends with a period?
        if (trimmed.includes('*')) {
          currentOpt.isCorrect = true;
        }
        currentOpt.text += ' ' + trimmed.replace(/\*/g, '').trim();
      }
    }
  }
  if (currentOpt) {
    options.push(currentOpt);
  }
  
  return {
    question: qLines.join(' ').trim(),
    options
  };
}

console.log('Sequential helper defined.');
