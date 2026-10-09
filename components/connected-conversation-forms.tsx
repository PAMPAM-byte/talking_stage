"use client";
import {useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {conversationAction} from '@/lib/backend/conversation-actions';
import {Button,Checkbox,Notice,TextArea} from './ui/primitives';
import {Icon} from './ui/icon';
async function requestReply(id:string,messageId:string,signal?:AbortSignal):Promise<{message:string}> {
 try{
 const response=await fetch(`/api/conversations/${id}/replies/${messageId}`,{method:'POST',credentials:'same-origin',signal});
 const {state}=await response.json();
 return {message:state==='completed'?'Reply saved.':state==='earlier_reply_pending'?'Retry or skip the earlier reply first.':state==='budget_exhausted'?'Today’s reply limit has been reached. Your message is saved.':state==='generating'?'A reply is already being prepared. Reload shortly.':state==='cancelled'||state==='discarded'?'The reply was stopped. Your message is saved.':'Your message is saved. A reply is unavailable; try again later.'};
 }catch{return {message:signal?.aborted?'The reply was stopped. Your message is saved.':'Your message is saved. Reload to check the reply before retrying.'};}
}
export function ConversationControl({id,operation,version,label}:{id:string;operation:string;version?:number;label:string}) {
 const [result,setResult]=useState<{error?:string}>({});const [pending,start]=useTransition();const router=useRouter();
 const destructive=['reset','delete'].includes(operation);
 return <form className="stack" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);start(async()=>{const next=await conversationAction(data);setResult(next);if(!next.error){if(operation==='start')router.push(`/messages/${next.id}`);else if(operation==='delete')router.push('/messages');}});}}>
 <input type="hidden" name="id" value={id}/><input type="hidden" name="operation" value={operation}/><input type="hidden" name="version" value={version??0}/>
 {result.error&&<Notice live title="Change not saved" tone="danger">{result.error}<Button variant="quiet" onClick={()=>router.refresh()}>Reload conversation</Button></Notice>}
 {destructive?<details><summary>{label}</summary><p className="supporting muted">This removes the conversation messages. Saved memories and payment history are kept.</p><Checkbox name="clearMemories" label="Also clear saved memories for this character"/><Button type="submit" variant="danger" loading={pending}>Confirm {operation}</Button></details>:<Button type="submit" variant="secondary" loading={pending}>{label}</Button>}
 </form>;
}
export function SavedMessageComposer({id,generation,disabled,name,replies=false}:{id:string;generation:number;disabled:boolean;name:string;replies?:boolean}) {
 const [text,setText]=useState('');const [result,setResult]=useState<{error?:string;message?:string}>({});const [pending,start]=useTransition();
 const router=useRouter();
 const [activeReply,setActiveReply]=useState<string|null>(null);const [stopping,stop]=useTransition();const controller=useRef<AbortController|null>(null);
 const attempt=useRef<{id:string;text:string;generation:number}|null>(null);
 return <form className="stack connected-message-composer" onSubmit={event=>{event.preventDefault();if(!text.trim()||pending)return;const data=new FormData(event.currentTarget);
 if(!attempt.current||attempt.current.text!==text||attempt.current.generation!==generation)attempt.current={id:crypto.randomUUID(),text,generation};
 data.set('clientId',attempt.current.id);start(async()=>{const next=await conversationAction(data);setResult(next);if(!next.error){setText('');attempt.current=null;if(replies&&next.messageId){setActiveReply(next.messageId);controller.current=new AbortController();setResult(await requestReply(id,next.messageId,controller.current.signal));setActiveReply(null);controller.current=null;router.refresh();}}});}}>
 <input type="hidden" name="id" value={id}/><input type="hidden" name="operation" value="send"/><input type="hidden" name="generation" value={generation}/>
 {result.error&&<Notice live title="Message not saved" tone="danger">{result.error}</Notice>}{result.message&&<p role="status" className="caption muted">{result.message}</p>}
 <div className="connected-composer-row"><TextArea label={`Message ${name}`} name="text" value={text} onChange={event=>setText(event.target.value)} maxLength={2000} rows={2} disabled={disabled||pending} required placeholder={`Say something to ${name}…`} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.nativeEvent.keyCode!==229){event.preventDefault();if(!event.repeat&&!disabled&&!pending&&text.trim())event.currentTarget.form?.requestSubmit();}}}/>
 <Button type="submit" className="composer-send" loading={pending} disabled={disabled||!text.trim()} aria-label="Send message"><Icon name="arrow"/></Button></div>
 {activeReply&&<Button variant="quiet" loading={stopping} onClick={()=>stop(async()=>{const data=new FormData();data.set('id',id);data.set('messageId',activeReply);data.set('operation','skip');const next=await conversationAction(data);setResult(next);if(!next.error){controller.current?.abort();setActiveReply(null);router.refresh();}})}>Stop reply</Button>}</form>;
}
export function ReplyRetry({id,messageId,retry=true}:{id:string;messageId:string;retry?:boolean}) {
 const [result,setResult]=useState<{error?:string;message?:string}>({});const [pending,start]=useTransition();
 const [cancelling,stop]=useTransition();
 const router=useRouter();
 return <form onSubmit={event=>{event.preventDefault();const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;const operation=submitter?.value??'skip';const data=new FormData(event.currentTarget);data.set('operation',operation);const begin=operation==='skip'?stop:start;begin(async()=>{setResult(operation==='retry'?await requestReply(id,messageId):await conversationAction(data));router.refresh();});}}>
 <input type="hidden" name="id" value={id}/><input type="hidden" name="messageId" value={messageId}/>
 {retry&&<Button name="operation" value="retry" variant="quiet" type="submit" loading={pending} disabled={cancelling}>Retry reply</Button>}<Button name="operation" value="skip" variant="quiet" type="submit" loading={cancelling}>Skip reply</Button>{(result.error||result.message)&&<p className="caption muted" role="status">{result.error||result.message}</p>}</form>;
}
