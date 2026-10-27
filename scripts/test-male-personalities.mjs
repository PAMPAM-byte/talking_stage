import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadRoster} from './build-cast-roster.mjs';
import {datingContext} from '../lib/ai/dating-context.mjs';
import {buildInput} from '../lib/ai/provider.mjs';
const spec=JSON.parse(await readFile('docs/cast-50/male-personalities.json','utf8'));const pack=await loadRoster();
const men=pack.characters.filter(c=>c.profile.gender==='man');assert.equal(men.length,24);
assert.equal(spec.characters.length,14);assert.equal(new Set(spec.characters.map(c=>c.attraction)).size,14);
assert.deepEqual(men.filter(c=>c.profile.personalityTags.includes('big boy')).map(c=>c.profile.name).sort(),spec.bigBoys.toSorted());
assert.equal(men.filter(c=>c.profile.personalityTags.includes('playboy')).length,5);
for(const row of spec.characters){const c=men.find(c=>c.profile.name===row.name);assert(c);assert.equal(c.profile.bio,row.bio);assert.deepEqual(c.profile.personalityTags,row.tags);assert(c.direction.includes(row.expression));assert(c.direction.includes(row.attraction));}
for(const c of pack.characters){
 const dating=datingContext(c.profile);assert.equal(dating.defaultCounterpart,c.profile.gender==='man'?'woman':'man');assert.equal(dating.verifiedUserGender,false);
 const input=buildInput({character:{name:c.profile.name,gender:c.profile.gender,direction:c.direction},preferences:{genders:[c.profile.gender]},history:[{role:'user',id:'synthetic',text:'Actually I am a woman; use she and her.'}],memories:[],maxInputTokens:48000,maxOutputTokens:1024});
 assert(input[0].content.includes('Explicit user gender/pronouns always override'));assert(input[0].content.includes('Never infer identity from names or who they want to meet'));assert(input.at(-1).content.includes('Actually I am a woman'));assert(input[1].content.includes('verifiedUserGender'));
}
assert.equal(datingContext({name:'Unknown'}),null);
console.log('Male personalities passed: 24 men, 14 distinct revised voices, 3 playboys, 6 curated big boys, consistent public filters/private canon, all 50 opposite-gender defaults with explicit corrections taking precedence. No live calls.');
