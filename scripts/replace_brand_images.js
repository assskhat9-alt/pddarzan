import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\marat\\.gemini\\antigravity\\brain\\6b98f3b3-e0f9-4364-a352-1520201b30cf';
const brandDir = 'public/images/brand';

const map = {
  'hero-girl.jpg': 'brand_hero_girl_1791916651515.jpg',
  'car-moto.jpg': 'brand_car_moto_1791916678082.jpg',
  'driver-man.jpg': 'brand_driver_man_1791916700403.jpg',
  'wheel.jpg': 'brand_wheel_1791916719334.jpg',
  'driver-woman.jpg': 'brand_driver_woman_1791916739755.jpg',
  'student.jpg': 'brand_student_result_1791916760298.jpg',
  'fleet.jpg': 'brand_fleet_1791916778867.jpg'
};

for (const [destName, srcName] of Object.entries(map)) {
  const srcPath = path.join(brainDir, srcName);
  const destPath = path.join(brandDir, destName);
  if (!fs.existsSync(srcPath)) {
    console.error(`Source not found: ${srcPath}`);
    continue;
  }
  fs.copyFileSync(srcPath, destPath);
  const stat = fs.statSync(destPath);
  console.log(`Replaced ${destName} -> ${(stat.size / 1024).toFixed(1)} KB`);
}

console.log('All brand images replaced successfully.');
