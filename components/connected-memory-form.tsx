"use client";
import {useState,useTransition} from 'react';
import {memoryAction} from '@/lib/backend/memory-actions';
import {Button,Checkbox,Notice,TextArea} from './ui/primitives';
export function MemoryForm({character,operation,memory,label}:{character:string;operation:string;memory?:string;label:string}) {
 const [result,setResult]=useState<{error?:string;message?:string}>({});const [pending,start]=useTransition();
 return <form className="stack" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);start(async()=>{const next=await memoryAction(data);setResult(next);if(!next.error&&operation==='save')form.reset();});}}>
 <input type="hidden" name="character" value={character}/><input type="hidden" name="operation" value={operation}/>{memory&&<input type="hidden" name="memory" value={memory}/>}
 {operation==='save'&&<><TextArea name="content" label="A fact to remember" maxLength={500} required rows={3} placeholder="For example, I enjoy quiet walks on Sundays."/><Checkbox name="consent" required label="I give permission to save this fact and use it in future chats with this character."/><p className="caption muted">Save only information you want this character to remember. Sensitive information also requires this explicit permission.</p></>}
 <Button type="submit" variant={operation==='delete'?'danger':operation==='save'?'primary':'secondary'} loading={pending}>{label}</Button>
 {result.error&&<Notice tone="danger" title="Memory not updated" live>{result.error}</Notice>}{result.message&&<p className="caption muted" role="status">{result.message}</p>}</form>;
}
