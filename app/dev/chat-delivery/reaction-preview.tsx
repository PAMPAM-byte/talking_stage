'use client';
import {useRef,useState} from 'react';
import {MessageReactions} from '@/components/message-reactions';
import {ChatShell} from '@/components/chat-shell';
import {ChatMessageContent} from '@/components/chat-expression';
import type {MessageReaction} from '@/lib/chat/message-reactions';
export function ReactionPreview(){
 const [reactions,setReactions]=useState<MessageReaction[]>([{messageId:'user-message',actor:'character',emoji:'❤️'}]);const fail=useRef(false);
 async function action(messageId:string,emoji:string|null){await new Promise(resolve=>setTimeout(resolve,100));if(fail.current){fail.current=false;return {error:'Reaction not saved. Try again.'};}setReactions(current=>[...current.filter(r=>!(r.messageId===messageId&&r.actor==='user')),...(emoji?[{messageId,actor:'user' as const,emoji}]:[])]);return {};}
 return <ChatShell back={<span>Preview</span>} identity={<h1>Amara · scripted reactions</h1>} composer={<button type="button" onClick={()=>{fail.current=true;}}>Fail next reaction</button>}><div role="log" aria-label="Conversation messages" className="chat-log"><article className="message-turn message-turn--user" data-testid="user-message"><ChatMessageContent text="I got the job!"/><MessageReactions messageId="user-message" name="Amara" reactions={reactions.filter(r=>r.messageId==='user-message')} action={action}/></article><article className="message-turn" data-testid="character-message"><ChatMessageContent text="You did it! Congratulations 🎉"/><MessageReactions messageId="character-message" name="Amara" reactions={reactions.filter(r=>r.messageId==='character-message')} action={action}/></article></div></ChatShell>;
}
