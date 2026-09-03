import fs from 'fs';
import path from 'path';

console.log('Generating questions.json from full_text.txt...');

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

function splitOptionsAndNextQ(block, isLastBlock = false) {
  const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let maxOpt = 1;
  for (const line of lines) {
    const m = line.match(/^(\d+)[\.\)]\s+/);
    if (m) {
      const n = parseInt(m[1]);
      if (n === maxOpt + 1) maxOpt = n;
    }
  }
  
  const options = [];
  let currentOpt = null;
  let correctIndex = -1;
  let inLastOpt = false;
  let inNextQ = false;
  const nextQLines = [];
  let optIndex = 0;
  
  for (const line of lines) {
    if (!inNextQ) {
      const m = line.match(/^(\d+)[\.\)]\s+/);
      if (m && parseInt(m[1]) === optIndex + 1) {
        if (currentOpt) {
          options.push(currentOpt.text);
        }
        optIndex = parseInt(m[1]);
        if (optIndex === maxOpt) {
          inLastOpt = true;
        }
        const isCorrect = line.includes('*');
        if (isCorrect) correctIndex = optIndex - 1;
        const textClean = line.replace(/^\d+[\.\)]\s+/, '').replace(/\*/g, '').trim();
        currentOpt = { text: textClean };
        
        if (inLastOpt && !isLastBlock && /[\.;\*]\s*$/.test(line)) {
          inNextQ = true;
        }
      } else {
        if (currentOpt) {
          if (line.includes('*')) correctIndex = optIndex - 1;
          currentOpt.text += ' ' + line.replace(/\*/g, '').trim();
        }
        if (inLastOpt && !isLastBlock && /[\.;\*]\s*$/.test(line)) {
          inNextQ = true;
        }
      }
    } else {
      nextQLines.push(line);
    }
  }
  
  if (currentOpt) {
    options.push(currentOpt.text);
  }
  
  return {
    options: options.map(o => o.replace(/[\s;]+$/, '').trim()),
    nextQuestion: nextQLines.join(' ').trim(),
    correctIndex
  };
}

const allQuestions = [];

for (let i = 1; i <= 1103; i++) {
  const raw = qTexts[i];
  const clean = raw.replace(/Вопрос\s*№?\s*\d+/i, '').replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
  const ones = [...clean.matchAll(/(?:^|\n)\s*1[\.\)]\s+/g)];
  
  const ruQuestion = clean.substring(0, ones[0].index).trim();
  const ruRes = splitOptionsAndNextQ(clean.substring(ones[0].index, ones[1].index));
  const kkRes = splitOptionsAndNextQ(clean.substring(ones[1].index, ones[2].index));
  const enRes = splitOptionsAndNextQ(clean.substring(ones[2].index), true);
  
  const correct = kkRes.correctIndex !== -1 ? kkRes.correctIndex : (ruRes.correctIndex !== -1 ? ruRes.correctIndex : enRes.correctIndex);
  
  allQuestions.push({
    id: i,
    number: i,
    correct_index: correct,
    kk: {
      question: ruRes.nextQuestion,
      options: kkRes.options
    },
    ru: {
      question: ruQuestion,
      options: ruRes.options
    },
    en: {
      question: kkRes.nextQuestion,
      options: enRes.options
    }
  });
}

fs.writeFileSync('questions.json', JSON.stringify(allQuestions, null, 2), 'utf-8');
console.log(`Saved questions.json successfully! Total: ${allQuestions.length} questions.`);
