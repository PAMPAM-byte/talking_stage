import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const castPath='lib/mock/public-cast.json';
const cast=JSON.parse(await readFile(castPath,'utf8'));
const plan=JSON.parse(await readFile('docs/character-photo-refresh/prompts.json','utf8'));
// This applies the original batch; never overwrite a later owner-requested revision.
for(const p of plan){const c=cast.find(c=>c.id===p.key);const current=p.slot==='portrait'?c?.portraitAssetId:c?.galleryAssetIds[0];assert([`${p.key}-${p.slot}`,`${p.key}-${p.slot}-v2`].includes(current),'Later photography revision exists; use its reviewed replacement record.');}
const details={};
const captions={
 'char-amara':'browsing vinyl records at a Lagos market', 'char-zainab':'examining architectural drawings on an Abuja site visit',
 'char-ifeoma':'holding her camera while photographing food at an Enugu market', 'char-tomi':'comparing colourful fabric at an Ibadan market',
 'char-tunde':'looking across the lagoon on a Lagos waterfront walk', 'char-chidi':'reaching for a book in his Enugu bookshop',
 'char-seyi':'adjusting an audio mixing desk during an outdoor soundcheck', 'char-idris':'examining a plant at an Abuja nursery',
 'char-adaora':'singing into a microphone during an acoustic open-mic evening', 'char-raymond':'looking across the water from a sailboat deck',
 'char-vivian':'examining ceramics at an outdoor art market in an amber patterned kaftan',
 'char-chief-chukwudi':'laughing in a garden in white traditional clothing and a burgundy cap',
 'char-hon-femi':'walking beside a public garden pond in a burgundy shirt', 'char-nneka':'mid-step during an outdoor dance rehearsal',
 'char-malik':'performing into a handheld microphone on a small stage', 'char-damilola':'collecting food at an evening street-food courtyard',
 'char-dr-aisha':'sketching courtyard arches in a dusty-blue hijab', 'char-emeka':'tying his trainers at a football pitch',
 'char-kunle':'walking through a fruit market carrying a woven bag', 'char-ranti':'opening her salon beneath the Ranti Locs Studio sign',
 'char-zuri':'walking along the beach in blue swimwear and a white wrap, holding coconut water',
 'char-kiki':'examining a handmade mug at an outdoor pottery fair'
};
for(const p of plan){
 const c=cast.find(c=>c.id===p.key);assert(c);
 const id=`${p.key}-${p.slot}-v2`;
 await sharp(p.output).rotate().resize({width:1280,withoutEnlargement:true}).webp({quality:88}).toFile(`public/images/characters/${id}.webp`);
 if(p.slot==='portrait')c.portraitAssetId=id;else c.galleryAssetIds=[id];
 const description=p.slot==='gallery'?captions[p.key]:p.key==='char-seyi'?'in the doorway of his recording studio':'against a sunlit blue wall in Lagos';
 details[id]={altText:`${c.name}, ${c.age}, a fictional adult AI character, ${description}`,focalPoint:{x:0.5,y:p.slot==='portrait'?0.3:0.5}};
}
assert.equal(Object.keys(details).length,24);
await writeFile('lib/mock/character-photo-details.json',JSON.stringify(details,null,2)+'\n');
await writeFile(castPath,JSON.stringify(cast,null,2)+'\n');
const expandedPath='docs/cast-expansion/characters.json';
const expanded=JSON.parse(await readFile(expandedPath,'utf8'));
for(const c of expanded.characters){
 c.currentPhotos={portrait:`assets/${c.key}-portrait.png`,gallery:`../character-photo-refresh/assets/${c.key}-gallery-v2.png`};
 c.galleryScene=plan.find(p=>p.key===c.key&&p.slot==='gallery').scene;
}
await writeFile(expandedPath,JSON.stringify(expanded,null,2)+'\n');
console.log('Preview now uses 24 new versioned WebP URLs with descriptive photo text.');
