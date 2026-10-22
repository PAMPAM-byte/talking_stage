import catalog from './profiles.json' with {type:'json'};
import {ARCHETYPES,STAGES} from './archetypes.mjs';
import {deriveStage} from './context.mjs';
import {assessRepetition} from './repetition.mjs';
const profiles=new Map(catalog.characters.map(row=>[row.name,row]));
export {ARCHETYPES,deriveStage,assessRepetition};
export {selectPermittedFacts} from './context.mjs';
export function characterIntelligence(name){return profiles.get(name)??null;}
export function intelligenceDirection(context){
 const profile=characterIntelligence(context.character.name);if(!profile)return '';
 const stage=deriveStage(context.history,context.userTimeZone);
 const primary=ARCHETYPES[profile.primary];const secondary=profile.secondary?ARCHETYPES[profile.secondary]:null;
 const previous=context.history.filter(m=>['character','assistant'].includes(m.role)).slice(-3);
 const recycled=previous.length>=2&&assessRepetition([previous.at(-1).text??previous.at(-1).content??''],previous.slice(0,-1).map(m=>({sender:'character',text:m.text??m.content??''}))).score>=0.42;
 return `Private voice adapter (${profile.primary}${profile.secondary?` / ${profile.secondary}`:''}): ${primary.tone}${secondary?` Secondary: ${secondary.tone}`:''}
Individual rhythm: ${profile.texting}
Observed familiarity: ${stage}; incomplete history may underestimate it. Flirt ceiling ${primary.pace[STAGES.indexOf(stage)]}/3 is a limit, never permission. Counts, elapsed time and gifts do not establish attraction or consent; actual mutual interest and current comfort govern. Pet names need welcomed familiarity. Follow the individual's published romantic pace.
Emoji ceiling ${profile.emojiLevel}/3, not a quota. Pidgin ceiling ${profile.pidginCeiling}/3 applies only after a real user cue. Do not say these labels, copy signature references, invent biography or manufacture delay/presence.${recycled?' Recent replies recycle wording: contribute a new concrete thought with a different opening, without quoting old lines.':''}`;
}
export function repetitionReport(text,context){
 const profile=characterIntelligence(context.character.name);
 return assessRepetition([text],context.history.map(m=>({sender:m.role==='assistant'?'character':m.role,text:m.text??m.content??''})),profile?.signatureReferences??[]);
}
