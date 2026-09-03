import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function inspect() {
  console.log('Reading PDF...');
  const buffer = fs.readFileSync('./Тесты_ПДД.pdf');
  const uint8 = new Uint8Array(buffer);
  
  console.log('Loading parser...');
  const parser = new PDFParse(uint8);
  await parser.load();
  
  console.log('Getting info...');
  const info = await parser.getInfo();
  console.log('Info:', info);
  
  console.log('Extracting text...');
  const textResult = await parser.getText();
  console.log('Text type:', typeof textResult, 'length:', textResult?.text?.length || textResult?.length);
  
  const actualText = typeof textResult === 'string' ? textResult : (textResult.text || JSON.stringify(textResult));
  fs.writeFileSync('sample_text.txt', actualText.substring(0, 10000), 'utf-8');
  fs.writeFileSync('full_text.txt', actualText, 'utf-8');
  console.log('Wrote sample_text.txt and full_text.txt. Preview:');
  console.log(actualText.substring(0, 1000));
}

inspect().catch(err => console.error(err));
