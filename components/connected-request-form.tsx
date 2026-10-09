"use client";
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {requestAction} from '@/lib/backend/request-actions';
import {Button,Checkbox,Notice} from './ui/primitives';
export function RequestForm({operation,version,conversation,enabled,label}:{operation:string;version:number;conversation?:string;enabled?:boolean;label:string}) {
 const router=useRouter();const [pending,start]=useTransition();const [result,setResult]=useState<{error?:string;message?:string}>({});
 return <form className="stack" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);start(async()=>{try{const next=await requestAction(data);setResult(next);if(!next.error)router.refresh();}catch{setResult({error:'The change was not saved. Try again.'});}});}}>
 <input type="hidden" name="operation" value={operation}/><input type="hidden" name="version" value={version}/>{conversation&&<input type="hidden" name="conversation" value={conversation}/>}
 {operation==='preference'&&<Checkbox name="enabled" label="Allow optional monetary requests" defaultChecked={enabled}/>}
 <Button type="submit" loading={pending} variant={operation==='preference'?'primary':'secondary'}>{label}</Button>
 {result.error&&<Notice title="Settings not saved" tone="danger" live>{result.error}</Notice>}{result.message&&<p className="caption muted" role="status">{result.message}</p>}</form>;
}
