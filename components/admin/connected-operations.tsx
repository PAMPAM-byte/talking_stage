import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import type {Control,AuditEvent} from '@/lib/backend/operations-types';
import {Badge,Card,EmptyState,Notice} from '@/components/ui/primitives';
import {ControlsForm} from './connected-controls-form';
type SpendDay={day:string;charged:number;reserved:number;settled:number;calls:number;unsettled:number};
type Spend={model:string;enabled:boolean;projectDailyMicroUsd:number;userDailyMicroUsd:number;days:SpendDay[]};
const usd=(micro:number)=>`$${(micro/1e6).toFixed(micro<1e6?4:2)}`;
async function AISpend({client}:{client:NonNullable<Awaited<ReturnType<typeof currentAccount>>>['client']}){
 const result=await client.rpc('admin_ai_spend');
 if(result.error)return <Notice title="AI spend unavailable" tone="warning">Reload to try again.</Notice>;
 const spend=result.data as Spend;const limit=spend.projectDailyMicroUsd;
 // Replies stop for everyone at the site limit, so warn well before it.
 const today=spend.days.find(d=>d.day===new Date().toISOString().slice(0,10));const used=limit>0&&today?Math.round(today.charged/limit*100):0;
 return <Card className="stack ai-spend"><h2>AI spend</h2>
  <p className="muted">Daily cost in US dollars by UTC day. Each reply first reserves its worst case, then is charged what it actually used.</p>
  {used>=75&&<Notice title={used>=100?'Site AI limit reached':`Today is at ${used}% of the site AI limit`} tone="warning">{used>=100?'Replies are paused for everyone':'Replies pause for everyone at 100%'} until midnight UTC (1am in Lagos). Raise the site limit to keep chats going.</Notice>}
  <p className="caption ai-spend__limits">{spend.enabled?'Model':'Paused'} {spend.model||'not set'} · Site limit {usd(limit)} a day · Per-person limit {usd(spend.userDailyMicroUsd)} a day</p>
  {!spend.days.length?<EmptyState title="No AI replies in the last 14 days">Spend appears here after the next reply.</EmptyState>:
  <div className="ai-spend__scroll" tabIndex={0} role="region" aria-label="AI spend by day"><table className="ai-spend__table">
   <thead><tr><th scope="col">Day (UTC)</th><th scope="col">AI calls</th><th scope="col">Counted against limit</th><th scope="col">Worst case reserved</th><th scope="col">Awaiting settlement</th></tr></thead>
   <tbody>{spend.days.map(d=>{const share=limit>0?Math.min(100,Math.round(d.charged/limit*100)):0;return <tr key={d.day}>
    <th scope="row">{d.day}</th><td>{d.calls}</td>
    <td><span className="ai-spend__amount">{usd(d.charged)}</span><span className="ai-spend__meter" role="img" aria-label={`${share}% of the site limit`}><span style={{inlineSize:`${share}%`}}/></span></td>
    <td>{usd(d.reserved)}</td><td>{d.unsettled?<Badge>{d.unsettled}</Badge>:'0'}</td></tr>;})}</tbody></table></div>}
  <p className="caption muted">Settlement started on 28 October. Earlier calls, and calls that timed out or lost their connection, stay at the worst case. Older days can count more than they reserved because deleted chats remove their reservations, not the spend.</p></Card>;
}
export async function ConnectedOperations() {
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.rpc('admin_list_controls');
 if(result.error)return <Notice title="Operations unavailable" tone="warning">Reload to try again.</Notice>;
 const controls=result.data as {global:Control;characters:Control[]};
 return <div className="stack"><h1 className="display page-title">Keep the experience in control.</h1><p className="muted">Pause chat, photos or payments independently. Existing history stays available.</p>
  <Notice title="Global pauses take priority">Character settings cannot override a global pause. Chat and payments remain unavailable until their integrations are complete.</Notice>
  <Card className="stack"><h2>Across TalkingStage</h2><p className="muted">These controls apply to every character.</p><ControlsForm control={controls.global}/></Card>
  <AISpend client={account.client}/>
  <h2>By character</h2>{!controls.characters.length&&<EmptyState title="No character controls yet">Create a character to manage its capabilities.</EmptyState>}
  <div className="character-grid">{controls.characters.map(c=><Card key={c.scope} className="stack"><div className="row"><h3>{c.name}</h3><Badge>{c.status}</Badge></div><p className="caption muted">Effective now: chat {c.effective?.chat?'enabled':'paused'} · photos {c.effective?.photos?'enabled':'paused'} · payments {c.effective?.payments?'enabled':'paused'}</p><ControlsForm control={c}/></Card>)}</div>
  <Link href="/admin/audit">Review administrator activity</Link></div>;
}
export async function ConnectedAudit({before,outcome}:{before?:string;outcome?:string}) {
 const account=await currentAccount();if(!account)return null;
 if((before&&!/^[a-f0-9-]{36}$/i.test(before))||(outcome&&!['succeeded','failed'].includes(outcome)))return <Notice title="Invalid audit filter"><Link href="/admin/audit">Reset filters</Link></Notice>;
 const result=await account.client.rpc('admin_list_audit',{p_before:before??null,p_outcome:outcome||null});
 if(result.error)return <Notice title="Activity unavailable" tone="warning"><Link href="/admin/audit">Reload activity</Link></Notice>;
 const data=result.data as {events:AuditEvent[];next:string|null};
 return <div className="stack"><h1 className="display page-title">Administrator activity</h1><p className="muted">Who changed what, and whether it succeeded. Conversation text and private character direction are excluded.</p>
  <form className="row" action="/admin/audit"><label className="field">Outcome<select className="field__control" name="outcome" defaultValue={outcome??''}><option value="">All outcomes</option><option value="succeeded">Succeeded</option><option value="failed">Failed</option></select></label><button className="button button--secondary">Filter activity</button><Link href="/admin/audit">Reset filters</Link></form>
  {!data.events.length?<EmptyState title="No activity to show">Administrator changes will appear here.</EmptyState>:<ol className="stack audit-feed">{data.events.map(e=><li key={e.id}><Card className="stack"><div className="row"><strong>{e.action}</strong><Badge tone={e.outcome==='succeeded'?'success':'danger'}>{e.outcome}</Badge></div><time className="caption muted" dateTime={e.created_at}>{new Date(e.created_at).toISOString().replace('T',' ').slice(0,19)} UTC</time><p className="supporting">Actor: {e.actor_id??'Deleted account'}<br/>Target: {e.target_kind}{e.target_id?` · ${e.target_id}`:''}</p>{e.reason&&<p className="supporting muted">Reason: {e.reason}</p>}</Card></li>)}</ol>}
  {data.next&&<Link className="button button--secondary" href={`/admin/audit?before=${data.next}${outcome?`&outcome=${outcome}`:''}`}>Older activity</Link>}</div>;
}
