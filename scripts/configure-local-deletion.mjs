import {execFileSync} from 'node:child_process';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw new Error('Local deletion configuration requires loopback Supabase.');
execFileSync('docker',['exec','-i','supabase_db_talking_stage','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:'update private.privacy_configuration set account_deletion_enabled=true where singleton;',windowsHide:true,stdio:['pipe','pipe','pipe']});
console.log('Local active-data account deletion enabled. Hosted policy and backup expiry remain pending.');
