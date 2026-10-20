import { expressionPreview } from '@/lib/chat/expressions';
import { ChatMessageContent } from './chat-expression';
import {ConnectedChatDelivery,ConnectedMessageDelivery,ChatOutbox,LiveMessageComposer} from './connected-chat-delivery';
import { ConversationTools } from './conversation-tools';
import Link from 'next/link';
import {ReportControl} from './connected-reporting';
import {currentAccount,renderAccount} from '@/lib/backend/server';
import {EmptyState,Notice} from './ui/primitives';
import {Pagination} from './ui/pagination';
import {ChatShell} from './chat-shell';
import {ConversationControl,ReplyRetry} from './connected-conversation-forms';
import {ConversationSync} from './conversation-sync';
import {conversationRevision} from '@/lib/backend/conversation-revision';
import {configuredReplyModel} from '@/lib/backend/reply-worker';
import {ConnectedChatPhoto} from './connected-chat-photo';
import {ConnectedChatPortrait} from './connected-chat-portrait';
import {ClearAllChats} from './clear-all-chats';
import {GiftReceipt} from './connected-payments';
import {bachsSettings} from '@/lib/payments/bachs.mjs';
import {GiftProposalControl} from './connected-gift-form';
import type {GiftIntent} from '@/lib/backend/payment-service';
type Conversation={id:string;character_id:string;name:string;status:string;version:number;generation:number;last_message_preview?:string;updated_at?:string};
export async function ConnectedConversations({archived=false,page=1}:{archived?:boolean;page?:number}) {
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.rpc('list_conversations',{p_archived:archived,p_page:page});
 if(result.error)return <Notice title="Messages unavailable" tone="warning">Reload to try again.</Notice>;
 const rows=result.data.conversations as Conversation[];
 const portraits=rows.length?(await account.client.from('character_assets').select('id,character_id').eq('slot','portrait').in('character_id',[...new Set(rows.map(row=>row.character_id))])).data??[]:[];
 const model=configuredReplyModel();const available=!!model&&(await account.client.rpc('reply_availability',{p_model:model})).data===true;
 return <section className="message-list stack"><header className="message-list__header"><h1 className="display page-title">Messages</h1><ClearAllChats /></header><div className="row"><Link href="/messages" aria-current={!archived?'page':undefined}>Active</Link><Link href="/messages?archived=1" aria-current={archived?'page':undefined}>Archived</Link></div>{!available&&<Notice title="Your conversations are saved">AI replies are not available yet. You can save messages and manage your history.</Notice>}
 {rows.length?<div className="message-list__rows">{rows.map(row=><article className="conversation-row" key={row.id}><Link className="conversation-row__link" href={`/messages/${row.id}`}><ConnectedChatPortrait assetId={portraits.find(photo=>photo.character_id===row.character_id)?.id} name={row.name}/><span className="conversation-row__body"><strong>{row.name}</strong><span className="supporting muted conversation-preview">{expressionPreview(row.last_message_preview??'Your conversation is ready.')}</span></span></Link></article>)}</div>:<EmptyState title={archived?'No archived conversations':'Your first conversation starts here'} action={<Link className="button button--primary" href="/discover">Explore characters</Link>}>Meet a character to start your own conversation.</EmptyState>}
 <Pagination page={result.data.page} total={result.data.total} href={p=>`/messages?page=${p}${archived?'&archived=1':''}`}/></section>;
}
export async function ConnectedThread({id,before}:{id:string;before?:string}) {
 const account=await renderAccount();if(!account)return null;
 const result=/^[a-f0-9-]{36}$/i.test(id)?await account.client.rpc('conversation_thread',{p_id:id,p_before:before?Number(before):null}):{error:true,data:null};
 if(result.error||!result.data)return <main id="main-content" className="container shell__main"><EmptyState title="Conversation unavailable" action={<Link href="/messages">Back to messages</Link>}>This conversation could not be loaded.</EmptyState></main>;
 const {conversation:c,messages,capabilities,older}=result.data as {conversation:Conversation;messages:{id:string;sequence:number;role:string;kind:string;text:string;asset_id:string|null;created_at:string}[];capabilities:{chat:boolean};older:number|null};
 const giftsEnabled=!!bachsSettings();
 const blocked=c.status==='archived'||!capabilities.chat;
 const model=configuredReplyModel();
 const visibleIds=messages.map(m=>m.id);
 const paymentMessageIds=messages.filter(m=>m.kind==='payment').map(m=>m.id);
 const userMessageIds=messages.filter(m=>m.role==='user').map(m=>m.id);
 const assetIds=messages.filter(m=>m.kind==='photo'&&m.asset_id).map(m=>m.asset_id!);
 // These reads share the verified owner client and have no dependency on one
 // another. Awaiting each in turn delayed displaying an already-saved reply.
 const [availability,statusRows,proposalRows,paymentMessages,photos,portrait,profile,delivery]=await Promise.all([
  model?account.client.rpc('reply_availability',{p_model:model}):Promise.resolve({data:false}),
  account.client.rpc('reply_status',{p_conversation:id,p_before:before?Number(before):null}),
  visibleIds.length?account.client.from('gift_proposals').select('id,message_id,amount_minor,state').eq('conversation_id',id).in('message_id',visibleIds):Promise.resolve({data:[]}),
  paymentMessageIds.length?account.client.from('messages').select('id,payment_intent_id').eq('conversation_id',id).eq('kind','payment').in('id',paymentMessageIds):Promise.resolve({data:[]}),
  assetIds.length?account.client.from('character_assets').select('id,alt_text').in('id',assetIds):Promise.resolve({data:[]}),
  account.client.from('character_assets').select('id').eq('character_id',c.character_id).eq('slot','portrait').limit(1).maybeSingle(),
  account.client.from('characters').select('conversation_clue').eq('id',c.character_id).maybeSingle(),
  userMessageIds.length?account.client.from('messages').select('client_message_id').eq('conversation_id',id).eq('role','user').in('id',userMessageIds):Promise.resolve({data:[]}),
 ]);
 const available=!!model&&availability.data===true;
 const statuses=statusRows.data as {messageId:string;state:string;attempts:number}[]|null;
 const photoDescriptions=photos.data??[];
 const paymentIds=(paymentMessages.data??[]).map(m=>m.payment_intent_id).filter(Boolean);
 const giftRows=paymentIds.length?await account.client.from('payment_intents').select('*').eq('conversation_id',id).in('id',paymentIds):{data:[]};
 const giftIntents=(giftRows.data??[]) as GiftIntent[];
 const tools=<ConversationTools><div className="connected-chat-shortcuts"><Link href={`/characters/${c.character_id}`}>View {c.name}’s profile</Link><Link href={`/settings/memories/${c.character_id}`}>Manage memories with {c.name}</Link></div> <div className="stack"><Link href={`/gifts/${id}`}>Send money</Link><Link href="/settings/requests">Manage monetary requests</Link><ConversationControl id={id} version={c.version} operation={c.status==='archived'?'restore':'archive'} label={c.status==='archived'?'Restore conversation':'Archive conversation'}/><ConversationControl id={id} version={c.version} operation="reset" label="Reset conversation"/><ConversationControl id={id} version={c.version} operation="delete" label="Delete conversation"/></div></ConversationTools>;
 const emptyConversation=<section className="connected-chat-welcome connected-chat-welcome--minimal" aria-label={`Start your conversation with ${c.name}`}><div className="chat-welcome-portrait"><ConnectedChatPortrait key={portrait.data?.id??'unavailable'} assetId={portrait.data?.id} name={c.name}/></div>{profile.data?.conversation_clue&&<blockquote>{profile.data.conversation_clue}</blockquote>}</section>;
 return <ConnectedChatDelivery key={`${id}:${c.generation}`} id={id} generation={c.generation} replies={available&&!blocked&&!before} savedIds={messages.map(m=>m.id)} savedClientIds={(delivery.data??[]).map(m=>m.client_message_id).filter(Boolean)} statuses={statuses??[]}><div className="chat-workspace connected-chat">{!before&&<ConversationSync id={id} revision={conversationRevision({conversation:c,messages,capabilities},statuses??[])}/>}<ChatShell followMessages actions={tools} back={<Link href={`/characters/${c.character_id}`} className="button button--quiet" aria-label={`Back to ${c.name}’s profile`}>Back</Link>} identity={<div className="chat-identity"><Link href={`/characters/${c.character_id}`} aria-label={`View ${c.name}’s profile photo`}><ConnectedChatPortrait key={portrait.data?.id??'unavailable'} assetId={portrait.data?.id} name={c.name}/></Link><div><h1>{c.name}</h1></div></div>} composer={<div className="chat-composer stack">{blocked&&<p className="supporting muted">{c.status==='archived'?'Restore this conversation to save new messages.':'Chat is paused. Saved history remains available.'}</p>}<LiveMessageComposer disabled={blocked||!!before} name={c.name}/></div>}>
 <div className="chat-thread stack">{!available&&<Notice title="Replies are not available yet">Your messages are saved. No AI response is being generated.</Notice>}

 {older&&<Link href={`/messages/${id}?before=${older}`}>Older messages</Link>}{before&&<Link href={`/messages/${id}`}>Latest messages</Link>}
 <div className="chat-log" role="log" aria-label="Conversation messages" aria-relevant="additions" aria-atomic="false">{messages.length?messages.map(m=>{const status=statuses?.find(s=>s.messageId===m.id);const proposal=proposalRows.data?.find(p=>p.message_id===m.id);const gift=giftIntents.find(g=>g.id===paymentMessages.data?.find(p=>p.id===m.id)?.payment_intent_id);return <article key={m.id} className={`message-turn${m.role==='user'?' message-turn--user':''}`}>{m.kind==='payment'&&gift?<GiftReceipt intent={gift} name={c.name}/>:m.kind==='photo'&&m.asset_id?<ConnectedChatPhoto assetId={m.asset_id} name={c.name} description={photoDescriptions.find(a=>a.id===m.asset_id)?.alt_text}/>:<ChatMessageContent text={m.text} giftHref={m.role==='character'&&giftsEnabled?`/gifts/${id}`:undefined}/>}<div className="message-meta caption muted"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit'})}</time>{m.role==='user'&&<ConnectedMessageDelivery messageId={m.id} status={status}/>}{m.role === 'character' && <ReportControl compact target={{kind:"message",id:m.id}} label={`${c.name} conversation message ${m.sequence}`} preview={m.kind==="photo"?`Photo shared in your conversation with ${c.name}`:m.text} />}</div>{proposal&&<GiftProposalControl id={proposal.id} conversation={id} amount={Number(proposal.amount_minor)} declined={proposal.state==='declined'}/>} {available&&!blocked&&status&&<ReplyRetry id={id} messageId={m.id} status={status}/>}</article>;}):<div className="chat-empty-introduction">{emptyConversation}</div>}<ChatOutbox name={c.name}/></div></div>
 </ChatShell></div></ConnectedChatDelivery>;
}
