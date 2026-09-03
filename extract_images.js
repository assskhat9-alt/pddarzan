import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const imagesDir = path.resolve('public/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Load q_to_page mapping
const qToPage = JSON.parse(fs.readFileSync('q_to_page.json', 'utf-8'));
const pageToQ = {};
for (const [qNum, pageNum] of Object.entries(qToPage)) {
  pageToQ[pageNum] = parseInt(qNum);
}

async function extractAllImages() {
  console.log('Reading PDF for image extraction...');
  const buffer = fs.readFileSync('./Тесты_ПДД.pdf');
  const uint8 = new Uint8Array(buffer);
  
  console.log('Loading PDF parser...');
  const parser = new PDFParse(uint8);
  await parser.load();
  
  const totalPages = 1105;
  const batchSize = 100;
  let savedImagesCount = 0;
  
  console.log(`Starting image extraction in batches of ${batchSize}...`);
  
  for (let start = 1; start <= totalPages; start += batchSize) {
    const end = Math.min(start + batchSize - 1, totalPages);
    console.log(`Extracting pages ${start} to ${end}...`);
    
    const res = await parser.getImage({
      first: start,
      last: end,
      imageBuffer: true
    });
    
    for (const page of res.pages) {
      const qNum = pageToQ[page.pageNumber];
      if (!qNum) continue;
      
      if (page.images && page.images.length > 0) {
        // Pick the largest image on the page (the main question illustration)
        let bestImg = page.images[0];
        for (const img of page.images) {
          if (img.width * img.height > bestImg.width * bestImg.height) {
            bestImg = img;
          }
        }
        
        // Only save if it has a reasonable size (e.g. width >= 100 and height >= 100)
        if (bestImg.width >= 100 && bestImg.height >= 100 && bestImg.data && bestImg.data.length > 0) {
          const outPath = path.join(imagesDir, `q_${qNum}.png`);
          fs.writeFileSync(outPath, Buffer.from(bestImg.data));
          savedImagesCount++;
        }
      }
    }
  }
  
  console.log(`Finished! Successfully saved ${savedImagesCount} question images to ${imagesDir}`);
}

extractAllImages().catch(err => {
  console.error('Extraction error:', err);
  process.exit(1);
});
