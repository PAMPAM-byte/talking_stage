'use client';
import {createContext,useContext,type CSSProperties,type ReactNode} from 'react';
import {Icon} from './ui/icon';
import styles from './message-reply.module.css';
// Lets one bubble of a texted burst be quoted on its own: swiped on touch, or its own reply button.
export const BurstReplyContext=createContext<{name:string;enabled:boolean;drag:{part:number;distance:number}|null;choose:(part:number,text:string)=>void}|null>(null);
export function BurstBubble({index,text,children}:{index:number;text:string;children:ReactNode}){
 const reply=useContext(BurstReplyContext);
 const distance=reply?.drag?.part===index?reply.drag.distance:0;
 return <p className="message-bubble" data-burst-part={index} data-burst-text={text} data-dragging={distance>0||undefined} style={{'--burst-index':index,'--reply-drag':`${distance}px`} as CSSProperties}>
  {distance>0&&<span className={styles.swipeHint} data-ready={distance>=52||undefined} aria-hidden="true"><Icon name="reply"/></span>}
  {children}
  {reply?.enabled&&<button className={styles.burstAction} type="button" title="Reply to this text" aria-label={`Reply to ${reply.name}’s text: ${text.slice(0,80)}`} onClick={()=>reply.choose(index,text)}><Icon name="reply"/></button>}
 </p>;
}
