"use client";
import {useEffect,useRef,useTransition,type MouseEvent} from 'react';
import {useRouter} from 'next/navigation';

// Earlier messages load above the current ones; the message you were reading stays in place.
export function OlderMessagesLink({href}:{href:string}){
 const router=useRouter();const [pending,startTransition]=useTransition();
 const anchor=useRef<{element:Element;top:number}|null>(null);
 useEffect(()=>{
  if(pending||!anchor.current)return;
  const {element,top}=anchor.current;anchor.current=null;
  const main=element.closest('.chat-shell__messages');
  if(main&&element.isConnected)main.scrollTop+=element.getBoundingClientRect().top-top;
 },[pending]);
 function open(event:MouseEvent<HTMLAnchorElement>){
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
  event.preventDefault();
  const first=document.querySelector('.chat-shell__messages .chat-log .message-turn');
  anchor.current=first?{element:first,top:first.getBoundingClientRect().top}:null;
  startTransition(()=>router.replace(href,{scroll:false}));
 }
 return <a href={href} onClick={open} className="older-messages-link" aria-busy={pending||undefined}>{pending?<><span className="spinner" aria-hidden="true"/>Loading earlier messages…</>:'Older messages'}</a>;
}
