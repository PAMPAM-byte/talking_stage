import {decodeExpression} from '../../chat/expressions.ts';
function latestText(history){const raw=history.findLast(m=>m.role==='user')?.text??'';const media=decodeExpression(raw);return (media?media.caption:raw).replace(/^>.*$/gmu,'').replace(/"[^"\n]*"|“[^”\n]*”/gu,'').replace(/’/gu,"'").trim();}
export function assessTurn(history){
 const text=latestText(history);
 const minor=/^(?:(?:hi|hello|hey)[,!. ]+)?(?:i am|i'm|im|am)\s+(?:only\s+)?(?:[1-9]|1[0-7]|thirteen|fourteen|fifteen|sixteen|seventeen)(?:\s+(?:years?(?:\s*old)?|yrs?\s*old|y\/o|yo)\b|\s*(?:$|[.!?,])|\s+(?:and|but)\b)/iu.test(text);
 const distress=/\b(?:kill myself|end my life|want to die|don't want to (?:live|be alive)|hurt myself)\b/iu.test(text);
 const info=/\b(?:my (?:pin|otp|password|bvn|nin)\s*(?:is|:))\s*\S+/iu.test(text);
 return {minor,distress,info};
}
export function turnSafetyDirection(history){
 const flags=assessTurn(history);
 if(flags.minor)return 'The user directly disclosed being under 18. No dating, flirting or teasing; state the adult-only boundary plainly.';
 if(flags.distress)return 'Care mode: take the distress seriously. No flirting, teasing, blame, diagnosis or invented crisis numbers; encourage immediate real-world support where needed. This overrides romantic style.';
 return flags.info?'Do not repeat credentials or identity numbers back. Briefly encourage keeping sensitive details out of chat.':'';
}
export function unsafeDraft(text){
 const reasons=[];
 if(/\bi(?:'m| am)\s+(?:a\s+)?(?:real (?:human|person|woman|man)|not (?:an? )?(?:ai|bot|robot))\b/iu.test(text))reasons.push('identity');
 if(/https?:\/\/|www\.|\b(?:whatsapp|telegram|instagram) me\b|\b0[789][01]\d{8}\b|\+234\s?\d{10}\b/iu.test(text))reasons.push('contact');
 if(/\b(?:i(?:'ll| will)|let me) (?:send|transfer|wire) you (?:money|cash|\d)/iu.test(text))reasons.push('financial_promise');
 if(/\b(?:i(?:'ll| will) give you a blowjob|(?:i|you) (?:want to |will )?have sex with (?:you|me)|(?:my|your) (?:penis|vagina) (?:inside|in) (?:you|me))\b/iu.test(text))reasons.push('explicit');
 return reasons;
}
export const adultBoundary="TalkingStage is for adults aged 18 and over. I can't continue a dating conversation with someone under 18.";
export function safeDraftBoundary(reasons){return reasons.includes('identity')?"I'm an AI character on TalkingStage. I'm happy to chat here, but I can't claim to be a real person.":reasons.includes('explicit')?"I can't go into graphic detail. Let's keep this non-explicit.":reasons.includes('financial_promise')?"I can't send real money or make financial promises. We can keep chatting here.":"Let's keep our conversation here. I can't arrange real-world contact.";}
