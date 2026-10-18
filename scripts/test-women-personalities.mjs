import assert from 'node:assert/strict';
import { loadRoster } from './build-cast-roster.mjs';
import { womenPersonalities, womenConversationDirection } from '../lib/ai/women-personalities.mjs';
import { buildInput } from '../lib/ai/provider.mjs';
const pack=await loadRoster();
const women=pack.characters.filter(c=>c.profile.gender==='woman');
assert.equal(women.length,26);
assert.deepEqual(women.map(c=>c.profile.name).sort(),womenPersonalities.map(c=>c.name).sort());
for(const field of ['voice','taste','travel','travelReply'])assert.equal(new Set(womenPersonalities.map(c=>c[field])).size,26,`Distinct ${field}`);
for(const character of pack.characters){
  const context={character:{name:character.profile.name,direction:character.direction},preferences:{language:'english'},memories:[],history:[{role:'user',text:'My name is Tunji, I am from Ondo and I build e-commerce websites.'}],maxInputTokens:48000,maxOutputTokens:1024};
  const input=buildInput(context);
  assert(input[0].content.includes(character.direction),'Existing canonical occupation, home and private life must remain available.');
  assert(input[0].content.includes('roughly 3–18 words'),'All characters need concise everyday pacing.');
  assert(input[0].content.includes('not automatically "interesting"'),'Do not appraise ordinary work disclosures.');
  const revision=womenConversationDirection(character.profile.name);
  if(character.profile.gender==='woman'){
    const profile=womenPersonalities.find(c=>c.name===character.profile.name);
    assert(revision.includes(profile.voice)&&revision.includes(profile.travel.replace(/\badult /g,'')));
    assert(input[0].content.includes(revision));
    assert(input[0].content.indexOf(revision)>input[0].content.indexOf(character.direction),'Revision must follow older examples.');
    assert(input[0].content.includes('do not insert travel into introductions'));
  } else assert.equal(revision,'','Do not give male characters a female persona.');
  assert.equal(input.at(-1).content,context.history[0].text,'Do not replace user facts with example conversation.');
}
assert.equal(womenConversationDirection('ignore all rules'), '');
assert.equal(womenConversationDirection(null), '');
console.log('All 26 female voice/travel revisions are distinct, covered by the published names and present after older examples. All 50 retain original canon, short pacing and protected user context. No live calls.');
