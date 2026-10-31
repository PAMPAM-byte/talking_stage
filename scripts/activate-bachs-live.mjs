import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
// Switches gifts from the sandbox to the live Bachs organization with the approved
// NGN 2,000-1,000,000 limits. Character money requests stay off. No payment is made.
// Usage: node scripts/activate-bachs-live.mjs --org acct_... [--recipient "Registered name"] [--apply]
const project=(await readFile('supabase/.temp/project-ref','utf8')).trim();assert.match(project,/^[a-z]{20}$/);
assert.equal(parseEnv(await readFile('.env.local','utf8')).NEXT_PUBLIC_SUPABASE_URL,`https://${project}.supabase.co`);
const folder='.local-services/bachs-live';await mkdir(`${folder}/cli`,{recursive:true});
async function query(sql){const path=resolve(`${folder}/operation.sql`);await writeFile(path,sql,{mode:0o600});try{
 const output=execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--workdir',resolve(`${folder}/cli`),'--linked','--project-ref',project,'--output','json','--file',path],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});return JSON.parse(output.slice(output.indexOf('{'))).rows;
 }catch{throw Error('Bachs live activation unavailable; private diagnostics suppressed.');}}
const org=process.argv[process.argv.indexOf('--org')+1];
assert(process.argv.includes('--org')&&/^acct_[A-Za-z0-9]+$/.test(org??''),'Pass the live organization: --org acct_...');
const recipient=process.argv.includes('--recipient')?process.argv[process.argv.indexOf('--recipient')+1]?.trim():null;
assert(recipient===null||(recipient.length>=1&&recipient.length<=120&&!/['\\]/.test(recipient)),'Recipient must be 1-120 characters without quotes');
const minimum=200000,maximum=100000000;
const inspect=`select c.enabled,c.environment,c.organization_id,c.recipient_name,c.minimum_amount_minor as minimum,c.maximum_amount_minor as maximum,
 (select enabled from private.monetary_request_policy where singleton) as requests_enabled,
 (select count(*)::int from public.payment_intents where gateway_environment='production') as live_intents
 from private.bachs_configuration c where c.singleton;`;
const before=(await query(inspect))[0];assert(before,'Bachs configuration row exists');
console.log(`Current: gifts ${before.enabled?'on':'off'} in ${before.environment}, organization ${before.organization_id===org?'already the live one':'different'}, recipient "${before.recipient_name??'(none)'}", limits ${before.minimum}-${before.maximum}, character requests ${before.requests_enabled?'ON':'off'}, ${before.live_intents} live payment(s).`);
assert(recipient||before.recipient_name?.trim(),'A registered merchant name is required before going live');
if(process.argv.includes('--apply')){
 await query(`begin;\nset local lock_timeout='5s';\nupdate private.bachs_configuration set enabled=true,environment='production',organization_id='${org}',${recipient?`recipient_name='${recipient}',`:''}minimum_amount_minor=${minimum},maximum_amount_minor=${maximum} where singleton;\ncommit;\nselect true as applied;`);
 console.log('Live gifts switched on.');
}
const after=(await query(inspect))[0];
if(after.enabled&&after.environment==='production'&&after.organization_id===org){
 assert.equal(Number(after.minimum),minimum);assert.equal(Number(after.maximum),maximum);
 assert.equal(after.requests_enabled,false,'Character money requests must stay off');
 await writeFile('docs/bachs-live-activation.json',JSON.stringify({verifiedAt:new Date().toISOString(),environment:'production',organizationPrefix:org.slice(0,8),recipient:after.recipient_name,minimumMinor:minimum,maximumMinor:maximum,characterRequestsEnabled:false,paymentsMade:0},null,2)+'\n');
 console.log(`Verified: live gifts on for "${after.recipient_name}", NGN 2,000-1,000,000, character requests off. No payment was made.`);
}else console.log('Preflight only. Re-run with --apply to switch live gifts on.');
