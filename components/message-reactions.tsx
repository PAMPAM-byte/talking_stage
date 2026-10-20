'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {emojis} from '@/lib/chat/expressions';
import {quickReactions,type MessageReaction} from '@/lib/chat/message-reactions';
import {Icon} from './ui/icon';
import styles from './message-reactions.module.css';
type Result={error?:string};
export function MessageReactions({messageId,name,reactions,messageRole,disabled=false,action}:{messageId:string;messageRole:'user'|'character';name:string;reactions:MessageReaction[];disabled?:boolean;action:(messageId:string,emoji:string|null)=>Promise<Result>}){
 const [optimistic,setOptimistic]=useState<{signature:string;items:MessageReaction[]}|null>(null);const [open,setOpen]=useState(false);const [more,setMore]=useState(false);const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const picker=useId();const router=useRouter();
 const signature=JSON.stringify(reactions);
 const canReact=messageRole==='character';
 const items=(optimistic?.signature===signature?optimistic.items:reactions).filter(item=>item.actor===(canReact?'user':'character'));
 const setItems=(items:MessageReaction[])=>setOptimistic({signature,items});
 useEffect(()=>{if(!open)return;function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}function escape(event:KeyboardEvent){if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}}document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 const selected=items.find(item=>item.actor==='user')?.emoji;
 async function choose(emoji:string){if(!canReact||busy||disabled)return;const next=selected===emoji?null:emoji;const previous=items;setItems([...items.filter(item=>item.actor!=='user'),...(next?[{messageId,actor:'user' as const,emoji:next}]:[])]);setOpen(false);setBusy(true);setError('');trigger.current?.focus();try{const result=await action(messageId,next);if(result.error){setItems(previous);setError(result.error);}else router.refresh();}catch{setItems(previous);setError('Reaction not saved. Try again.');}finally{setBusy(false);}}
 if(!canReact&&!items.length)return null;
 return <div className={styles.root} ref={root} aria-busy={busy}>
  <div className={styles.bar}>{[...new Set(items.map(item=>item.emoji))].map(emoji=>{const matching=items.filter(item=>item.emoji===emoji);const people=matching.map(item=>item.actor==='user'?'You':name).join(' and ');if(!canReact)return <span key={emoji} className={`${styles.pill} ${styles.badge}`} role="img" aria-label={`${emoji} reaction by ${people}`} title={people}>{emoji}</span>;return <button key={emoji} type="button" className={styles.pill} aria-label={`${emoji} reaction by ${people}${selected===emoji?'. Remove your reaction':''}`} title={people} aria-pressed={selected===emoji} disabled={disabled||busy} onClick={()=>void choose(emoji)}><span>{emoji}</span>{matching.length>1&&<span className={styles.count}>{matching.length}</span>}</button>;})}{canReact&&<button ref={trigger} type="button" className={styles.trigger} aria-label="React to message" title="React to message" aria-expanded={open} aria-controls={picker} disabled={disabled||busy} onClick={()=>{setOpen(value=>!value);setMore(false);setQuery('');}}><Icon name="smile"/></button>}</div>
  {canReact&&open&&<div className={styles.picker} id={picker} role="region" aria-label="Choose a reaction"><div className={styles.quick}>{quickReactions.map(emoji=><button type="button" key={emoji} aria-label={`React ${emoji}`} aria-pressed={selected===emoji} onClick={()=>void choose(emoji)}>{emoji}</button>)}<button type="button" aria-label="More reactions" aria-expanded={more} onClick={()=>setMore(value=>!value)}>+</button></div>{more&&<><input autoFocus aria-label="Search reaction emojis" placeholder="Find a feeling…" maxLength={60} value={query} onChange={event=>setQuery(event.target.value)}/><div className={styles.grid}>{emojis.filter(([emoji,tags])=>`${emoji} ${tags}`.includes(query.trim().toLowerCase())).map(([emoji,tags])=><button type="button" key={emoji} title={tags} aria-label={`React ${emoji}`} aria-pressed={selected===emoji} onClick={()=>void choose(emoji)}>{emoji}</button>)}</div></>}<p>Choose again to remove your reaction.</p></div>}
  <span className={styles.feedback} role="status">{error}</span>
 </div>;
}
