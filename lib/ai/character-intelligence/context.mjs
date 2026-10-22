import {conversationTime} from '../conversation-time.mjs';
const validDate=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const localDay=(value,timezone)=>validDate(value)?conversationTime(timezone,new Date(value)).userLocalTime?.date:null;
export function deriveStage(history,timezone='Africa/Lagos',now=new Date()){
 const users=history.filter(m=>(m.role==='user'||m.sender==='user')&&!['payment','system'].includes(m.kind));
 const days=new Set(users.map(m=>m.created_at??m.createdAt).filter(value=>validDate(value)&&Date.parse(value)<=now.getTime()).map(value=>localDay(value,timezone)).filter(Boolean));
 if(users.length>=150&&days.size>=7)return 'close';
 if(users.length>=40&&days.size>=3)return 'vibing';
 return users.length>=8?'talking':'new_match';
}
// These inputs have already passed the existing explicit-memory consent gate.
// No extraction, inferred fact, cross-character query or storage occurs here.
export function selectPermittedFacts(memories,timezone='Africa/Lagos',now=new Date(),limit=20){
 const today=conversationTime(timezone,now).userLocalTime?.date;
 const day=value=>/^\d{4}-\d{2}-\d{2}$/.test(value??'')?Date.parse(`${value}T00:00:00Z`):NaN;
 const rows=memories.map((item,index)=>({content:typeof item==='string'?item:item?.content,index,date:typeof item==='object'?item?.relevantOn:null})).filter(row=>typeof row.content==='string'&&row.content.trim());
 const timely=row=>Number.isFinite(day(row.date))&&Number.isFinite(day(today))&&Math.abs(day(row.date)-day(today))<=86400000;
 const selected=rows.toSorted((a,b)=>Number(timely(b))-Number(timely(a))||b.index-a.index).slice(0,Math.max(0,Math.min(20,limit)));
 return selected.toSorted((a,b)=>a.index-b.index).map(row=>row.content);
}
