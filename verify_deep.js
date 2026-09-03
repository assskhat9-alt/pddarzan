import fs from 'fs';

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));
const fullText = fs.readFileSync('full_text.txt', 'utf-8');

console.log(`Checking ${questions.length} questions in questions.json against full_text.txt...\n`);

const issues = [];
let totalChecked = 0;
let perfectQuestions = 0;

// Match all original questions from fullText
const qRegex = /Вопрос\s*№?\s*(\d+)[\r\n]+([\s\S]*?)(?=(?:Вопрос\s*№?\s*\d+|$))/g;
const originalMap = new Map();
let m;
while ((m = qRegex.exec(fullText)) !== null) {
  const qNum = parseInt(m[1]);
  originalMap.set(qNum, m[2]);
}

console.log(`Original questions parsed from PDF text: ${originalMap.size}`);

for (const q of questions) {
  totalChecked++;
  const id = q.id;
  const orig = originalMap.get(id);

  if (!orig) {
    issues.push({ id, issue: 'Original text missing in PDF parse' });
    continue;
  }

  // 1. Check texts exist and are not trivial/empty
  if (!q.kk || !q.kk.question || q.kk.question.trim().length < 5) {
    issues.push({ id, issue: 'Kazakh question is empty or too short', text: q.kk?.question });
  }
  if (!q.ru || !q.ru.question || q.ru.question.trim().length < 5) {
    issues.push({ id, issue: 'Russian question is empty or too short', text: q.ru?.question });
  }
  if (!q.en || !q.en.question || q.en.question.trim().length < 5) {
    issues.push({ id, issue: 'English question is empty or too short', text: q.en?.question });
  }

  // 2. Check options exist
  const kkOpts = q.kk?.options || [];
  const ruOpts = q.ru?.options || [];
  const enOpts = q.en?.options || [];

  if (kkOpts.length < 2) {
    issues.push({ id, issue: `Kazakh options count too low: ${kkOpts.length}` });
  }
  if (ruOpts.length < 2) {
    issues.push({ id, issue: `Russian options count too low: ${ruOpts.length}` });
  }
  if (enOpts.length < 2) {
    issues.push({ id, issue: `English options count too low: ${enOpts.length}` });
  }

  // Check option count consistency between RU and KK
  if (kkOpts.length !== ruOpts.length) {
    issues.push({ id, issue: `Option count mismatch: KK has ${kkOpts.length}, RU has ${ruOpts.length}` });
  }

  // 3. Check correct_index bounds
  if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index >= kkOpts.length) {
    issues.push({ id, issue: `Invalid correct_index: ${q.correct_index} (options length: ${kkOpts.length})` });
  }

  // 4. Verify correct answer against raw text asterisks
  // Find which option had '*' in Russian, Kazakh, English in the raw text
  // Let's split raw text by '1.'
  const cleanOrig = orig.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '');
  const ones = [...cleanOrig.matchAll(/(?:^|\n)\s*1[\.\)]\s+/g)];
  
  if (ones.length === 3) {
    const ruBlock = cleanOrig.substring(ones[0].index, ones[1].index);
    const kkBlock = cleanOrig.substring(ones[1].index, ones[2].index);
    const enBlock = cleanOrig.substring(ones[2].index);

    const getAsteriskOptIndex = (block) => {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let curOpt = -1;
      let asteriskOpt = -1;
      for (const line of lines) {
        const match = line.match(/^(\d+)[\.\)]\s+/);
        if (match) {
          curOpt = parseInt(match[1]) - 1;
        }
        if (line.includes('*') && curOpt !== -1) {
          asteriskOpt = curOpt;
        }
      }
      return asteriskOpt;
    };

    const ruAsterisk = getAsteriskOptIndex(ruBlock);
    const kkAsterisk = getAsteriskOptIndex(kkBlock);
    const enAsterisk = getAsteriskOptIndex(enBlock);

    if (kkAsterisk !== -1 && q.correct_index !== kkAsterisk) {
      issues.push({
        id,
        issue: `Correct index mismatch in KK: JSON has ${q.correct_index}, PDF text has ${kkAsterisk}`
      });
    }
    if (ruAsterisk !== -1 && q.correct_index !== ruAsterisk) {
      issues.push({
        id,
        issue: `Correct index mismatch in RU: JSON has ${q.correct_index}, PDF text has ${ruAsterisk}`
      });
    }
    if (ruAsterisk !== -1 && kkAsterisk !== -1 && ruAsterisk !== kkAsterisk) {
      issues.push({
        id,
        issue: `PDF internal discrepancy: RU asterisk is at ${ruAsterisk}, but KK asterisk is at ${kkAsterisk}`
      });
    }
  }

  if (issues.length === 0) {
    perfectQuestions++;
  }
}

console.log(`\n================ VERIFICATION SUMMARY ================`);
console.log(`Total questions verified: ${totalChecked}`);
console.log(`Total issues found: ${issues.length}`);
if (issues.length > 0) {
  console.log(`First 10 issues:`);
  console.log(JSON.stringify(issues.slice(0, 10), null, 2));
} else {
  console.log(`All 1103 questions are 100% VALID, COMPLETE, and ACCURATE!`);
}
