import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildInput} from '../lib/ai/provider.mjs';
import {encodeExpression} from '../lib/chat/expressions.ts';
const pack=JSON.parse(await readFile(new URL('../docs/cast-50/characters.json',import.meta.url),'utf8'));
assert.equal(pack.characters.length,50);
let largest=0;
for(const character of pack.characters)for(const text of ['How are you?',encodeExpression({kind:'sticker',id:'wave'})]){
 const context={character:{name:character.profile.name,direction:character.direction},preferences:{language:'english'},history:[{id:'synthetic',role:'user',text,reactions:[{actor:'character',emoji:'❤️'}]}],memories:[],photos:[{id:'synthetic-photo',description:'An approved character gallery portrait.'}],reactionTargets:[{messageId:'synthetic'}],requestControls:{actionsEnabled:true,allowedByUser:true,muted:false,refused:false},payments:{available:true,recipient:'Synthetic operator',environment:'sandbox',recent:[],requestsEligible:true,requestMinimum:200000,requestMaximum:100000000},maxInputTokens:48000,maxOutputTokens:1024};
 const input=buildInput(context);const bytes=Buffer.byteLength(JSON.stringify(input),'utf8')+2048;
 assert(bytes<=context.maxInputTokens);largest=Math.max(largest,bytes);
 assert(input[0].content.includes(character.direction),'Keep the complete approved private voice, not just the short public biography');
 assert(input.at(-1).content.includes('Message ID: synthetic'));
 assert(input[0].content.includes('Keep conversations non-explicit'));
 assert(input[0].content.includes('answer honestly and briefly'));
}
console.log(`Reply prompt budget passed: 100 full-direction cases across all 50 profiles, reactions, approved photo and payment eligibility; largest ${largest}/48000 bytes including reserve. No model calls or increased limits.`);
