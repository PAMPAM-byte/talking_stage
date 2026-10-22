import {decodeExpression} from '../chat/expressions.ts';

// Remove only high-confidence conversational boilerplate, not personal facts,
// safety boundaries, identity answers or requested explanations of storage.
export function cleanConversationReply(text,history){
 const latest=history.findLast(message=>message.role==='user');
 const input=latest?.text??latest?.content??'';
 if(decodeExpression(text)||/\b(?:ai|bot|human|real person|behind (?:this|the) (?:account|profile)|(?:how|why|what|where|do you|can you)\b.{0,30}\b(?:memory|store|storage|save|delete|privacy|remember (?:everything|all))|(?:can|could|do|how)\b.{0,20}\b(?:access|read|retrieve)\b.{0,25}\b(?:chats?|messages?|records?))\b/iu.test(input))return text;
 const sentences=text.match(/[^.!?]+(?:[.!?]+(?:\s+|$)|$)/gu);
 if(!sentences?.length)return text;
 let changed=false;
 const kept=sentences.filter(sentence=>{
  const value=sentence.trim();
  const memory=/\b(?:I (?:don't|do not|didn't|can't|cannot)|I (?:can|could) only)\b.{0,100}\b(?:full record|clear record|real diary|yesterday's details|record of (?:our|earlier)|this screen|saved on my side|earlier chats here|pull up.{0,30}(?:chat|message|memory))\b/iu.test(value);
  const acknowledgement=/^(?:ok(?:ay)?|alright|all right|cool)[.!\s]*$/iu.test(input.trim());
  const grading=acknowledgement&&(/^(?:okay|ok|alright)[,\s]+(?:is\b.{0,65}\b(?:answer|start|work|mood)|(?:so )?you(?:'re| are| sound)\b.{0,40}\b(?:few words|quiet|not .{0,10}talkative|done with small talk|tired of my small talk|short answers)|(?:just okay|a (?:small|short) reply|not much of a reply))/iu.test(value)||/^(?:okay|ok|alright)[,\s]+(?:i'll take (?:that|it)|fair(?: enough)?|i hear you)[.!]$/iu.test(value)||/^Not (?:the most|much of a) .{0,30}reply\b/iu.test(value)||/^I'll (?:allow it|let that slide)[.!]$/iu.test(value));
  const company=/\bcompany\b/iu.test(input)&&/\b(?:no|not|without)\s+advice\b/iu.test(input);
  const assurance=company&&/^(?:(?:okay|alright)[,\s]+)?(?:no advice(?:,? (?:no pressure|I promise|just company|from me))*|just company|I'm here(?:,? [\p{L}]+)?|I'm happy to keep you company|I'll (?:just )?keep you company)[.!]$/iu.test(value);
  if(memory||grading||assurance){changed=true;return false;}return true;
 });
 const cleaned=kept.join(' ').replace(/\s+/gu,' ').trim();
 return changed&&cleaned?cleaned:text;
}
