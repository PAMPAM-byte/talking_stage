'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {MessagePartReaction} from '@/lib/chat/message-reactions';
type Result={error?:string};
// One user reaction per bubble of a texted burst. The bubble opens the message's
// picker for itself; the picker saves through here instead of the whole-message reaction.
type BubbleReactionState={parts:Record<number,string>;picking:{part:number;text:string}|null;enabled:boolean;error:string;pick:(part:number,text:string)=>void;close:()=>void;choose:(emoji:string)=>Promise<void>};
export const BubbleReactionContext=createContext<BubbleReactionState|null>(null);
export const useBubbleReactions=()=>useContext(BubbleReactionContext);
export function BubbleReactions({messageId,reactions,disabled=false,action,children}:{messageId:string;reactions:MessagePartReaction[];disabled?:boolean;action:(messageId:string,part:number,emoji:string|null)=>Promise<Result>;children:ReactNode}){
 const signature=JSON.stringify(reactions);
 const [optimistic,setOptimistic]=useState<{signature:string;parts:Record<number,string>}|null>(null);
 const [picking,setPicking]=useState<{part:number;text:string}|null>(null);const [error,setError]=useState('');const router=useRouter();
 const parts=optimistic?.signature===signature?optimistic.parts:Object.fromEntries(reactions.map(r=>[r.part,r.emoji]));
 async function choose(emoji:string){
  if(!picking||disabled)return;const {part}=picking;const next=parts[part]===emoji?null:emoji;const previous=parts;
  const updated={...parts};if(next)updated[part]=next;else delete updated[part];
  setOptimistic({signature,parts:updated});setPicking(null);setError('');
  try{const result=await action(messageId,part,next);if(result.error){setOptimistic({signature,parts:previous});setError(result.error);}else router.refresh();}
  catch{setOptimistic({signature,parts:previous});setError('Reaction not saved. Try again.');}
 }
 return <BubbleReactionContext.Provider value={{parts,picking,enabled:!disabled,error,pick:(part,text)=>{setError('');setPicking({part,text});},close:()=>setPicking(null),choose}}>{children}</BubbleReactionContext.Provider>;
}
