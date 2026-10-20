import assert from 'node:assert/strict';
import {conversationTimeline} from '../lib/ai/conversation-timeline.mjs';
import {buildInput} from '../lib/ai/provider.mjs';
import {readFile} from 'node:fs/promises';
const now=new Date('2026-10-21T10:00:00Z');
const yesterday=[{id:'old-user',role:'user',text:'I am sleepy.',created_at:'2026-10-20T20:00:00Z'},{id:'old-reply',role:'character',text:'Goodnight.',created_at:'2026-10-20T20:01:00Z'},{id:'return',role:'user',text:'Hello',created_at:'2026-10-21T09:59:00Z'}];
const gap=conversationTimeline(yesterday,'Africa/Lagos',now);assert.equal(gap.calendarDaysSincePreviousExchange,1);assert.equal(gap.history[0].daysBeforeNow,1);assert.equal(gap.minutesSincePreviousExchange,838);
const sameDay=conversationTimeline(yesterday.map((m,i)=>({...m,created_at:`2026-10-21T09:${i===0?'50':i===1?'51':'59'}:00Z`})),'Africa/Lagos',now);assert.equal(sameDay.calendarDaysSincePreviousExchange,0);
const midnight=conversationTimeline([{role:'character',created_at:'2026-10-20T22:59:00Z'},{role:'user',created_at:'2026-10-20T23:01:00Z'}],'Africa/Lagos',now);assert.equal(midnight.calendarDaysSincePreviousExchange,1);assert.equal(midnight.minutesSincePreviousExchange,2);
assert.equal(conversationTimeline(yesterday,'America/Los_Angeles',now).history[0].localDate,'2026-10-20');
assert.equal(conversationTimeline(yesterday,'invalid/zone',now).calendarDaysSincePreviousExchange,null);
assert.equal(conversationTimeline([{role:'user',text:'hi'}],'Africa/Lagos',now).lastExchangeAt,null);
assert.equal(conversationTimeline([{role:'character',created_at:'not a date'},{role:'user',created_at:'2026-10-21T09:59:00Z'}],'Africa/Lagos',now).minutesSincePreviousExchange,null);
const pack=JSON.parse(await readFile(new URL('../docs/cast-50/characters.json',import.meta.url),'utf8'));
for(const character of pack.characters){
 const input=buildInput({character:{name:character.profile.name,direction:character.direction},history:yesterday,preferences:{language:'english'},memories:[],reactionTargets:[{messageId:'return'}],userTimeZone:'Africa/Lagos',maxInputTokens:48000,maxOutputTokens:1024});
 assert(input[0].content.includes('stored message timestamps'));
 assert(input[0].content.includes('not online presence'));
 assert(input[1].content.includes('lastExchangeLocalDate'));
 assert(input.at(-2).content.includes('[Sent: 2026-10-20 21:01]'));
 assert(Buffer.byteLength(JSON.stringify(input))+2048<=48000);
}
console.log('Timeline passed: yesterday/today, same-day return, midnight short gap, timezone formatting, missing/invalid dates and full 50-character provider context. No model calls.');
