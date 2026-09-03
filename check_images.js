import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function checkImages() {
  const buffer = fs.readFileSync('./Тесты_ПДД.pdf');
  const parser = new PDFParse(new Uint8Array(buffer));
  await parser.load();
  
  console.log('Testing page 1 screenshot or images...');
  // Let's check parser methods
  try {
    const img1 = await parser.getImage(1);
    console.log('getImage(1):', img1);
  } catch (e) {
    console.log('getImage error:', e.message);
  }
  
  try {
    const screenshot1 = await parser.getScreenshot(1);
    console.log('getScreenshot(1):', screenshot1 ? 'Got screenshot buffer/data' : 'null');
    if (screenshot1) {
      fs.writeFileSync('page1_screenshot.png', screenshot1);
      console.log('Saved page1_screenshot.png');
    }
  } catch (e) {
    console.log('getScreenshot error:', e.message);
  }
}

checkImages().catch(console.error);
