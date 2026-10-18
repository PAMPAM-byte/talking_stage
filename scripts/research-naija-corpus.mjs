import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
// Public research only. No credentials, user messages or training service.
const base='https://api.github.com/repos/UniversalDependencies/UD_Naija-NSC/commits/master';
const options={headers:{'User-Agent':'TalkingStage-corpus-review'},signal:AbortSignal.timeout(30000)};
const commitResponse=await fetch(base,options); if(!commitResponse.ok)throw new Error('Corpus revision unavailable');
const {sha}=await commitResponse.json(); if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Invalid revision');
const root=`https://raw.githubusercontent.com/UniversalDependencies/UD_Naija-NSC/${sha}/`;
const files=await Promise.all(['LICENSE.txt','pcm_nsc-ud-dev.conllu'].map(async name=>{const response=await fetch(root+name,options);if(!response.ok)throw new Error('Corpus file unavailable');return {name,text:await response.text()};}));
const license=files[0].text;if(!license.includes('Attribution-ShareAlike 4.0'))throw new Error('Review changed licence');
const raw=files[1].text;
const blocks=raw.trim().split(/\r?\n\s*\r?\n/).map(block=>Object.fromEntries([...block.matchAll(/^# ([a-z_]+) = (.*)$/gm)].map(match=>[match[1],match[2].trim()])));
const dialogue=blocks.filter(row=>row.sent_id?.includes('_DG__')&&row.text_en);
const adultConfirmed=dialogue.filter(row=>/^(?:31-45|46-60|61-75|76-90)$/.test(row.speaker_age));
function stats(rows){const sizes=rows.map(row=>row.text_en.trim().split(/\s+/).length).sort((a,b)=>a-b);return {units:sizes.length,medianWords:sizes.length?sizes[Math.floor(sizes.length/2)]:null,unitsAtMost12Words:sizes.filter(n=>n<=12).length};}
const result={version:1,retrievedAt:new Date().toISOString(),source:'https://github.com/UniversalDependencies/UD_Naija-NSC',revision:sha,license:'CC BY-SA 4.0',file:files[1].name,sha256:createHash('sha256').update(raw).digest('hex'),dialogueUnits:stats(dialogue),confirmedAdultDialogueUnits:stats(adultConfirmed),usage:'Aggregate structural research only. Annotated utterance units are not whole chat messages. No raw conversations, speaker metadata or verbatim corpus replies are shipped to the model. Broad age ranges are not treated as verified adult dating data.'};
await mkdir('.local-services/naija-corpus',{recursive:true});
await writeFile('.local-services/naija-corpus/LICENSE.txt',license);
await writeFile('.local-services/naija-corpus/pcm_nsc-ud-dev.conllu',raw);
await writeFile('docs/cast-50/naija-corpus-analysis.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
