import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {EmptyState,Notice} from './ui/primitives';
import {Pagination} from './ui/pagination';
import {RequestForm} from './connected-request-form';
type Settings={enabled:boolean;version:number;page:number;total:number;conversations:{id:string;name:string;muted:boolean;refused:boolean;version:number;status:string}[]};
export async function ConnectedRequests({page=1}:{page?:number}) {
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.rpc('request_settings',{p_page:page});
 if(result.error)return <Notice title="Request settings unavailable">Reload to try again.</Notice>;
 const settings=result.data as Settings;
 return <section className="message-list stack"><Link href="/settings">Back to settings</Link><h1 className="display page-title">Monetary requests</h1><p className="muted">Choose whether requests are welcome, and control them in each conversation. Declining never changes how warmly a character treats you.</p>
 <Notice title="Payments are not available yet">Your choices are saved for when requests become available. Turning them on does not create a payment or enable checkout.</Notice>
 <article className="card stack"><h2>Your preference</h2><RequestForm key={`${settings.version}-${settings.enabled}`} operation="preference" version={settings.version} enabled={settings.enabled} label="Save request preference"/><p className="supporting muted">Payments go to the operator, not a real person. You always decide whether to pay.</p></article>
 <h2>Conversation controls</h2>{settings.conversations.length?settings.conversations.map(c=><article key={`${c.id}-${c.version}`} className="card stack"><h3>{c.name}</h3><p className="supporting muted">{c.muted?'Requests are muted.':c.refused?'Requests are stopped.':'Requests follow your preference.'}{c.status==='archived'?' This conversation is archived.':''}</p>
 <RequestForm operation={c.muted?'unmute':'mute'} version={c.version} conversation={c.id} label={c.muted?`Unmute requests with ${c.name}`:`Mute requests with ${c.name}`}/>
 <RequestForm operation={c.refused?'resume':'decline'} version={c.version} conversation={c.id} label={c.refused?`Allow requests again with ${c.name}`:`Stop requests with ${c.name}`}/><Link href={`/messages/${c.id}`}>View conversation</Link></article>):<EmptyState title="No conversations yet" action={<Link href="/discover">Explore characters</Link>}>Start a conversation to manage requests with that character.</EmptyState>}
 <Pagination page={settings.page} total={settings.total} href={p=>`/settings/requests?page=${p}`}/><p className="supporting muted">Unmuting does not clear a previous stop. Allowing requests again does not remove mute or override your overall preference. Resetting a conversation keeps these choices.</p></section>;
}
