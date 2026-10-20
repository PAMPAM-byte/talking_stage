'use client';
import {useState} from 'react';
import {ConnectedChatDelivery,ChatOutbox,LiveMessageComposer} from '@/components/connected-chat-delivery';
import {ReplyableMessage} from '@/components/replyable-message';
import {ChatMessageContent} from '@/components/chat-expression';
import {ChatShell} from '@/components/chat-shell';
import type {MessageQuote} from '@/lib/chat/message-quotes';
const conversation='00000000-0000-4000-8000-000000000001';
const initial:MessageQuote[]=[{id:'00000000-0000-4000-8000-000000000011',role:'character',kind:'text',text:'Coffee tomorrow, or are you more of a late dinner person?',sequence:1},{id:'00000000-0000-4000-8000-000000000012',role:'user',kind:'text',text:'Definitely a late dinner person.',sequence:2},{id:'00000000-0000-4000-8000-000000000013',role:'character',kind:'text',text:'Then we agree on something already.',sequence:3},{id:'00000000-0000-4000-8000-000000000014',role:'character',kind:'text',text:'[[ts:sticker:wave]]',sequence:4}];
export function QuotePreview(){
 const [messages,setMessages]=useState<(MessageQuote&{clientId?:string;replyTo?:MessageQuote|null})[]>(()=>initial.map((m,i)=>({...m,...(i===2?{replyTo:initial[1]}:{})})));
 const [fail,setFail]=useState(false);
 return <ConnectedChatDelivery id={conversation} generation={1} replies={false} savedIds={messages.map(m=>m.id)} savedClientIds={messages.map(m=>m.clientId??'')} statuses={[]} action={async form=>{
  if(fail){setFail(false);return {error:'Synthetic save interrupted. Try again.'};}
  const clientId=String(form.get('clientId'));const existing=messages.find(m=>m.clientId===clientId);if(existing)return {messageId:existing.id};
  const messageId=crypto.randomUUID();const target=messages.find(m=>m.id===form.get('replyTo'));
  setMessages(current=>[...current,{id:messageId,clientId,role:'user',kind:'text',text:String(form.get('text')),replyTo:target??null,sequence:current.length+1}]);return {messageId};
 }}><div className="chat-workspace connected-chat"><ChatShell followMessages back={<span>Reply preview</span>} identity={<h1>Amara · scripted chat</h1>} actions={<button type="button" onClick={()=>setFail(true)}>Fail next quoted save</button>} composer={<div className="chat-composer"><LiveMessageComposer name="Amara" disabled={false}/></div>}><div className="chat-log" role="log" aria-label="Conversation messages">{messages.map(message=><ReplyableMessage key={message.id} message={message} quote={message.replyTo} name="Amara" conversation={conversation} content={<ChatMessageContent text={message.text}/>}><span className="caption muted">Preview</span></ReplyableMessage>)}<ChatOutbox name="Amara"/></div></ChatShell></div></ConnectedChatDelivery>;
}
