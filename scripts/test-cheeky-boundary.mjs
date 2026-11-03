import assert from 'node:assert/strict';
import {buildInput,generateReply} from '../lib/ai/provider.mjs';
import {explicitAsk,cheekyBoundaryFallback} from '../lib/ai/cheeky-boundary.mjs';
// Nudes or explicit asks get a witty in-character refusal (3 Nov), never a policy line or a bill.
const user=text=>[{id:'00000000-0000-4000-8000-000000000001',role:'user',text,created_at:new Date().toISOString()}];
for(const text of ['send me nudes','Abeg show me your boobs','drop naked pics na','can we sext','send your yansh pic','strip for me'])assert(explicitAsk(user(text)),text);
for(const text of ['I love nude lipstick','send me your favourite song','show me your new hairstyle','what did you eat today?'])assert(!explicitAsk(user(text)),text);
const context={replyMode:'reply',maxInputTokens:48000,maxOutputTokens:400,character:{name:'Zuri',gender:'woman',direction:'Playful and witty.'},preferences:{language:'english'},history:user('send me nudes abeg'),memories:[],
 photos:[{id:'photo-1',description:'Approved gallery portrait.'}],requestControls:{actionsEnabled:true,allowedByUser:true,muted:false,refused:false},
 payments:{available:true,recipient:'Talking Stage',environment:'production',recent:[],requestsEligible:true,requestMinimum:200000,requestMaximum:1000000}};
const prompt=buildInput(context)[0].content;
assert(prompt.includes('Refuse in character')&&prompt.includes('set requestAmountMinor null and giftLink false')&&prompt.includes('availablePhotos with a teasing caption'));
assert(!buildInput({...context,history:user('how was work?')})[0].content.includes('Refuse in character'));
const respond=value=>async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const settings={key:'SYNTHETIC',model:'synthetic'};
// A model that tries to bill or attach a payment link for it is overridden.
const billed=await generateReply(context,settings,{fetcher:respond({text:'You haven’t even bought me suya 😂 No.',photoAssetId:null,giftLink:true,requestAmountMinor:500000})});
assert.equal(billed.requestAmountMinor,null);assert(!billed.text.includes('[[talkingstage:gift]]'));
// A teasing approved photo is allowed.
const photo=await generateReply(context,settings,{fetcher:respond({text:'This is all you’re getting today 😌',photoAssetId:'photo-1',giftLink:false,requestAmountMinor:null})});
assert.equal(photo.photoAssetId,'photo-1');
// When the model itself declines, the fallback stays in character, not a policy line.
const declined=await generateReply(context,settings,{fetcher:async()=>Response.json({status:'completed',output:[{type:'refusal',refusal:'no'}]})}).catch(error=>({error}));
if(!declined.error){assert.equal(declined.refused,true);assert(!/can't go into|non-explicit/i.test(declined.text),declined.text);}
const lines=new Set(['Zuri','Amara','Tomi','Ada'].map(name=>cheekyBoundaryFallback(name,'woman',3)));assert(lines.size>1,'Different characters answer differently');
assert(!/money|pay|send me/i.test([...lines].join(' ')+cheekyBoundaryFallback('Kunle','man',2)),'Fallbacks never mention payment');
assert.notEqual(cheekyBoundaryFallback('Kunle','man',1),cheekyBoundaryFallback('Zuri','woman',1));
console.log('Cheeky boundary passed: explicit asks detected without false positives, in-character refusal guidance, no bill or payment link, optional approved photo, varied in-character fallbacks.');
