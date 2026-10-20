import {conversationTime} from './conversation-time.mjs';
const instant=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value))return null;const date=new Date(value);return Number.isFinite(date.getTime())?date:null;};
const dayNumber=date=>Date.parse(`${date}T00:00:00Z`)/86400000;
export function conversationTimeline(history,timeZone,now=new Date()){
 const latest=history.findLast(message=>message.role==='user');
 const sent=instant(latest?.created_at??latest?.createdAt);
 const earlier=latest?history.slice(0,history.lastIndexOf(latest)).findLast(message=>instant(message.created_at??message.createdAt)):null;
 const previous=instant(earlier?.created_at??earlier?.createdAt);
 const currentDate=conversationTime(timeZone,now).userLocalTime?.date;
 const latestLocal=sent?conversationTime(timeZone,sent).userLocalTime:null;
 const previousLocal=previous?conversationTime(timeZone,previous).userLocalTime:null;
 const gap=sent&&previous&&sent>=previous?Math.floor((sent-previous)/60000):null;
 return {currentLocalDate:currentDate??null,lastExchangeAt:previous?.toISOString()??null,lastExchangeLocalDate:previousLocal?.date??null,userMessageLocalDate:latestLocal?.date??null,
  minutesSincePreviousExchange:gap,calendarDaysSincePreviousExchange:gap!==null&&latestLocal&&previousLocal?dayNumber(latestLocal.date)-dayNumber(previousLocal.date):null,
  history:history.filter(message=>instant(message.created_at??message.createdAt)).map(message=>{const at=instant(message.created_at??message.createdAt);const local=conversationTime(timeZone,at).userLocalTime;return {messageId:message.id??null,role:message.role,sentAt:at.toISOString(),localDate:local?.date??null,localTime:local?.time??null,daysBeforeNow:local&&currentDate?dayNumber(currentDate)-dayNumber(local.date):null};})};
}
export const timelineGuidance='Conversation timing uses stored message timestamps and the user timezone, not online presence. Date yesterday/today references from this timeline. On a meaningful return after a gap, acknowledge it briefly and pick up a relevant thread; a two-minute midnight crossing is not a long absence. A previous sleepy message does not mean they are sleepy now. Do not explain your memory, recap every turn or keep mentioning the gap. Never invent online activity, reasons for absence, surveillance, guilt or real-world waiting. Warm playful interest can fit mutual familiarity without demanding attention. Missing dates mean uncertainty, not a guessed day.';
