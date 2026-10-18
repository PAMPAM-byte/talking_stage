import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspectImage } from '../lib/backend/inspect-image.ts';

const roster = JSON.parse(await readFile('docs/cast-50/youth-rework.json', 'utf8'));
const prompts = JSON.parse(await readFile('docs/cast-50/youth-photo-prompts.json', 'utf8'));
const photos = {};
for (const c of roster.characters.filter(c => c.appearance)) {
    for (const slot of ['portrait', 'gallery']) {
        const id = `${c.key}-${slot}`;
        const review = prompts.photos[id];
        assert.equal(review.visualReview, 'passed', `${id}: visual review required`);
        const original = `docs/cast-50/youth-assets/${id}.png`;
        const bytes = await readFile(original);
        const inspected = await inspectImage(bytes);
        const publicAssetId = `${id}-youth-v1`;
        const publicPath = `public/images/characters/${publicAssetId}.webp`;
        await writeFile(publicPath, inspected.original);
        photos[id] = { key: c.key, slot, original, publicAssetId, publicPath,
            sourceHash: createHash('sha256').update(bytes).digest('hex'),
            normalizedHash: createHash('sha256').update(inspected.original).digest('hex'),
            width: inspected.width, height: inspected.height, prompt: review.prompt,
            reference: slot === 'gallery' ? `docs/cast-50/youth-assets/${c.key}-portrait.png` : null,
            visualReview: 'passed', review: review.review };
    }
}
assert.equal(Object.keys(photos).length, 20);
await writeFile('docs/cast-50/youth-images.json', JSON.stringify({ version: 1, tool: 'built-in image_gen', photos }, null, 2) + '\n');
console.log('Prepared 20 visually reviewed, decoded and normalized replacement images for ten adult identities. No services contacted.');
