import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadRoster} from './build-cast-roster.mjs';
import {personalityDefinitions,interestDefinitions} from '../lib/discovery-taxonomy.mjs';
import {buildInput} from '../lib/ai/provider.mjs';
const pack=await loadRoster();
const assignments=JSON.parse(await readFile('docs/cast-50/discovery-profiles.json','utf8')).characters;
const publicCast=JSON.parse(await readFile('lib/mock/public-cast.json','utf8'));
assert.equal(new Set(assignments.map(row=>row.expression)).size,50,'Individual expression must remain distinct');
assert.deepEqual([...new Set(pack.characters.flatMap(c=>c.profile.personalityTags))].sort(),Object.keys(personalityDefinitions).sort(),'Every personality option must have a matching character');
assert.deepEqual([...new Set(pack.characters.flatMap(c=>c.profile.interests))].sort(),Object.keys(interestDefinitions).sort(),'Every interest option must have a matching character');
for(const c of pack.characters){
 const row=publicCast.find(row=>row.id===c.key),assignment=assignments.find(row=>row.key===c.key);
 assert.deepEqual(row.personalityTags,c.profile.personalityTags);
 assert.deepEqual(row.interests,c.profile.interests);
 const input=buildInput({character:{name:c.profile.name,direction:c.direction},preferences:{language:'english'},memories:[],history:[{role:'user',text:'What do you enjoy outside work?'}],maxInputTokens:48000,maxOutputTokens:1024});
 assert(input[0].content.includes(assignment.expression));assert(input[0].content.includes(assignment.interestAngle));
 assert(input[0].content.includes('A discovery filter finds an existing personality; it does not rewrite you'));
 assert(input[0].content.includes('User boundaries, refusal and financial choices never reduce warmth'));
 assert(input[0].content.includes('Use Pidgin only after the user uses it'));
 assert.equal(input.at(-1).content,'What do you enjoy outside work?');
}
const matches=(personality,interest,gender)=>publicCast.filter(c=>(!personality||c.personalityTags.includes(personality))&&(!interest||c.interests.includes(interest))&&(!gender||c.gender===gender)).map(c=>c.id);
assert.deepEqual(matches('baddie','beauty','woman'),['char-ranti','char-zuri']);
assert(matches('reserved','films','woman').includes('char-ese'));
assert(publicCast.find(c=>c.id==='char-ese').personalityTags.includes('baddie'),'Style must not force extroversion');
assert.deepEqual(matches('baddie','cars','woman'),[]);
const chuka=publicCast.find(c=>c.id==='char-chief-chukwudi');assert(chuka.interests.includes('cars'));assert(!chuka.interests.includes('gardening'));
console.log(`Discovery identities passed: all 50 public/private assignments, ${Object.keys(personalityDefinitions).length} populated personality options, ${Object.keys(interestDefinitions).length} populated interests, combined matches, distinct voices, bounded provider context and no user/preference inference. No live calls.`);
