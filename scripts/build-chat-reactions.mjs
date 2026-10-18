import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { reactions } from '../lib/chat/expressions.ts';
// Original vector artwork, rendered locally. No third-party media or tracking.
const folder = new URL('../public/chat-reactions/', import.meta.url);
await mkdir(folder, { recursive: true });
const heart = (x,y,size=1) => `<path transform="translate(${x} ${y}) scale(${size})" d="M0 5C-12-7-24 11 0 26C24 11 12-7 0 5Z" fill="#cf2445"/>`;
function artwork(id, frame=0) {
  const bounce = Math.sin(frame*Math.PI/4)*4;
  const eyes = id==='love' ? heart(74,53,.65)+heart(116,53,.65) : id==='laugh' || id==='shy' || id==='hug' ? '<path d="M66 66q9-12 18 0M107 66q9-12 18 0"/>' : id==='side-eye' ? '<path d="M65 60l20 4M106 55l20-6"/><circle cx="79" cy="70" r="3" fill="#392331"/><circle cx="119" cy="65" r="3" fill="#392331"/>' : '<ellipse cx="76" cy="65" rx="4" ry="7" fill="#392331"/><ellipse cx="116" cy="65" rx="4" ry="7" fill="#392331"/>';
  const mouth = id==='shocked' ? '<ellipse cx="96" cy="92" rx="10" ry="14" fill="#392331"/>' : id==='side-eye' ? '<path d="M87 95h20"/>' : id==='laugh' ? '<path d="M73 83q23 39 46 0Z" fill="#392331"/><path d="M86 102q10-8 20 0" stroke="#ee6e88"/>' : '<path d="M80 89q16 18 32 0"/>';
  const extras = id==='love' || id==='hug' ? heart(31,68,.55)+heart(156,28,.6) : id==='celebrate' ? '<path d="M16 35l8 8m138 25 10-5M41 121l-5 8m122-17 7 7" stroke="#cf2445"/><path d="m72 31 18-25 19 25Z" fill="#cf2445" stroke="white"/>' : id==='wave' ? `<g transform="rotate(${bounce*4} 145 85)"><path d="M142 100V68q1-9 7-3l3 14V58q3-8 7 0v20l3-18q5-6 7 1l-2 22 5-10q6-4 7 3l-9 28q-13 12-28-4" fill="#d68b5b" stroke="white" stroke-width="3"/></g>` : id==='laugh' ? '<path d="M50 70q-13 18-2 19q12-1 2-19M140 70q-10 18 1 19q12-1-1-19" fill="#78c4df" stroke="white"/>' : '';
  const arms = id==='hug' ? '<path d="M49 91q-8 33 41 32l18-8q5-8-3-10l-23 6-19-18M143 91q8 33-41 32l-18-8q-5-8 3-10l23 6 19-18" fill="#f6ba77" stroke="#392331" stroke-width="2.5"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="160" viewBox="0 0 192 160"><g transform="translate(0 ${bounce})" stroke="#392331" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="96" cy="134" rx="45" ry="5" fill="#ead8de" stroke="none"/><circle cx="96" cy="75" r="53" fill="#f6ba77" stroke="white" stroke-width="8"/><circle cx="96" cy="75" r="49" fill="#f6ba77" stroke="#392331" stroke-width="2.5"/><ellipse cx="64" cy="84" rx="10" ry="5" fill="#e98c87" stroke="none"/><ellipse cx="128" cy="84" rx="10" ry="5" fill="#e98c87" stroke="none"/>${eyes}${mouth}${extras}${arms}</g></svg>`;
}
for (const reaction of reactions) {
  await writeFile(new URL(`${reaction.id}.svg`,folder),artwork(reaction.id));
  const frames=[];
  for(let index=0;index<8;index++)frames.push(await sharp(Buffer.from(artwork(reaction.id,index))).ensureAlpha().raw().toBuffer());
  await sharp(Buffer.concat(frames),{raw:{width:192,height:160*8,channels:4,pageHeight:160}}).gif({delay:140,loop:2,colours:64}).toFile(fileURLToPath(new URL(`${reaction.id}.gif`,folder)));
}
console.log('Built eight original sticker SVGs and eight animated GIFs; each animation stops within five seconds.');
