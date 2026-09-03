import fs from 'fs';
import path from 'path';

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));

console.log('--- 1. OPTION COUNT DISTRIBUTION ---');
const optCounts = {};
const correctDist = {};
let uncleanedAsterisks = 0;
let questionsWithoutQMark = 0;

for (const q of questions) {
  const count = q.kk.options.length;
  optCounts[count] = (optCounts[count] || 0) + 1;
  correctDist[q.correct_index] = (correctDist[q.correct_index] || 0) + 1;

  for (const opt of q.kk.options) {
    if (opt.includes('*')) uncleanedAsterisks++;
  }
  for (const opt of q.ru.options) {
    if (opt.includes('*')) uncleanedAsterisks++;
  }
  for (const opt of q.en.options) {
    if (opt.includes('*')) uncleanedAsterisks++;
  }

  if (!q.kk.question.includes('?') && !q.kk.question.includes(':') && !q.kk.question.endsWith('.')) {
    questionsWithoutQMark++;
  }
}

console.log('Options count distribution:', optCounts);
console.log('Correct index distribution (0-based):', correctDist);
console.log('Uncleaned asterisks in options:', uncleanedAsterisks);
console.log('Questions without standard ending:', questionsWithoutQMark);

console.log('\n--- 2. IMAGE INTEGRITY CHECK ---');
const imagesDir = path.resolve('public/images');
const imageFiles = fs.readdirSync(imagesDir);
console.log(`Total image files in public/images: ${imageFiles.length}`);

let zeroByteImages = 0;
let validImages = 0;
for (const file of imageFiles) {
  const stat = fs.statSync(path.join(imagesDir, file));
  if (stat.size === 0) zeroByteImages++;
  else validImages++;
}
console.log(`Valid images (>0 bytes): ${validImages} | Corrupted/0-byte: ${zeroByteImages}`);

console.log('\n--- 3. SAMPLE SPOT-CHECKS (Detailed view) ---');
const sampleIds = [1, 150, 450, 800, 1103];
for (const id of sampleIds) {
  const q = questions.find(item => item.id === id);
  console.log(`\n================ QUESTION ${id} ================`);
  console.log(`[KK Question]: ${q.kk.question}`);
  q.kk.options.forEach((opt, idx) => {
    const isCorrect = idx === q.correct_index;
    console.log(`   ${idx + 1}. ${opt} ${isCorrect ? '<<< [ДҰРЫС ЖАУАП]' : ''}`);
  });
  console.log(`[RU Question]: ${q.ru.question.replace(/\n/g, ' ')}`);
  console.log(`[Correct Index]: ${q.correct_index} (Нұсқа № ${q.correct_index + 1})`);
  console.log(`[Has Image]: ${fs.existsSync(path.join(imagesDir, `q_${id}.png`))}`);
}
