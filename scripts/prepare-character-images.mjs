import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const [id, source] = process.argv.slice(2);
if (!/^char-[a-z]+$/.test(id ?? '') || !source) throw new Error('Provide character ID and source diptych path.');
await mkdir('public/images/characters', { recursive: true });
const { width, height } = await sharp(source).metadata();
const half = Math.floor(width / 2);
for (const [index, kind] of ['portrait', 'gallery'].entries()) {
  await sharp(source).extract({ left: index * half, top: 0, width: half, height }).resize({ width: 768, withoutEnlargement: true }).webp({ quality: 85 }).toFile(`public/images/characters/${id}-${kind}.webp`);
}
console.log(`Prepared ${id} portrait/gallery WebP images.`);
