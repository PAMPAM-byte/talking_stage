import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const [key, slot, source] = process.argv.slice(2);
assert(/^char-[a-z]+$/.test(key ?? '') && ['portrait', 'gallery'].includes(slot) && source, 'Provide key, slot and generated PNG path.');
const pack = JSON.parse(await readFile('docs/cast-50/characters.json', 'utf8'));
const character = pack.characters.find(c => c.key === key && c.origin === 'new_draft');
assert(character, 'Only the 28 new identities use this image intake.');
const folder = 'docs/cast-50/assets';
await mkdir(folder, { recursive: true });
const target = `${folder}/${key}-${slot}.png`;
const bytes = await readFile(source);
const hash = createHash('sha256').update(bytes).digest('hex');
const meta = await sharp(bytes, { limitInputPixels: 24_000_000, failOn: 'warning' }).metadata();
assert.equal(meta.format, 'png');
assert(meta.width >= 768 && meta.height >= 1024 && (meta.pages ?? 1) === 1);
await sharp(bytes).raw().toBuffer();
let previous;
try { previous = await readFile(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous) assert.equal(createHash('sha256').update(previous).digest('hex'), hash, 'Do not overwrite a different existing original.');
else if (resolve(source) !== resolve(target)) await copyFile(source, target);
const publicPath = `public/images/characters/${key}-${slot}.webp`;
await sharp(bytes).rotate().resize({ width: 1024, withoutEnlargement: true }).webp({ quality: 88 }).toFile(publicPath);
const manifestPath = 'docs/cast-50/image-generation.json';
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
manifest ??= { version: 1, tool: 'built-in image_gen', photos: {} };
const id = `${key}-${slot}`;
let generationPrompt;
try { generationPrompt = await readFile(`docs/cast-50/prompts/${id}.txt`, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
assert(!manifest.photos[id] || manifest.photos[id].sourceHash === hash, 'Manifest source changed.');
manifest.photos[id] = {
    ...manifest.photos[id], key, slot, original: target, publicPath, sourceHash: hash,
    width: meta.width, height: meta.height,
    prompt: character.photoBriefs.find(p => p.slot === slot).prompt,
    generationPrompt: generationPrompt?.trim() ?? null,
    reference: slot === 'gallery' ? `${folder}/${key}-portrait.png` : null,
    visualReview: manifest.photos[id]?.visualReview ?? 'pending',
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${character.profile.name} ${slot}: original retained; sanitized WebP saved; visual review ${manifest.photos[id].visualReview}.`);
