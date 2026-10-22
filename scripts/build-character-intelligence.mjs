import {readFile,writeFile} from 'node:fs/promises';
const source=new URL('../docs/cast-50/characters.json',import.meta.url);
const target=new URL('../lib/ai/character-intelligence/profiles.json',import.meta.url);
const pack=JSON.parse(await readFile(source,'utf8'));
function classify(tags){
 for(const [tag,type] of [['sugar daddy personality','sugar_daddy'],['sugar mummy personality','sugar_mummy'],['baddie','baddie'],['playboy','playboy'],['big boy','big_boy'],['flirty','flirty'],['romantic','soft_romantic']])if(tags.includes(tag))return type;
 if(tags.includes('witty')&&tags.includes('playful'))return 'fun_banter';
 if(tags.includes('reserved'))return 'mysterious';
 if(tags.includes('creative'))return 'alte_creative';
 return 'decent';
}
const characters=pack.characters.map(({key,profile,personality})=>{
 const tags=profile.personalityTags.map(tag=>tag.toLowerCase());
 const primary=classify(tags);
 const candidate=tags.includes('romantic')?'soft_romantic':tags.includes('witty')&&tags.includes('playful')?'fun_banter':tags.includes('reserved')?'mysterious':tags.includes('creative')?'alte_creative':'decent';
 return {key,name:profile.name,age:profile.age,primary,secondary:candidate===primary?null:candidate,emojiLevel:tags.includes('reserved')?1:2,pidginCeiling:tags.includes('reserved')?1:2,texting:personality.texting,softSpot:personality.softSpot,hardNo:personality.friction,signatureReferences:['greeting','flirt','disagree'].map(kind=>personality.samples[kind])};
});
const result={version:1,sourceFingerprint:pack.sourceFingerprint,basis:'Existing approved profile tags and authored temperament; no public reclassification or new biography. Reference lines are anti-copy examples, not scripts.',characters};
if(process.argv.includes('--write'))await writeFile(target,JSON.stringify(result,null,2)+'\n');
else if(JSON.stringify(JSON.parse(await readFile(target,'utf8')))!==JSON.stringify(result))throw new Error('Private adapters are stale; review source changes before running with --write. Profile contents omitted.');
console.log(`Private voice adapters ${process.argv.includes('--write')?'generated':'verified'}: ${characters.length}. No service or database writes.`);
