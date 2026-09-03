import fs from 'fs';

const text = fs.readFileSync('full_text.txt', 'utf-8');

// Find all occurrences of "Вопрос №"
const matches = [...text.matchAll(/Вопрос\s*№?\s*(\d+)/gi)];
console.log('Total "Вопрос" matches found:', matches.length);
if (matches.length > 0) {
  console.log('First match:', matches[0][0]);
  console.log('Last match:', matches[matches.length - 1][0]);
}

// Check how pages or questions are delimited
const pages = text.split(/--\s*\d+\s*of\s*\d+\s*--/);
console.log('Total pages split by footer:', pages.length);

for (let i = 0; i < Math.min(5, pages.length); i++) {
  console.log(`\n--- PAGE ${i + 1} SAMPLE ---`);
  console.log(pages[i].trim().substring(0, 300));
}
