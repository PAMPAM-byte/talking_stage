"use client";
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {conversationAction} from '@/lib/backend/conversation-actions';
import {Button,Checkbox,Notice} from './ui/primitives';
import {useReplyDelivery} from './connected-chat-delivery';
import {browserTimeZone} from '@/lib/chat/reply-polling.mjs';
async function requestReply(id:string,messageId:string,signal?:AbortSignal):Promise<{message:string}> {
 try{
 const headers:Record<string,string>={};
 const zone=browserTimeZone(); if(zone)headers['X-TalkingStage-Timezone']=zone;
 const response=await fetch(`/api/conversations/${id}/replies/${messageId}`,{method:'POST',credentials:'same-origin',signal,headers});
 const {state}=await response.json();
 return {message:state==='completed'?'Reply saved.':state==='earlier_reply_pending'?'Retry or skip the earlier reply first.':state==='budget_exhausted'?'Today’s reply limit has been reached. Your message is saved.':state==='generating'?'':state==='cancelled'||state==='discarded'?'The reply was stopped. Your message is saved.':'Your message is saved. A reply is unavailable; try again later.'};
 }catch{return {message:signal?.aborted?'The reply was stopped. Your message is saved.':'Your message is saved. Checking for the reply automatically.'};}
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
export function ReplyRetry({id,messageId,status}:{id:string;messageId:string;status:{state:string;attempts:number}}) {
 const delivery=useReplyDelivery();
 const [result,setResult]=useState<{error?:string;message?:string}>({});const [pending,start]=useTransition();
 const [cancelling,stop]=useTransition();
 const router=useRouter();
 // Pending and generating jobs are not failures, including in server HTML.
 // Do not rely on hydration or a hidden attribute to correct their presentation.
 if (!['failed','blocked_provider'].includes(status.state) || delivery?.active.includes(messageId)) return null;
 const retry=status.attempts<3;
 const explanation=status.state==='blocked_provider'?'A reply is temporarily unavailable. Your message is saved.':retry?'The reply was interrupted. Your message is saved.':'This reply could not be completed. Continue without it to send a new message.';
 return <form className="message-reply-actions" onSubmit={event=>{event.preventDefault();const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;const operation=submitter?.value??'skip';const data=new FormData(event.currentTarget);data.set('operation',operation);if(operation==='retry')delivery?.watch(messageId);const begin=operation==='skip'?stop:start;begin(async()=>{setResult(operation==='retry'?await requestReply(id,messageId):await conversationAction(data));router.refresh();});}}>
 <p className="caption muted">{explanation}</p>
 <input type="hidden" name="id" value={id}/><input type="hidden" name="messageId" value={messageId}/>
 {retry&&<Button name="operation" value="retry" variant="quiet" type="submit" loading={pending} disabled={cancelling}>Retry reply</Button>}<Button name="operation" value="skip" variant="quiet" type="submit" loading={cancelling}>Continue without reply</Button>{(result.error||result.message)&&<p className="caption muted" role="status">{result.error||result.message}</p>}</form>;
}
