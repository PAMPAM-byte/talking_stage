import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {providerSettings} from '../lib/ai/provider.mjs';
import {runCheckin} from '../lib/ai/checkin-pipeline.mjs';
import {dependencyFetch} from '../lib/backend/dependency-fetch.mjs';
try{
 const env=parseEnv(await readFile(new URL('../.env.local',import.meta.url),'utf8'));
 const settings=providerSettings(env);if(!settings){console.log('Character check-ins: provider disabled.');process.exit(0);}
 if(!env.NEXT_PUBLIC_SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('configuration');
 const client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:dependencyFetch}});
 const candidates=await client.rpc('checkin_candidates',{p_limit:3});if(candidates.error)throw Error('candidates');
 if(!process.argv.includes('--run')){console.log(`Check-in preflight: ${(candidates.data??[]).length} opted-in accounts to inspect. No generation requested.`);process.exit(0);}
 const totals={completed:0,skipped:0,unavailable:0};
 for(const actor of candidates.data??[]){const state=await runCheckin(client,actor,settings);if(state==='completed')totals.completed++;else if(['failed','unavailable'].includes(state))totals.unavailable++;else totals.skipped++;}
 console.log(JSON.stringify({operation:'character-checkins',...totals}));
}catch{console.error('Character check-ins unavailable. Private connection/provider diagnostics suppressed.');process.exitCode=1;}
