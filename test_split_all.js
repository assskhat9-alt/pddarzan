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
    qTexts[currentQ] += '\n' + p;
  }
});

function parseOneQuestion(raw, qNum) {
  // Remove header
  let body = raw.replace(/Вопрос\s*№?\s*\d+/i, '').trim();
  
  // Find the positions of the three "1." markers
  // Option 1 regex
  const oneRegex = /(?:^|\n)\s*1[\.\)]\s*/g;
  const ones = [...body.matchAll(oneRegex)];
  
  if (ones.length !== 3) {
    return { error: `Found ${ones.length} occurrences of "1." for Q${qNum}` };
  }
  
  // 1. Russian question is from 0 to ones[0].index
  const ruQuestion = body.substring(0, ones[0].index).trim();
  
  // 2. Between ones[0].index and ones[1].index:
  // There are Russian options, followed by the Kazakh question.
  // How to separate Russian options from Kazakh question:
  // Russian options start at ones[0].index.
  // Let's find all numbered options in body.substring(ones[0].index, ones[1].index):
  const ruBlock = body.substring(ones[0].index, ones[1].index);
  const ruOptionMatches = [...ruBlock.matchAll(/(?:^|\n)\s*(\d+)[\.\)]\s*/g)];
  
  // The last Russian option starts at ruOptionMatches[ruOptionMatches.length - 1].index
  // After this option, the text contains the option content, and then the Kazakh question begins.
  // An option typically ends with ';', '.', or '*'.
  // Kazakh question text starts on the next line!
  const lastRuOptMatch = ruOptionMatches[ruOptionMatches.length - 1];
  const lastRuOptStartIndex = lastRuOptMatch.index;
  const lastRuOptAndKkText = ruBlock.substring(lastRuOptStartIndex);
  
  // Let's split lastRuOptAndKkText by lines
  const lines = lastRuOptAndKkText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  // line 0 starts with the option number, e.g. "3. ..." or "4. ..."
  let lastRuOptLines = [lines[0]];
  let kkQLines = [];
  let foundEnd = false;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Check if the previous line ended with a terminal punctuation: ; or . or * or ;*
    const prevEnded = /[\.;\*]\s*$/.test(lastRuOptLines[lastRuOptLines.length - 1]);
    if (prevEnded && !foundEnd) {
      foundEnd = true;
    }
    
    if (!foundEnd) {
      lastRuOptLines.push(line);
    } else {
      kkQLines.push(line);
    }
  }
  
  const kkQuestion = kkQLines.join(' ').trim();
  
  // Similarly for between ones[1].index and ones[2].index:
  // Kazakh options + English question
  const kkBlock = body.substring(ones[1].index, ones[2].index);
  const kkOptionMatches = [...kkBlock.matchAll(/(?:^|\n)\s*(\d+)[\.\)]\s*/g)];
  const lastKkOptMatch = kkOptionMatches[kkOptionMatches.length - 1];
  const lastKkOptAndEnText = kkBlock.substring(lastKkOptMatch.index);
  
  const kkLines = lastKkOptAndEnText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let lastKkOptLines = [kkLines[0]];
  let enQLines = [];
  let foundKkEnd = false;
  
  for (let i = 1; i < kkLines.length; i++) {
    const line = kkLines[i];
    const prevEnded = /[\.;\*]\s*$/.test(lastKkOptLines[lastKkOptLines.length - 1]);
    if (prevEnded && !foundKkEnd) {
      foundKkEnd = true;
    }
    
    if (!foundKkEnd) {
      lastKkOptLines.push(line);
    } else {
      enQLines.push(line);
    }
  }
  
  const enQuestion = enQLines.join(' ').trim();
  
  // And English block is from ones[2].index to end
  const enBlock = body.substring(ones[2].index);
  
  return {
    qNum,
    ruQuestion,
    kkQuestion,
    enQuestion,
    ruOptCount: ruOptionMatches.length,
    kkOptCount: kkOptionMatches.length
  };
}

let errorCount = 0;
let emptyKkCount = 0;
let emptyEnCount = 0;

for (let i = 1; i <= 1103; i++) {
  const res = parseOneQuestion(qTexts[i], i);
  if (res.error) {
    console.log(res.error);
    errorCount++;
  } else {
    if (!res.kkQuestion) {
      emptyKkCount++;
      if (emptyKkCount <= 3) console.log('Empty KK Q:', i, qTexts[i].substring(0, 300));
    }
    if (!res.enQuestion) {
      emptyEnCount++;
      if (emptyEnCount <= 3) console.log('Empty EN Q:', i);
    }
  }
}

console.log(`Total checked: 1103 | Errors: ${errorCount} | Empty KK: ${emptyKkCount} | Empty EN: ${emptyEnCount}`);
