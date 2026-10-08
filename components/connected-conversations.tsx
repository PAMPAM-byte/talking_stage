import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {Badge,EmptyState,Notice} from './ui/primitives';
import {Pagination} from './ui/pagination';
import {ChatShell} from './chat-shell';
import {ConversationControl,SavedMessageComposer,ReplyRetry} from './connected-conversation-forms';
import {configuredReplyModel} from '@/lib/backend/reply-worker';
import {ConnectedChatPhoto} from './connected-chat-photo';
type Conversation={id:string;character_id:string;name:string;status:string;version:number;generation:number;last_message_preview?:string;updated_at?:string};
export async function ConnectedConversations({archived=false,page=1}:{archived?:boolean;page?:number}) {
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.rpc('list_conversations',{p_archived:archived,p_page:page});
 if(result.error)return <Notice title="Messages unavailable" tone="warning">Reload to try again.</Notice>;
 const rows=result.data.conversations as Conversation[];
 const model=configuredReplyModel();const available=!!model&&(await account.client.rpc('reply_availability',{p_model:model})).data===true;
 return <section className="message-list stack"><h1 className="display page-title">Messages</h1><div className="row"><Link href="/messages" aria-current={!archived?'page':undefined}>Active</Link><Link href="/messages?archived=1" aria-current={archived?'page':undefined}>Archived</Link></div>{!available&&<Notice title="Your conversations are saved">AI replies are not available yet. You can save messages and manage your history.</Notice>}
 {rows.length?<div className="message-list__rows">{rows.map(row=><article className="conversation-row" key={row.id}><Link className="conversation-row__link" href={`/messages/${row.id}`}><span className="conversation-row__body"><strong>{row.name}</strong><span className="supporting muted conversation-preview">{row.last_message_preview??'Your conversation is ready.'}</span><span className="caption muted">Fictional AI character</span></span></Link></article>)}</div>:<EmptyState title={archived?'No archived conversations':'Your first conversation starts here'} action={<Link className="button button--primary" href="/discover">Explore characters</Link>}>Meet a character to start your own conversation.</EmptyState>}
 <Pagination page={result.data.page} total={result.data.total} href={p=>`/messages?page=${p}${archived?'&archived=1':''}`}/></section>;
}
export async function ConnectedThread({id,before}:{id:string;before?:string}) {
 const account=await currentAccount();if(!account)return null;
 const result=/^[a-f0-9-]{36}$/i.test(id)?await account.client.rpc('conversation_thread',{p_id:id,p_before:before?Number(before):null}):{error:true,data:null};
 if(result.error||!result.data)return <main id="main-content" className="container shell__main"><EmptyState title="Conversation unavailable" action={<Link href="/messages">Back to messages</Link>}>This conversation could not be loaded.</EmptyState></main>;
 const {conversation:c,messages,capabilities,older}=result.data as {conversation:Conversation;messages:{id:string;sequence:number;role:string;kind:string;text:string;asset_id:string|null;created_at:string}[];capabilities:{chat:boolean};older:number|null};
 const blocked=c.status==='archived'||!capabilities.chat;
 const model=configuredReplyModel();const available=!!model&&(await account.client.rpc('reply_availability',{p_model:model})).data===true;
 const statuses=(await account.client.rpc('reply_status',{p_conversation:id,p_before:before?Number(before):null})).data as {messageId:string;state:string;attempts:number}[]|null;
 const assetIds=messages.filter(m=>m.kind==='photo'&&m.asset_id).map(m=>m.asset_id!);
 const photoDescriptions=assetIds.length?(await account.client.from('character_assets').select('id,alt_text').in('id',assetIds)).data??[]:[];
 return <div className="chat-workspace"><ChatShell back={<Link href="/messages" className="button button--quiet">Back</Link>} identity={<div className="chat-identity"><div><h1>{c.name}</h1><span className="caption muted">Fictional AI character</span></div></div>} composer={<div className="chat-composer stack">{blocked&&<p className="supporting muted">{c.status==='archived'?'Restore this conversation to save new messages.':'Chat is paused. Saved history remains available.'}</p>}<SavedMessageComposer id={id} generation={c.generation} disabled={blocked} name={c.name} replies={available}/></div>}>
 <div className="chat-thread stack">{!available&&<Notice title="Replies are not available yet">Your messages are saved. No AI response is being generated.</Notice>}<Link href={`/characters/${c.character_id}`}>View {c.name}’s profile</Link><Link href={`/settings/memories/${c.character_id}`}>Manage memories with {c.name}</Link>
 <details><summary>Conversation options</summary><div className="stack"><ConversationControl id={id} version={c.version} operation={c.status==='archived'?'restore':'archive'} label={c.status==='archived'?'Restore conversation':'Archive conversation'}/><ConversationControl id={id} version={c.version} operation="reset" label="Reset conversation"/><ConversationControl id={id} version={c.version} operation="delete" label="Delete conversation"/></div></details>
 {older&&<Link href={`/messages/${id}?before=${older}`}>Older messages</Link>}{before&&<Link href={`/messages/${id}`}>Latest messages</Link>}
 <div className="chat-log">{messages.length?messages.map(m=>{const status=statuses?.find(s=>s.messageId===m.id);return <article key={m.id} className={`message-turn${m.role==='user'?' message-turn--user':''}`}>{m.kind==='photo'&&m.asset_id?<ConnectedChatPhoto assetId={m.asset_id} name={c.name} description={photoDescriptions.find(a=>a.id===m.asset_id)?.alt_text}/>:<p className="message-bubble">{m.text}</p>}<div className="message-meta caption muted"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit'})}</time><Badge>Saved</Badge></div>{available&&!blocked&&status&&!['completed','cancelled'].includes(status.state)&&<ReplyRetry id={id} messageId={m.id} retry={status.state!=='generating'&&status.attempts<3}/>}</article>;}):<p className="muted">This is the start of your conversation.</p>}</div></div>
 </ChatShell></div>;
}
