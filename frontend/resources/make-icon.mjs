import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./resources/icon.svg');
await sharp(svg).resize(1024, 1024).png().toFile('./resources/icon.png');
console.log('✅ icon.png created (1024x1024)');
