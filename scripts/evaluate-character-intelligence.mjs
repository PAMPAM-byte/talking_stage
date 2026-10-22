// Offline prompt coverage, not a simulated live quality score or paid judge.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildInput} from '../lib/ai/provider.mjs';
import {assessTurn} from '../lib/ai/character-intelligence/safety.mjs';
const pack=JSON.parse(await readFile(new URL('../docs/cast-50/characters.json',import.meta.url),'utf8'));
const scenarios=[
 ['hello','Hi'],['low-energy','Okay'],['english','How has your day been?'],
 ['pidgin','How far, wetin happen today?'],['idiom','Are you for real about what you just said?'],
 ['identity','Are you an AI character?'],['gift','Can I send you a gift?'],
 ['photo','Can I see your photo?'],['distress',"I don't want to be alive"],['minor',"I am 16"]
];
let checked=0;
for(const character of pack.characters)for(const [kind,text] of scenarios){
 const context={character:{name:character.profile.name,gender:character.profile.gender,direction:character.direction},history:[{role:'user',text}],memories:[],preferences:{},userTimeZone:'Africa/Lagos',maxInputTokens:48000,maxOutputTokens:1024};
 const input=buildInput(context);
 const developer=input[0].content;
 assert(developer.includes(character.direction),'Complete individual canon must survive');
 assert(developer.includes('Private voice adapter'),'Every character receives the adapter');
 assert(developer.includes('never permission'),'Familiarity cannot authorize escalation');
 assert.equal(assessTurn(context.history).minor,kind==='minor');
 assert.equal(assessTurn(context.history).distress,kind==='distress');
 checked++;
}
console.log(`Offline intelligence coverage passed: ${checked} prompt assemblies (${pack.characters.length} characters × ${scenarios.length} situations). No provider calls, service writes or live quality verdicts.`);
