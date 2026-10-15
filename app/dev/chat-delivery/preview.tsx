"use client";
import {useRef,useState} from 'react';
import {ConnectedChatDelivery,ChatOutbox,LiveMessageComposer} from '@/components/connected-chat-delivery';
import {MessageDelivery} from '@/components/message-delivery';
import {ChatShell} from '@/components/chat-shell';
const id='00000000-0000-4000-8000-000000000001';
export default function DeliveryPreview(){
 const [saved,setSaved]=useState<{id:string;clientId:string;text:string}[]>([]);const fail=useRef(false);const attempts=useRef(new Map<string,string>());
 return <div className="chat-workspace connected-chat"><button style={{position:'fixed',right:8,top:8,zIndex:30,fontSize:10}} onClick={()=>{fail.current=true;}}>Fail next save</button><ConnectedChatDelivery id={id} generation={1} replies savedIds={saved.map(m=>m.id)} savedClientIds={saved.map(m=>m.clientId)} statuses={[]} saveMessage={async form=>{
  await new Promise(resolve=>setTimeout(resolve,900));
  const clientId=String(form.get('clientId'));const messageId=attempts.current.get(clientId)??crypto.randomUUID();attempts.current.set(clientId,messageId);
  if(fail.current){fail.current=false;return {error:'Connection interrupted. Retry sending.'};}
  setSaved(current=>current.some(m=>m.clientId===clientId)?current:[...current,{id:messageId,clientId,text:String(form.get('text'))}]);
  return {messageId};
 }}><ChatShell followMessages back={<span>Preview</span>} identity={<h1>Amara · scripted test</h1>} composer={<div className="chat-composer"><LiveMessageComposer disabled={false} name="Amara"/></div>}><div role="log" aria-label="Conversation messages" className="chat-log">{saved.map(m=><article key={m.id} className="message-turn message-turn--user" data-client-id={m.clientId}><p className="message-bubble">{m.text}</p><div className="message-meta"><MessageDelivery state="saved"/></div></article>)}<ChatOutbox name="Amara"/></div></ChatShell></ConnectedChatDelivery></div>;
}
