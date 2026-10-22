import {decodeExpression} from '../chat/expressions.ts';

// Only actual user-authored text can establish a language cue. Never scan
// character replies, quoted-message metadata or catalogue descriptions.
function userText(message){
 const raw=message.text??message.content??'';
 const media=decodeExpression(raw.trim());
 return (media?media.caption:raw).replace(/^>.*$/gmu,'').replace(/"[^"\n]*"|“[^”\n]*”/gu,'');
}
export function replyLanguage(history){
 let language='english';
 for(const message of history){
  if(message.role!=='user')continue;
  const text=userText(message);
  if(/\b(?:no\s+(?:more\s+)?(?:pidgin|slang)|(?:do not|don't|never|stop|avoid|skip)\b.{0,25}\b(?:pidgin|slang)|(?:use|speak|reply|write|keep it|switch to)\s+(?:in\s+)?(?:plain\s+|simple\s+|normal\s+|standard\s+|only\s+)?english|english\s*,?\s*(?:only|please|from now on))\b/iu.test(text)){language='english';continue;}
  if(/\b(?:(?:speak|use|reply|write|talk|switch|chat)\b.{0,20}\bpidgin|pidgin\s+please|(?:how\s+(?:you|u)\s+dey|wetin|i\s+(?:no\s+)?dey|you\s+dey|e\s+dey|abeg|na\s+wetin))\b/iu.test(text))language='english_pidgin';
 }
 return language;
}
export function replyQualityGuidance(history){
 const language=replyLanguage(history);
 const recent=history.filter(m=>['assistant','character'].includes(m.role)).slice(-3).map(m=>m.text??m.content??'');
 const openings=recent.map(text=>text.toLowerCase().match(/[\p{L}']+/gu)?.slice(0,4).join(' ')??'').filter(Boolean);
 const repeated=openings.some((opening,index)=>openings.indexOf(opening)!==index);
 return `Final turn direction, ahead of illustrative dialogue:
${language==='english'?'Reply in English only this turn. Your slang, names and media labels are not user Pidgin cues.':'User Pidgin cue active: natural Pidgin is permitted, not compulsory.'}
Start with the actual point; skip stock approval and remarks about reply length. Ask an unknown name once, or offer one concrete topic. Company means participating, not promising to chat or offering a talk-versus-silence menu. Respect declined topics and goodbyes.
Use known facts directly: do not explain screens, saved records, retrieval or memory machinery. Missing facts need a brief reminder request; storage explanations only when asked. Direct AI/human questions still need an honest answer. Day questions permit modest fictional colour from established routines, never new named facts, real-world access or contradictions; no platform disclaimer. Planned sleep is not confirmed rest or recovery.
${repeated?'Recent replies reuse an opening: change structure and contribute something new, not paraphrased reassurance.':'Keep the individual voice; skip generic praise and repeated reassurance.'}`;
}
