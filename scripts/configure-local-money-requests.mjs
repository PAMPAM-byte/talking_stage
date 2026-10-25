import {execFileSync} from 'node:child_process';
import {approvedRequestPolicy, approvedRequestPolicySql} from '../lib/payments/request-policy.mjs';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local money-request configuration requires loopback Supabase. Hosted and production policy stay unchanged.');
const psql=sql=>execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:sql,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
psql(approvedRequestPolicySql());
const bachs=psql("select enabled||'|'||environment from private.bachs_configuration where singleton;");
const [bachsEnabled,environment]=bachs.split('|');
const days=approvedRequestPolicy.cooldownSeconds/86400;
console.log(`Local money requests enabled: female characters may ask opted-in users after ${approvedRequestPolicy.minimumCompletedExchanges} completed exchanges, at most once every ${days} days per conversation.`);
if(bachsEnabled!=='t'||environment!=='sandbox'||process.env.TALKINGSTAGE_PAYMENTS_ENABLED!=='true'||process.env.BACHS_ENVIRONMENT!=='sandbox')
  console.log('Requests stay hidden until local Bachs sandbox is configured: TALKINGSTAGE_PAYMENTS_ENABLED=true, BACHS_ENVIRONMENT=sandbox and sandbox credentials in .env.local, and private.bachs_configuration enabled in sandbox. See docs/bachs-payments.md.');
