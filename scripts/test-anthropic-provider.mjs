import assert from 'node:assert/strict';
import { providerSettings, generateReply } from '../lib/ai/provider.mjs';
const env={TALKINGSTAGE_AI_ENABLED:'true',TALKINGSTAGE_AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'synthetic'};
const settings=providerSettings(env);
assert.equal(settings.model,'claude-haiku-5-5');
assert.equal(providerSettings({...env,TALKINGSTAGE_AI_MODEL:'claude-sonnet-4-5'}),null);
assert.equal(providerSettings({...env,TALKINGSTAGE_AI_PROVIDER:'openai'}),null);
assert.equal(providerSettings({...env,ANTHROPIC_API_KEY:''}),null);
const context={character:{name:'Adult fixture',direction:'Warm and respectful.'},preferences:{},memories:[],history:[{role:'user',text:'Hello'}],maxInputTokens:48000,maxOutputTokens:1024};
const response=(stop_reason='end_turn',text=JSON.stringify({text:'Hello there.',photoAssetId:null}))=>new Response(JSON.stringify({stop_reason,content:[{type:'text',text}]}));
const schemas=[];
const fetcher=async(url,init)=>{
 assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(init.headers['x-api-key'],'synthetic');assert.equal(init.cache,'no-store');
 const body=JSON.parse(init.body);assert.equal(body.model,'claude-haiku-5-5');assert.equal(body.output_config.format.type,'json_schema');assert.equal(body.tools,undefined);assert.equal(body.max_tokens,1024);assert.equal(body.messages[0].role,'user');
 assert.deepEqual(body.thinking,{type:'disabled'});assert.equal(body.fallbacks,undefined);assert.equal(init.headers['anthropic-beta'],undefined);
 // Rules and published direction are one cached block; per-turn guidance follows uncached.
 assert.equal(body.system.length,2);assert.deepEqual(body.system[0].cache_control,{type:'ephemeral'});assert.equal(body.system[1].cache_control,undefined);
 assert(body.system[0].text.includes('non-explicit')&&body.system[0].text.endsWith('Warm and respectful.'));assert(!JSON.stringify(body).includes('prompt-cache-break'));
 schemas.push(body.output_config.format.schema);
 assert.deepEqual(body.output_config.format.schema.properties.photoAssetId,{anyOf:[{type:'null'},{type:'string'}]});
 return response();
};
assert.equal((await generateReply(context,settings,{fetcher})).text,'Hello there.');
const photoId='00000000-0000-4000-8000-000000000099';
const photoContext={...context,photos:[{id:photoId,description:'Approved synthetic adult photo'}]};
await generateReply(photoContext,settings,{fetcher:async(_url,init)=>{
 schemas.push(JSON.parse(init.body).output_config.format.schema);
 assert.deepEqual(JSON.parse(init.body).output_config.format.schema.properties.photoAssetId,{anyOf:[{type:'null'},{type:'string'}]});
 return response('end_turn',JSON.stringify({text:'A synthetic photo.',photoAssetId:photoId}));
}});
assert.deepEqual(schemas[0],schemas[1],'Photo availability must not change the compiled output grammar');
await assert.rejects(generateReply(context,settings,{fetcher:async()=>response('end_turn',JSON.stringify({text:'Unadvertised photo',photoAssetId:photoId}))}),/invalid_output/);
assert.equal((await generateReply(context,settings,{fetcher:async()=>response('refusal','No.')})).refused,true);
let refusals = 0;
const hardRefusal = await generateReply(context,settings,{fetcher:async()=>{refusals++;return response('refusal','SENSITIVE-PROVIDER-DIAGNOSTIC');}});
assert.equal(refusals, 1);
assert.equal(hardRefusal.photoAssetId, null);
assert(hardRefusal.text.length < 120 && !/SENSITIVE|policy|as an ai|blush|kiss/i.test(hardRefusal.text));
const playful = "Careful. I'm starting to enjoy your confidence.";
assert.equal((await generateReply(context,settings,{fetcher:async()=>response('end_turn',JSON.stringify({text:playful,photoAssetId:null}))})).text,playful);
await assert.rejects(generateReply(context,settings,{fetcher:async()=>response('max_tokens')}),/invalid_output/);
await assert.rejects(generateReply(context,settings,{fetcher:async()=>response('end_turn','{"action":"send_money"}')}),/invalid_output/);
await assert.rejects(generateReply(context,settings,{fetcher:async()=>new Response('',{status:429})}),/provider_error/);
await assert.rejects(generateReply(context,settings,{fetcher:async()=>{throw new DOMException('timeout','TimeoutError');}}),/timeout/);
await assert.rejects(generateReply(context,{...settings,model:'claude-sonnet-4-5'},{fetcher}),/provider_error/);

// Claude Sonnet 5.5: between_tools (its lowest thinking setting) at low effort, default fallback.
const sonnet=providerSettings({...env,TALKINGSTAGE_AI_MODEL:'claude-sonnet-5-5'});
assert.equal(sonnet.model,'claude-sonnet-5-5');
const sonnetBodies=[];
const sonnetResponse=content=>new Response(JSON.stringify({stop_reason:'end_turn',content}));
const answer={type:'text',text:JSON.stringify({text:'Hello there.',photoAssetId:null})};
assert.equal((await generateReply(context,sonnet,{fetcher:async(_url,init)=>{
 const body=JSON.parse(init.body);sonnetBodies.push(body);
 assert.equal(init.headers['anthropic-beta'],'server-side-fallback-2026-07-01');
 return sonnetResponse([answer]);
}})).text,'Hello there.');
const [sonnetBody]=sonnetBodies;
assert.equal(sonnetBody.model,'claude-sonnet-5-5');assert.deepEqual(sonnetBody.thinking,{type:'between_tools'});assert.equal(sonnetBody.output_config.effort,'low');assert.equal(sonnetBody.fallbacks,'default');
assert.equal(sonnetBody.temperature,undefined);assert.equal(sonnetBody.system.length,2);assert.deepEqual(sonnetBody.system[0].cache_control,{type:'ephemeral'});
// Blocks are read by type: progress thinking and fallback markers never become reply text.
assert.equal((await generateReply(context,sonnet,{fetcher:async()=>sonnetResponse([{type:'thinking',thinking:''},{type:'fallback',from:{model:'claude-sonnet-5-5'},to:{model:'claude-sonnet-5'}},answer])})).text,'Hello there.');
await assert.rejects(generateReply(context,sonnet,{fetcher:async()=>sonnetResponse([answer,answer])}),/invalid_output/);
await assert.rejects(generateReply(context,sonnet,{fetcher:async()=>sonnetResponse([{type:'tool_use',id:'x',name:'x',input:{}},answer])}),/invalid_output/);
assert.equal((await generateReply(context,sonnet,{fetcher:async()=>new Response(JSON.stringify({stop_reason:'refusal',content:[]}))})).refused,true);
console.log('Claude offline checks passed: Haiku 5.5 and Sonnet 5.5 request mapping, cached rules block, thinking and effort settings, fallback blocks, structured output, refusal, truncation, invalid output, provider failure and timeout. No live requests made.');
