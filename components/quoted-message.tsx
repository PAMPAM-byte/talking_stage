'use client';
import Link from 'next/link';
import {quoteSnippet,type MessageQuote} from '@/lib/chat/message-quotes';
import styles from './message-reply.module.css';
export function QuotedMessage({quote,name,conversation}:{quote:MessageQuote;name:string;conversation?:string}){
 const author=quote.role==='user'?'You':name;
 const content=<><strong>{author}</strong><span>{quoteSnippet(quote)}</span></>;
 if(!conversation)return <div className={styles.quote}>{content}</div>;
 return <Link className={styles.quote} aria-label={`View quoted message from ${author}: ${quoteSnippet(quote)}`} href={`/messages/${conversation}${quote.sequence?`?before=${quote.sequence+1}`:''}#message-${quote.id}`} onClick={event=>{const target=document.getElementById(`message-${quote.id}`);if(target){event.preventDefault();target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});}}}>{content}</Link>;
}
