import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import sharp from 'sharp';
import {inspectImage} from '../lib/backend/inspect-image.ts';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'The restore drill is restricted to local Storage.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const client=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,options);
const ordinary=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const run=randomUUID();const source=`stage9-backup-${run}`,target=`stage9-restore-${run}`;
const root=resolve('.local-backups');const directory=join(root,`storage-drill-${run}`);
assert(directory.startsWith(root+sep));
const buckets=[];
const check=result=>{if(result.error)throw new Error('Local Storage drill operation failed.');return result.data;};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
 await mkdir(directory,{recursive:true});
 const image=await inspectImage(await sharp({create:{width:500,height:600,channels:3,background:'#682447'}}).png().toBuffer());
 const files=[{name:'original.webp',bytes:image.original},...image.variants.map(v=>({name:`${v.width}.webp`,bytes:v.bytes}))];
 const config={public:false,fileSizeLimit:5*1024*1024,allowedMimeTypes:['image/webp']};
 check(await client.storage.createBucket(source,config));buckets.push(source);
 for(const file of files)check(await client.storage.from(source).upload(file.name,file.bytes,{contentType:'image/webp',upsert:false}));
 const bucket=check(await client.storage.getBucket(source));
 const manifest={version:1,bucket:{public:bucket.public,fileSizeLimit:Number(bucket.file_size_limit),allowedMimeTypes:bucket.allowed_mime_types},files:[]};
 for(const file of files) {
  const bytes=Buffer.from(await check(await client.storage.from(source).download(file.name)).arrayBuffer());
  assert.equal(hash(bytes),hash(file.bytes));await writeFile(join(directory,file.name),bytes);
  manifest.files.push({name:file.name,sha256:hash(bytes),size:bytes.length,contentType:'image/webp'});
 }
 await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
 check(await client.storage.from(source).remove(files.map(f=>f.name)));
 assert.ok((await client.storage.from(source).download('original.webp')).error,'Synthetic loss must remove the source.');
 const saved=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));
 assert.equal(saved.bucket.public,false);assert.equal(saved.bucket.fileSizeLimit,config.fileSizeLimit);
 check(await client.storage.createBucket(target,saved.bucket));buckets.push(target);
 for(const file of saved.files) {
  assert(/^(original|320|640|1280)\.webp$/.test(file.name));
  const bytes=await readFile(join(directory,file.name));assert.equal(bytes.length,file.size);assert.equal(hash(bytes),file.sha256);
  check(await client.storage.from(target).upload(file.name,bytes,{contentType:file.contentType,upsert:false}));
  const restored=Buffer.from(await check(await client.storage.from(target).download(file.name)).arrayBuffer());
  assert.equal(hash(restored),file.sha256);assert.ok((await ordinary.storage.from(target).download(file.name)).error);
 }
 const restoredBucket=check(await client.storage.getBucket(target));assert.equal(restoredBucket.public,false);
 assert.deepEqual(restoredBucket.allowed_mime_types,['image/webp']);
 console.log('Local Storage restore passed: four inspected objects backed up to disk, synthetic source loss, isolated restore, SHA-256 equality and private access preserved. Synthetic evidence is in ignored .local-backups.');
}finally{
 for(const bucket of buckets){check(await client.storage.emptyBucket(bucket));check(await client.storage.deleteBucket(bucket));}
}
