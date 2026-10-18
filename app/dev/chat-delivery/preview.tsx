"use client";
import {useRef,useState} from 'react';
import {ChatMessageContent} from '@/components/chat-expression';
import {ConnectedChatDelivery,ConnectedMessageDelivery,ChatOutbox,LiveMessageComposer} from '@/components/connected-chat-delivery';
import {ChatShell} from '@/components/chat-shell';
import {ReplyRetry} from '@/components/connected-conversation-forms';
import {ConversationSync} from '@/components/conversation-sync';
const id='00000000-0000-4000-8000-000000000001';
export default function DeliveryPreview({scenario,snapshot=false}:{scenario?:string;snapshot?:boolean}){
 const seeded=['unstarted','generating','failed','attempted'].includes(scenario??'');
 const seededId='00000000-0000-4000-8000-000000000002';
 const [saved,setSaved]=useState<{id:string;clientId:string;text:string}[]>(()=>seeded?[{id:seededId,clientId:seededId,text:'Previously saved message.'}]:[]);const fail=useRef(false);const attempts=useRef(new Map<string,string>());
 const statuses=seeded?[{messageId:seededId,state:scenario==='generating'?'generating':scenario==='failed'?'failed':'blocked_provider',attempts:scenario==='unstarted'?0:1}]:[];
 const failStop=useRef(false);
 return <div className="chat-workspace connected-chat"><button style={{position:'fixed',right:8,top:8,zIndex:30,fontSize:10}} onClick={()=>{fail.current=true;}}>Fail next save</button><ConnectedChatDelivery id={id} generation={1} replies={scenario!=='disabled'} savedIds={saved.map(m=>m.id)} savedClientIds={saved.map(m=>m.clientId)} statuses={statuses} action={async form=>{
  if(form.get('operation')==='skip'){
   if(failStop.current){failStop.current=false;throw new Error('Synthetic interrupted cancellation');}
   return {message:'Reply stopped'};
  }
  await new Promise(resolve=>setTimeout(resolve,900));
  const clientId=String(form.get('clientId'));const messageId=attempts.current.get(clientId)??crypto.randomUUID();attempts.current.set(clientId,messageId);
  if(fail.current){fail.current=false;return {error:'Connection interrupted. Retry sending.'};}
  setSaved(current=>current.some(m=>m.clientId===clientId)?current:[...current,{id:messageId,clientId,text:String(form.get('text'))}]);
  return {messageId};
 }}><button style={{position:'fixed',right:8,top:32,zIndex:30,fontSize:10}} onClick={()=>{failStop.current=true;}}>Fail next stop</button><ChatShell followMessages back={<span>Preview</span>} identity={<h1>Amara · scripted test</h1>} composer={<div className="chat-composer"><LiveMessageComposer disabled={false} name="Amara"/></div>}><div role="log" aria-label="Conversation messages" className="chat-log">{saved.map(m=><article key={m.id} className="message-turn message-turn--user" data-client-id={m.clientId}><ChatMessageContent text={m.text}/><div className="message-meta"><ConnectedMessageDelivery messageId={m.id} status={statuses.find(s=>s.messageId===m.id)}/></div>{seeded&&<ReplyRetry id={id} messageId={m.id}/>}</article>)}{scenario==='sync'&&<ConversationSync id={id} revision={snapshot?'preview-1':'preview-0'}/>} {snapshot&&<article className="message-turn"><p className="message-bubble">A reply delivered automatically.</p></article>}<ChatOutbox name="Amara"/></div></ChatShell></ConnectedChatDelivery></div>;
}
