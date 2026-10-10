import {readFile, writeFile, access} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const root='docs/cast-expansion';
const catalog=JSON.parse(await readFile(`${root}/characters.json`,'utf8'));
let previousPrompts=[];
try{previousPrompts=JSON.parse(await readFile(`${root}/image-prompts.json`,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
assert.equal(catalog.characters.length,14);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prompts=[];
let images=0;
const cards=await Promise.all(catalog.characters.map(async c=>{
 assert.match(c.key,/^char-[a-z-]+$/);
 const photos=await Promise.all(['portrait','gallery'].map(async slot=>{
  const file=c.currentPhotos?.[slot]??`assets/${c.key}-${slot}.png`;
  try{await access(`${root}/${file}`);}catch(error){if(error.code!=='ENOENT')throw error;return `<div class="pending">${escape(slot)} pending</div>`;}
  const info=await sharp(`${root}/${file}`).metadata();
  assert(info.width>=640&&info.height>=640,`Insufficient resolution: ${file}`);
  images++;
  return `<a href="${file}"><img src="${file}" alt="Generated ${escape(slot)} of fictional adult ${escape(c.profile.name)}" loading="lazy" width="${info.width}" height="${info.height}"></a>`;
 }));
 prompts.push({key:c.key,portrait:`Photorealistic editorial portrait of fictional adult Nigerian ${c.profile.name}, ${c.profile.age}, ${c.profile.occupation}. ${c.appearance} Vertical 3:4, natural light, authentic skin texture, fully clothed, no celebrity resemblance, text or logos.`,gallery:`Preserve the exact adult face, hairstyle, age and body type in ${c.key}-portrait.png. ${c.galleryScene} Photorealistic vertical 3:4 editorial lifestyle photo, natural skin, fully clothed, no text or logos.`,reference:`assets/${c.key}-portrait.png`,tool:'Built-in image_gen'});
 return `<article><div class="photos">${photos.join('')}</div><div class="copy"><p class="eyebrow">${escape(c.profile.fictionalLocation)} · ${c.profile.age} · ${escape(c.profile.gender)}</p><h2>${escape(c.profile.name)}</h2><p class="role">${escape(c.profile.occupation)}</p><blockquote>${escape(c.profile.conversationClue)}</blockquote><p>${escape(c.profile.bio)}</p><p class="tags">${c.profile.personalityTags.map(escape).join(' · ')}</p><details><summary>Appearance and conversation direction</summary><p>${escape(c.appearance)}</p><p>${escape(c.voice)}</p><p>${escape(c.pace)}</p></details></div></article>`;
}));
// Keep the generation record when later editorial choices change a profile age.
const promptOrder=new Map((previousPrompts.length?previousPrompts:catalog.characters).map((c,index)=>[c.key,index]));
await writeFile(`${root}/image-prompts.json`,JSON.stringify(prompts.sort((a,b)=>promptOrder.get(a.key)-promptOrder.get(b.key)).map(prompt=>({...prompt,...previousPrompts.find(previous=>previous.key===prompt.key),assignedProfileAge:catalog.characters.find(c=>c.key===prompt.key).profile.age})),null,2)+'\n');
await writeFile(`${root}/review.html`,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TalkingStage · Expanded cast review</title><style>
:root{color-scheme:light;--canvas:#FAF8FA;--ink:#241C23;--muted:#716570;--plum:#682447;--border:#E8DFE6;--rose:#F5EAF0}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:16px/1.6 Arial,sans-serif}header,main{max-width:1200px;margin:auto;padding:32px 20px}header{padding-bottom:12px}h1,h2{font-family:Georgia,serif;line-height:1.15}h1{font-size:clamp(32px,5vw,52px);margin:8px 0 20px}h2{font-size:30px;margin:4px 0 8px}.eyebrow,.role,.tags{color:var(--plum)}.eyebrow{font-size:13px;letter-spacing:.04em}.notice{padding:16px 20px;background:var(--rose);border-radius:16px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}article{overflow:hidden;background:white;border:1px solid var(--border);border-radius:22px}.photos{display:grid;grid-template-columns:1fr 1fr;gap:3px}.photos img{display:block;width:100%;height:auto;aspect-ratio:3/4;object-fit:cover}.copy{padding:24px}blockquote{margin:20px 0;padding:0 0 0 14px;border-left:3px solid var(--plum);color:var(--plum)}.pending{aspect-ratio:3/4;background:var(--rose);display:grid;place-items:center;color:var(--muted)}details{border-top:1px solid var(--border);padding-top:16px}summary{cursor:pointer;color:var(--plum)}a:focus-visible,summary:focus-visible{outline:3px solid var(--plum);outline-offset:3px}@media(max-width:700px){main{grid-template-columns:1fr;padding-top:16px}header,main{padding-left:16px;padding-right:16px}}
</style><header><p class="eyebrow">TalkingStage · Cast expansion · 10 October 2026</p><h1>Fourteen different people.<br>Fourteen ways to connect.</h1><p>Fictional adult characters with distinct faces, ages, careers, body types and hairstyles.</p><p class="notice">Published locally. ${images}/28 generated photos available. Fictional ages and neighbourhoods accompany the reviewed profiles. Select a photo to inspect it at full resolution.</p></header><main>${cards.join('')}</main></html>`);
console.log(`Review built: fourteen profiles, ${images}/28 inspected images.`);
