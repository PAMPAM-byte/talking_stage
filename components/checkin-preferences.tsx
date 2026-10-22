'use client';
import {useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {Button,Notice} from './ui/primitives';
import styles from './checkin-preferences.module.css';
import {clearInitiativeThrottle} from '@/lib/chat/checkin-sync.mjs';
export type CheckinFrequency='off'|'daily'|'twice_weekly'|'on_return';
export function CheckinPreferences({frequency='off',action}:{frequency?:CheckinFrequency;action:(frequency:CheckinFrequency,timeZone:string)=>Promise<{error?:string}>}){
 const [value,setValue]=useState(frequency);const [result,setResult]=useState<{error?:string;saved?:boolean}>({});const [busy,start]=useTransition();const router=useRouter();
 return <form className={styles.form} onSubmit={event=>{event.preventDefault();if(busy)return;start(async()=>{try{const next=await action(value,Intl.DateTimeFormat().resolvedOptions().timeZone);setResult(next.error?next:{saved:true});if(!next.error){clearInitiativeThrottle();router.refresh();}}catch{setResult({error:'Your preference was not saved. Try again.'});}});}}>
 <fieldset disabled={busy}><legend>Let characters start the conversation</legend><p>Characters can say hello in a new chat you open, or occasionally pick up an established conversation.</p>{([{value:'off',title:'Off',description:'Characters reply when you send a message.'},{value:'daily',title:'Occasional check-ins',description:'At most one message a day across your chats.'},{value:'twice_weekly',title:'A little less often',description:'At most two messages a week across your chats.'},{value:'on_return',title:'When I return',description:'Check for an occasional message when I open Messages or a chat.'}] as const).map(option=><label key={option.value} className={styles.choice}><input type="radio" name="checkins" value={option.value} checked={value===option.value} onChange={()=>{setValue(option.value);setResult({});}}/><span><strong>{option.title}</strong><small>{option.description}</small></span></label>)}</fieldset>
 <p className={styles.note}>New-chat hellos and established-chat check-ins share the same daily limit. No repeated nudges while a message is unanswered. Messages stay inside TalkingStage; email and push notifications are not sent. You can turn this off at any time.</p><Button type="submit" loading={busy}>Save preference</Button>{result.error&&<Notice title="Preference not saved" tone="warning" live>{result.error}</Notice>}{result.saved&&<p role="status">Preference saved.</p>}</form>;
}
