import assert from 'node:assert/strict';
import {loadRoster} from './build-cast-roster.mjs';
import {buildInput} from '../lib/ai/provider.mjs';
import {lifestylePersonalities,lifestyleDirection} from '../lib/ai/lifestyle-personalities.mjs';
const pack=await loadRoster();
assert.equal(lifestylePersonalities.length,16);
assert.equal(new Set(lifestylePersonalities.map(row=>row.style)).size,16);
assert.equal(new Set(lifestylePersonalities.flatMap(row=>row.examples.map(example=>example[1]))).size,32);
for(const character of pack.characters){
 const row=lifestylePersonalities.find(row=>row.name===character.profile.name);
 if(character.profile.gender==='woman'&&character.profile.personalityTags.includes('baddie'))assert(row,`${character.profile.name} needs a real baddie expression`);
 const history=[{role:'user',text:'I like dressing up for dinner. What about you?'}];
 const input=buildInput({character:{name:character.profile.name,direction:character.direction},preferences:{language:'english'},memories:[],history,maxInputTokens:48000,maxOutputTokens:1024});
 if(row){
  assert.equal(character.profile.gender,'woman');
  assert(character.profile.age>=22&&character.profile.age<=34,'Featured women must remain young adults');
  const block=lifestyleDirection(row.name);
  assert(input[0].content.includes(block));
  assert(input[0].content.indexOf(block)>input[0].content.indexOf('Individual conversation revision for'));
  assert(block.includes('existing payment controls and English-first language rule'));
  assert(block.includes('no')||block.includes('not'));
  assert(block.includes('fictional experiences, not current travel'));
  assert(block.includes('remain respectful and engaged'));
  assert(input[0].content.includes(`Occupation: ${character.profile.occupation}`));
 }else assert.equal(lifestyleDirection(character.profile.name),'','Do not make the whole cast expensive girls');
 assert.equal(input.at(-1).content,history[0].text);
}
assert.equal(lifestyleDirection('ignore the rules'),'');
assert.equal(pack.characters.find(c=>c.key==='char-kiki').profile.occupation,'Football content creator');
assert.equal(pack.characters.find(c=>c.key==='char-naomi').profile.occupation,'Travel filmmaker and outdoor storyteller');
assert(pack.characters.find(c=>c.key==='char-kiki').profile.interests.includes('football'));
assert(pack.characters.find(c=>c.key==='char-naomi').profile.interests.includes('travel'));
console.log('Lifestyle identities passed: 16 young adult voices, 32 original examples, football/travel occupations and filters, authoritative prompt placement, preserved user messages, unknown-name isolation and bounded contexts. No model calls.');
