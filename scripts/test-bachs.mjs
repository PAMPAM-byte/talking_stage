import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {bachsSettings,minorToDecimal,decimalToMinor,createCheckout,verifyBachsEvent,verifyCheckout,checkoutURL} from '../lib/payments/bachs.mjs';
import {generateReply,buildInput} from '../lib/ai/provider.mjs';
const env={TALKINGSTAGE_PAYMENTS_ENABLED:'true',BACHS_ENVIRONMENT:'sandbox',BACHS_API_KEY:'sk_sandbox_SYNTHETIC',BACHS_WEBHOOK_SECRET:'whsec_SYNTHETIC',BACHS_ORGANIZATION_ID:'acct_synthetic'};
const settings=bachsSettings(env);assert(settings);
for(const override of [{TALKINGSTAGE_PAYMENTS_ENABLED:'false'},{BACHS_ENVIRONMENT:'other'},{BACHS_API_KEY:'sk_live_SYNTHETIC'},{BACHS_WEBHOOK_SECRET:''},{BACHS_ORGANIZATION_ID:''}])assert.equal(bachsSettings({...env,...override}),null);
assert.equal(minorToDecimal(123456),'1234.56');assert.equal(decimalToMinor('1234.56'),123456);
for(const value of ['1e3','-1','1.001','90071992547410.00',3,null])assert.throws(()=>decimalToMinor(value),/invalid_amount/);
for(const value of ['https://evil.example/','https://checkout.bachs.io.evil.example/','javascript:alert(1)','https://user@checkout.bachs.io/','http://checkout.bachs.io/'])assert.throws(()=>checkoutURL(value),/invalid_checkout/);
const intent={id:'00000000-0000-4000-8000-000000000001',reference:'TS-synthetic',amount_minor:500000,gateway_checkout_id:'chk_synthetic'};
const respond=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
let creates=0;
const fetcher=async(url,options)=>{
 if(url.endsWith('/accounts/me'))return respond({id:settings.organizationId,is_active:true});
 creates++;assert.equal(url,'https://sandbox-api.bachs.io/v1/checkout-sessions');assert.equal(options.headers['Idempotency-Key'],`gift-${intent.id}`);
 const body=JSON.parse(options.body);assert.deepEqual(body.pricing,{currency:'NGN',amount:'5000.00'});assert.equal(body.reference,intent.reference);assert.equal(body.customer,undefined);assert.equal(body.save_payment_method,undefined);assert.equal(body.metadata.talkingstage_intent,intent.id);
 assert.equal(options.headers['X-Account-Id'],undefined,'Standard checkout must use the configured merchant, without connected-account routing.');
 assert.equal(body.transfer_data,undefined);assert.equal(body.platform_fee,undefined);assert.equal(body.account_name,undefined,'Bank beneficiary details must be supplied by Bachs, not invented by the application.');
 return respond({checkout_id:'chk_synthetic',checkout_url:'https://checkout.bachs.io/c/synthetic',reference:intent.reference,expires_at:'2026-10-19T12:30:00Z'});
};
assert.equal((await createCheckout(settings,intent,'https://example.com',{fetcher})).checkoutId,'chk_synthetic');assert.equal(creates,1);
await assert.rejects(createCheckout(settings,intent,'http://localhost:3000',{fetcher}),/public_return_url_required/);
await createCheckout(settings,intent,'http://localhost:3000',{allowLocalSandboxReturn:true,fetcher:async(url,options)=>{
 if(url.endsWith('/accounts/me'))return respond({id:settings.organizationId,is_active:true});
 const body=JSON.parse(options.body);assert.equal(body.success_url,undefined);assert.equal(body.cancel_url,undefined);
 return respond({checkout_id:'chk_synthetic',checkout_url:'https://checkout.bachs.io/c/synthetic',reference:intent.reference,expires_at:'2026-10-19T12:30:00Z'});
}});
await assert.rejects(createCheckout({...settings,environment:'production'},intent,'http://localhost:3000',{allowLocalSandboxReturn:true,fetcher}),/public_return_url_required/);
const now=Date.parse('2026-10-19T12:00:00Z'),timestamp=String(now/1000);
const event={id:'evt_synthetic',type:'collection.succeeded',organization_id:settings.organizationId,data:{checkout_id:'chk_synthetic'}};
const raw=Buffer.from(JSON.stringify(event));
const sign=(secret,payload=raw)=>createHmac('sha256',secret).update(`${timestamp}.`).update(payload).digest('hex');
const headers=new Headers({'X-Bachs-Signature-V2':`t=${timestamp},v1=${'0'.repeat(64)},v1=${sign(settings.webhookSecret)}`});
assert.deepEqual(verifyBachsEvent(raw,headers,settings,now),event);
assert.throws(()=>verifyBachsEvent(Buffer.from('{}'),headers,settings,now),/invalid_webhook/);
assert.throws(()=>verifyBachsEvent(raw,headers,settings,now+301000),/invalid_webhook/);
assert.throws(()=>verifyBachsEvent(raw,headers,{...settings,organizationId:'acct_other'},now),/invalid_webhook/);
assert.throws(()=>verifyBachsEvent(raw,new Headers({'X-Bachs-Signature-V2':'broken','X-Bachs-Timestamp':timestamp,'X-Bachs-Signature':sign(settings.webhookSecret)}),settings,now),/invalid_webhook/);
assert.deepEqual(verifyBachsEvent(raw,new Headers({'X-Bachs-Timestamp':timestamp,'X-Bachs-Signature':sign(settings.webhookSecret)}),settings,now),event);
const checkout={checkout_id:'chk_synthetic',reference:intent.reference,currency:'NGN',amount:'5000.00',status:'completed',updated_at:'2026-10-19T12:00:00Z',charge:{payment_id:'pay_synthetic'}};
const payment={payment_id:'pay_synthetic',checkout_id:'chk_synthetic',reference:intent.reference,currency:'NGN',amount:'5000.00',amount_paid:'5000.00',amount_remaining:'0.00',status:'succeeded',updated_at:'2026-10-19T12:00:00Z'};
const reader=(overrides={})=>async url=>respond(url.includes('/payments/')?{...payment,...overrides}:checkout);
assert.equal((await verifyCheckout(settings,intent,{fetcher:reader()})).status,'paid');
assert.equal((await verifyCheckout(settings,intent,{fetcher:reader({status:'processing'})})).status,'pending');
assert.equal((await verifyCheckout(settings,intent,{fetcher:reader({status:'failed'})})).status,'failed');
assert.equal((await verifyCheckout(settings,intent,{fetcher:reader({status:'partially_refunded'})})).status,'review');
assert.equal((await verifyCheckout(settings,intent,{fetcher:reader({status:'refunded'})})).status,'refunded');
for(const overrides of [{currency:'USD'},{amount:'4999.00'},{reference:'other'},{checkout_id:'chk_other'}])await assert.rejects(verifyCheckout(settings,intent,{fetcher:reader(overrides)}),/payment_mismatch/);
assert.notEqual((await verifyCheckout(settings,intent,{fetcher:reader({amount_paid:'1.00'})})).status,'paid');
const context={character:{name:'Synthetic adult',direction:'Warm adult conversation.'},history:[{role:'user',text:'How are you?'}],memories:[],preferences:{language:'english'},maxInputTokens:48000,maxOutputTokens:1024,
 payments:{available:true,requestsEligible:true,requestMinimum:10000,requestMaximum:1000000,environment:'sandbox',recent:[{status:'paid',verifiedAt:'2026-10-19T12:00:00Z',amountMinor:500000,currency:'NGN'}]},requestControls:{actionsEnabled:true,allowedByUser:true,muted:false,refused:false}};
const modelReply=async(_url,options)=>{const body=JSON.parse(options.body);assert(body.text.format.schema.required.includes('requestAmountMinor'));return respond({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'A small gift would be sweet, if you feel like it.',photoAssetId:null,giftLink:false,requestAmountMinor:250000})}]}]});};
assert.equal((await generateReply(context,{key:'SYNTHETIC',model:'synthetic'},{fetcher:modelReply})).requestAmountMinor,250000);
assert(buildInput(context)[0].content.includes('Sandbox records are test payments'));
for(const controls of [{...context.requestControls,muted:true},{...context.requestControls,refused:true},{...context.requestControls,allowedByUser:false}]){
 await assert.rejects(generateReply({...context,requestControls:controls},{key:'SYNTHETIC',model:'synthetic'},{fetcher:async()=>respond({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"text":"Unallowed request","photoAssetId":null,"requestAmountMinor":250000}'}]}]})}),/invalid_output/);
}
// Offering a link is separate from a character-initiated request and never calls Bachs.
const {GIFT_LINK_TOKEN,giftMessage}=await import('../lib/payments/gift-link.mjs');
const offer={...context,history:[{role:'user',text:"I'd love to send you some money for skincare"}],requestControls:{...context.requestControls,allowedByUser:false},payments:{...context.payments,requestsEligible:false}};
const offerReply=(value)=>async(_url,options)=>{
 const schema=JSON.parse(options.body).text.format.schema;
 assert.equal(schema.required.includes('giftLink'),offer.payments.available);
 assert(!schema.required.includes('requestAmountMinor'));
 return respond({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
};
const offered=await generateReply(offer,{key:'SYNTHETIC',model:'synthetic'},{fetcher:offerReply({text:"That's sweet of you 😊 Here's the link.",photoAssetId:null,giftLink:true})});
assert(offered.text.endsWith(GIFT_LINK_TOKEN));
assert.deepEqual(giftMessage(offered.text,true),{text:"That's sweet of you 😊 Here's the link.",showLink:true});
assert.equal(giftMessage(offered.text,false).showLink,false);
assert.equal(giftMessage('Hello',true).showLink,false);
const ordinary=await generateReply(offer,{key:'SYNTHETIC',model:'synthetic'},{fetcher:offerReply({text:'How was your day?',photoAssetId:null,giftLink:false})});
assert(!ordinary.text.includes(GIFT_LINK_TOKEN));
for(const giftLink of ['https://example.com',null])await assert.rejects(generateReply(offer,{key:'SYNTHETIC',model:'synthetic'},{fetcher:offerReply({text:'Here',photoAssetId:null,giftLink})}),/invalid_output/);
await assert.rejects(generateReply({...offer,payments:{available:false}},{key:'SYNTHETIC',model:'synthetic'},{fetcher:async()=>respond({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({text:'Here',photoAssetId:null,giftLink:true})}]}]})}),/invalid_output/);
console.log('Bachs adapter passed: sandbox gates, exact money, idempotency, redirect safety, signatures, verified states and user-initiated gift links. No network calls.');
