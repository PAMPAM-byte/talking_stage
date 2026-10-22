"use client";
import {useRef,useState} from 'react';
import {ChatMessageContent} from '@/components/chat-expression';
import {ConnectedChatDelivery,ConnectedMessageDelivery,ChatOutbox,LiveMessageComposer} from '@/components/connected-chat-delivery';
import {ChatShell} from '@/components/chat-shell';
import {ReplyRetry} from '@/components/connected-conversation-forms';
import {ConversationSync} from '@/components/conversation-sync';
import {ChatLoading,ConversationLoadRecovery} from '@/components/chat-loading';
import {MemoryForm} from '@/components/connected-memory-form';
import {MemorySavedConfirmation} from '@/components/memory-saved-confirmation';
import {encodeExpression} from '@/lib/chat/expressions';
import {ReactionPreview} from './reaction-preview';
import {CheckinPreview} from './checkin-preview';
import {QuotePreview} from './quote-preview';
import {DatePreview} from './date-preview';
const id='00000000-0000-4000-8000-000000000001';
export default function DeliveryPreview({scenario,snapshot=false}:{scenario?:string;snapshot?:boolean}){
 const seeded=['unstarted','generating','failed','attempted'].includes(scenario??'');
 const seededId='00000000-0000-4000-8000-000000000002';
 const [saved,setSaved]=useState<{id:string;clientId:string;text:string}[]>(()=>seeded?[{id:seededId,clientId:seededId,text:'Previously saved message.'}]:[]);const fail=useRef(false);const attempts=useRef(new Map<string,string>());
 const [renderedReply,setRenderedReply]=useState(false);
 const [completionKnown,setCompletionKnown]=useState(false);
 const statuses=(renderedReply||completionKnown)?saved.map(m=>({messageId:m.id,state:'completed',attempts:1,outputMessageId:'preview-output-'+m.id})):seeded?[{messageId:seededId,state:scenario==='generating'?'generating':scenario==='failed'?'failed':'blocked_provider',attempts:scenario==='unstarted'?0:1}]:[];
 const failStop=useRef(false);
 if(scenario==='quotes')return <QuotePreview/>;
 if(scenario==='dates')return <DatePreview/>;
 if(scenario==='checkins')return <CheckinPreview/>;
 if(scenario==='reactions')return <ReactionPreview/>;
 if(scenario==='expressions')return <ChatShell back={<span>Preview</span>} identity={<h1>Amara · scripted reactions</h1>} composer={<div className="chat-composer">Synthetic media rendering preview</div>}><div role="log" aria-label="Conversation messages" className="chat-log"><article className="message-turn message-turn--user"><ChatMessageContent text="That joke finished me 😂"/></article><article className="message-turn" data-testid="character-gif"><ChatMessageContent text={encodeExpression({kind:'gif',id:'omo-laugh'},'You got me too 😂')}/></article><article className="message-turn" data-testid="character-sticker"><ChatMessageContent text={encodeExpression({kind:'sticker',id:'my-person'})}/></article></div></ChatShell>;
 if(scenario?.startsWith('memory-'))return scenario==='memory-saved'?<MemorySavedConfirmation/>:<MemoryForm character={id} operation="save" label="Save memory" conversation={scenario==='memory-return'?id:undefined} action={async()=>scenario==='memory-failure'?{error:'Synthetic save unavailable.'}:{message:'Memory saved.'}}/>;
 if(scenario==='loading')return <ChatLoading/>;
 if(scenario==='render-error')return <ConversationLoadRecovery failed/>;
 return <div className="chat-workspace connected-chat"><button style={{position:'fixed',right:8,top:8,zIndex:30,fontSize:10}} onClick={()=>{fail.current=true;}}>Fail next save</button><ConnectedChatDelivery id={id} generation={1} replies={scenario!=='disabled'} savedIds={[...saved.map(m=>m.id),...(renderedReply&&saved[0]?['preview-output-'+saved[0].id]:[])]} savedClientIds={saved.map(m=>m.clientId)} statuses={statuses} action={async form=>{
  if(form.get('operation')==='skip'){
   if(failStop.current){failStop.current=false;throw new Error('Synthetic interrupted cancellation');}
   return {message:'Reply stopped'};
  }
  await new Promise(resolve=>setTimeout(resolve,900));
  const clientId=String(form.get('clientId'));const messageId=attempts.current.get(clientId)??crypto.randomUUID();attempts.current.set(clientId,messageId);
  if(fail.current){fail.current=false;return {error:'Connection interrupted. Retry sending.'};}
  setSaved(current=>current.some(m=>m.clientId===clientId)?current:[...current,{id:messageId,clientId,text:String(form.get('text'))}]);
  return {messageId};
 }}><button style={{position:'fixed',right:8,top:80,zIndex:30,fontSize:10}} onClick={()=>setCompletionKnown(true)}>Acknowledge completion only</button><button style={{position:'fixed',right:8,top:56,zIndex:30,fontSize:10}} onClick={()=>setRenderedReply(true)}>Render completed reply</button><button style={{position:'fixed',right:8,top:32,zIndex:30,fontSize:10}} onClick={()=>{failStop.current=true;}}>Fail next stop</button><ChatShell followMessages back={<span>Preview</span>} identity={<h1>Amara · scripted test</h1>} composer={<div className="chat-composer"><LiveMessageComposer disabled={false} name="Amara"/></div>}><div role="log" aria-label="Conversation messages" className="chat-log">{saved.map(m=><article key={m.id} className="message-turn message-turn--user" data-client-id={m.clientId}><ChatMessageContent text={m.text}/><div className="message-meta"><ConnectedMessageDelivery messageId={m.id} status={statuses.find(s=>s.messageId===m.id)}/></div>{seeded&&statuses.some(s=>s.messageId===m.id)&&<ReplyRetry id={id} messageId={m.id} status={statuses.find(s=>s.messageId===m.id)!}/>}</article>)}{scenario==='sync'&&<ConversationSync id={id} revision={snapshot?'preview-1':'preview-0'}/>} {renderedReply&&<article className="message-turn" data-testid="handoff-reply"><p className="message-bubble">A reply is now visible.</p></article>}{snapshot&&<article className="message-turn"><p className="message-bubble">A reply delivered automatically.</p></article>}<ChatOutbox name="Amara"/></div></ChatShell></ConnectedChatDelivery></div>;
}
