import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const cast=JSON.parse(await readFile('lib/mock/public-cast.json','utf8'));
const prompts=JSON.parse(await readFile('docs/character-photo-refresh/prompts.json','utf8'));
assert.equal(prompts.length,24);
// Keep original generation records; reviewed follow-up photos override the current review.
try{
 const revisions=JSON.parse(await readFile('docs/character-photo-refresh/revisions.json','utf8'));
 for(const file of revisions){const revision=JSON.parse(await readFile(`docs/character-photo-refresh/${file}`,'utf8'));assert.equal(revision.status,'reviewed');const index=prompts.findIndex(p=>p.key===revision.key&&p.slot===revision.slot);assert(index>=0);prompts[index]=revision;}
}catch(error){if(error.code!=='ENOENT')throw error;}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=[];
for(const c of cast){
 const images=[];
 for(const slot of ['portrait','gallery']){
  const replacement=prompts.find(p=>p.key===c.id&&p.slot===slot);
  const source=replacement?replacement.output:`public/images/characters/${c.portraitAssetId}.webp`;
  const meta=await sharp(source).metadata();assert(meta.width>=640&&meta.height>=640);
  const path=replacement?replacement.output.replace('docs/character-photo-refresh/',''):`../../${source}`;
  images.push(`<a href="${path}"><img src="${path}" alt="${escape(c.name)} — ${slot}" width="${meta.width}" height="${meta.height}"></a>`);
 }
 cards.push(`<article><h2>${escape(c.name)}, ${c.age}</h2><div class="pair">${images.join('')}</div><p>${escape(prompts.find(p=>p.key===c.id&&p.slot==='gallery').scene)}</p></article>`);
}
await writeFile('docs/character-photo-refresh/review.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TalkingStage photography review</title><style>body{margin:0;background:#FAF8FA;color:#241C23;font:16px/1.5 Arial,sans-serif}header,main{max-width:1200px;margin:auto;padding:24px}h1,h2{font-family:Georgia,serif}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:#fff;border:1px solid #E8DFE6;border-radius:20px;overflow:hidden}h2,p{padding:0 20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:4px}img{display:block;width:100%;height:auto;aspect-ratio:3/4;object-fit:contain;background:#F5EAF0}a:focus-visible{outline:3px solid #682447}p{color:#716570}@media(max-width:700px){main{grid-template-columns:1fr;padding:16px}}</style><header><h1>A portrait. A different moment.</h1><p>22 fictional adults · 24 replacements · identity, activity and background review</p></header><main>${cards.join('')}</main></html>`);
// Inspection-only sheets preserve each entire image for activity/anatomy review.
for(let start=0;start<cast.length;start+=4){
 const batch=cast.slice(start,start+4),layers=[];
 for(let i=0;i<batch.length;i++)for(const [j,slot] of ['portrait','gallery'].entries()){
  const p=prompts.find(p=>p.key===batch[i].id&&p.slot===slot);
  const source=p?p.output:`public/images/characters/${batch[i].portraitAssetId}.webp`;
  layers.push({input:await sharp(source).resize(270,360,{fit:'contain',background:'#fff'}).toBuffer(),left:i*540+j*270,top:0});
 }
 await sharp({create:{width:batch.length*540,height:360,channels:3,background:'#fff'}}).composite(layers).png().toFile(`.local-services/photo-refresh-review-${start}.png`);
}
console.log('24 full-resolution replacements and all 22 pairs decoded; review created.');
