import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { loadRoster } from './build-cast-roster.mjs';

const pack = await loadRoster();
const existing = JSON.parse(await readFile('docs/cast-50/existing-identities.json', 'utf8'));
const images = JSON.parse(await readFile('docs/cast-50/image-generation.json', 'utf8'));
const details = JSON.parse(await readFile('lib/mock/character-photo-details.json', 'utf8'));
const cast = [];
for (const c of pack.characters) {
    const previous = existing.find(row => row.id === c.key);
    const portraitAssetId = previous?.portraitAssetId ?? `${c.key}-portrait`;
    const galleryAssetIds = previous?.galleryAssetIds ?? [`${c.key}-gallery`];
    for (const [index, id] of [portraitAssetId, ...galleryAssetIds].entries()) {
        if (c.origin === 'new_draft') {
            const record = images.photos[id];
            assert(record?.key === c.key && record.visualReview === 'passed', `${id}: visual review required before frontend inclusion.`);
        }
        const file = `public/images/characters/${id}.webp`;
        const bytes = await readFile(file);
        const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
        assert.equal(metadata.format, 'webp');
        assert(metadata.width >= 256 && metadata.height >= 256);
        await sharp(bytes).raw().toBuffer();
        details[id] ??= { altText: `${c.profile.name}, ${c.profile.age}, a fictional adult AI character in a ${index === 0 ? 'portrait' : 'lifestyle photograph'}.`, focalPoint: { x: 0.5, y: index === 0 ? 0.32 : 0.4 } };
    }
    // Explicit public DTO projection: private voice/relationship/backstory data
    // must never enter the browser catalogue or the marketing page bundle.
    cast.push({ id: c.key, ...c.profile, bioSnippet: c.profile.bio, aiLabel: 'Fictional AI character', portraitAssetId, galleryAssetIds, availability: { chat: true, photos: true } });
}
assert.equal(cast.length, 50);
for (const [path, data] of [['lib/mock/public-cast.json', cast], ['lib/mock/character-photo-details.json', details]]) {
    const expected = JSON.stringify(data, null, 2) + '\n';
    if (process.argv.includes('--check')) assert.equal(await readFile(path, 'utf8'), expected, `${path} is stale.`);
    else await writeFile(path, expected);
}
console.log('Frontend catalogue validated: 50 public profiles, 100 decoded owned photos, no private directions.');
