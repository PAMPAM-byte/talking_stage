'use client';
import {Fragment} from 'react';
import {MessageDate} from '@/components/message-date';
import {ChatShell} from '@/components/chat-shell';
import {ConnectedChatDelivery,ChatOutbox,LiveMessageComposer} from '@/components/connected-chat-delivery';
const dates=['2026-10-20T12:00:00Z','2026-10-21T12:00:00Z','2026-10-21T12:01:00Z'];
export function DatePreview(){
 return <ConnectedChatDelivery id="00000000-0000-4000-8000-000000000001" generation={1} replies={false} savedIds={[]} statuses={[]} action={async()=>({error:'Synthetic delivery failure'})}><ChatShell back={<span>Preview</span>} identity={<h1>Amara</h1>} composer={<LiveMessageComposer name="Amara" disabled={false}/>}><div className="chat-log" role="log" aria-label="Conversation messages">{dates.map((date,index)=><Fragment key={date}><MessageDate timestamp={date} previous={dates[index-1]} now="2026-10-22T10:00:00Z"/><article className="message-turn"><p className="message-bubble">Synthetic conversation {index+1}</p></article></Fragment>)}<ChatOutbox name="Amara" previousTimestamp={dates.at(-1)}/></div></ChatShell></ConnectedChatDelivery>;
}
