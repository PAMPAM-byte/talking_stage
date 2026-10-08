"use client";
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import type {Control} from '@/lib/backend/operations-types';
import {saveControls} from '@/lib/backend/operations-actions';
import {Button,Notice,Switch,TextField} from '@/components/ui/primitives';
export function ControlsForm({control}:{control:Control}) {
 const [result,setResult]=useState<{error?:string;message?:string}>({});const [pending,start]=useTransition();const router=useRouter();
 return <form className="stack" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);start(async()=>setResult(await saveControls(data)));}}>
  <input type="hidden" name="scope" value={control.scope}/><input type="hidden" name="version" value={control.version}/>
  {result.error&&<Notice live title="Controls not saved" tone="danger">{result.error}<Button variant="quiet" onClick={()=>router.refresh()}>Reload current version</Button></Notice>}
  {result.message&&<p role="status">{result.message}</p>}
  <Switch label="Chat enabled" name="chat" defaultChecked={control.chat} hint="Allow new conversations and replies when chat is available."/>
  <Switch label="Photos enabled" name="photos" defaultChecked={control.photos} hint="Allow customer photo delivery. Administrators can still review photos."/>
  <Switch label="Payments enabled" name="payments" defaultChecked={control.payments} hint="Allow new payment actions when payments are available."/>
  <TextField label="Reason for change" name="reason" required maxLength={500} hint="Recorded in the administrator audit. Keep private conversation content out."/>
  <details><summary>Review changes</summary><p className="supporting muted">Global pauses and character availability still apply.</p><Button type="submit" loading={pending}>Confirm controls</Button></details>
 </form>;
}
