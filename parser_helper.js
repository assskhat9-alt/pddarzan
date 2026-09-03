import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');
const qRegex = /Вопрос\s*№?\s*(\d+)[\r\n]+([\s\S]*?)(?=(?:Вопрос\s*№?\s*\d+|$))/g;

function parseBlock(blockText) {
  // blockText contains a Question and its numbered options (1. ..., 2. ..., etc.)
  // Let's find all numbered options like "\n1. ", "\n2. ", etc.
  const optMatches = [...blockText.matchAll(/(?:^|\n)\s*(\d+)[\.\)]\s*/g)];
  if (optMatches.length === 0) return null;
  
  const question = blockText.substring(0, optMatches[0].index).trim();
  const options = [];
  let correctIndex = -1;
  
  for (let i = 0; i < optMatches.length; i++) {
    const start = optMatches[i].index + optMatches[i][0].length;
    const end = (i + 1 < optMatches.length) ? optMatches[i + 1].index : blockText.length;
    let optContent = blockText.substring(start, end).trim();
    
    // Check if contains asterisk *
    const isCorrect = optContent.includes('*');
    if (isCorrect) {
      correctIndex = i;
    }
    // Clean asterisks, trailing semicolons/dots if desired or keep clean
    const cleaned = optContent.replace(/\*/g, '').replace(/[\s;]+$/, '').trim();
    options.push({
      text: cleaned,
      isCorrect
    });
  }
  
  return { question, options, correctIndex };
}

function parseAllQuestions() {
  let m;
  let successCount = 0;
  let failCount = 0;
  
  while ((m = qRegex.exec(text)) !== null) {
    const qNum = parseInt(m[1]);
    let body = m[2];
    // Remove footer like "-- 1 of 1105 --"
    body = body.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
    
    // Find all occurrences of 1.
    const ones = [...body.matchAll(/(?:^|\n)\s*1[\.\)]\s*/g)];
    if (ones.length !== 3) {
      console.log(`Q${qNum} does not have 3 '1.' (has ${ones.length})`);
      failCount++;
      continue;
    }
    
    // Split into 3 chunks:
    // RU is from 0 to where KK question starts
    // KK is from where KK question starts to where EN question starts
    // EN is from where EN question starts to end
    
    // Let's find where EN starts: EN question starts with Latin letters [A-Z]
    // Between ones[1].index (KK options) and ones[2].index (EN options), there is the EN question!
    // Let's find the start of EN question: the first Latin letter on a line before ones[2].index
    const kkToEnChunk = body.substring(ones[1].index, ones[2].index);
    // In kkToEnChunk, the last KK option ends, and then EN question begins!
    // EN question starts with an English capital letter: /^[A-Z][a-zA-Z\s]/m
    const enMatch = kkToEnChunk.match(/\n\s*([A-Za-z][A-Za-z0-9\s\W]*)$/);
    
    // Let's test a simple split by looking for the transition from KK options to EN question:
    // Every line in kkToEnChunk that starts with English words like "What", "In ", "Is ", "Are ", "Which ", "Where ", "When ", "According ", "Does ", "Can ", "How ", "The ", "At ", "If ", etc.
  }
}

console.log('Parser test script created.');
