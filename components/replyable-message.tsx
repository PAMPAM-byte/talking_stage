'use client';
import {useRef,useState,useSyncExternalStore,type CSSProperties,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {useReplyDelivery} from './connected-chat-delivery';
import {QuotedMessage} from './quoted-message';
import type {MessageQuote} from '@/lib/chat/message-quotes';
import {Icon} from './ui/icon';
import styles from './message-reply.module.css';
const subscribe=()=>()=>{};
export function ReplyableMessage({message,quote,name,conversation,disabled=false,returnToLatest=false,content,children}:{message:MessageQuote;quote?:MessageQuote|null;name:string;conversation:string;disabled?:boolean;returnToLatest?:boolean;content:ReactNode;children?:ReactNode}){
 const delivery=useReplyDelivery();const [drag,setDrag]=useState(0);
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const router=useRouter();
 const gesture=useRef<{id:number;x:number;y:number;distance:number;horizontal:boolean}|null>(null);
 const reset=()=>{gesture.current=null;setDrag(0);};
 const choose=()=>{if(!disabled){delivery?.selectReply(message);if(returnToLatest)router.push(`/messages/${conversation}`,{scroll:false});}};
 return <article id={`message-${message.id}`} tabIndex={-1} className={`message-turn ${styles.root}${message.role==='user'?` message-turn--user ${styles.user}`:''}`} onPointerDown={event=>{
  if(disabled||!hydrated||!delivery||event.pointerType==='mouse'||!event.isPrimary||(event.target as HTMLElement).closest('button,a,input,textarea'))return;
  gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0,horizontal:false};
 }} onPointerMove={event=>{
  const current=gesture.current;if(!current||event.pointerId!==current.id)return;
  const x=event.clientX-current.x,y=event.clientY-current.y;
  if(!current.horizontal){if(Math.abs(y)>12&&Math.abs(y)>Math.abs(x)){reset();return;}if(x<10||x<Math.abs(y)*1.4)return;current.horizontal=true;event.currentTarget.setPointerCapture(event.pointerId);}
  current.distance=Math.max(0,Math.min(72,x));setDrag(current.distance);
 }} onPointerUp={event=>{const current=gesture.current;if(!current||event.pointerId!==current.id)return;const selected=current.horizontal&&current.distance>=52;reset();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(selected)choose();}} onPointerCancel={reset} onLostPointerCapture={event=>{if(event.target===event.currentTarget)reset();}}>
  <div className={styles.content} style={{'--reply-drag':`${drag}px`} as CSSProperties} data-dragging={drag>0||undefined}>
   {drag>0&&<span className={styles.swipeHint} data-ready={drag>=52||undefined} aria-hidden="true"><Icon name="reply"/></span>}
   <div className={quote?styles.quotedContent:undefined}>{quote&&<QuotedMessage quote={quote} name={name} conversation={conversation}/>} {content}</div>
   {!disabled&&delivery&&<button disabled={!hydrated} className={styles.replyAction} type="button" title="Reply to message" aria-label={`Reply to ${message.role==='user'?'your message':name+'’s message'}`} onClick={choose}><Icon name="reply"/></button>}
  </div>{children}
 </article>;
}
