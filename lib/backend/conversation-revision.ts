import { createHash } from 'node:crypto';

type Thread = {
    conversation: { generation: number; version: number; status: string };
    capabilities: { chat: boolean };
    messages: { id: string; sequence: number }[];
    reactions?: {messageId:string;actor:string;emoji:string}[];
    partReactions?: {messageId:string;part:number;emoji:string}[];
};
type Status = { messageId: string; state: string; attempts: number };

// Exclude message text, private directions and personal context from sync metadata.
export function conversationRevision(thread: Thread, statuses: Status[]) {
    return createHash('sha256').update(JSON.stringify([
        thread.conversation.generation, thread.conversation.version, thread.conversation.status,
        thread.capabilities.chat, thread.messages.map(m => [m.id, m.sequence]),
        (thread.reactions??[]).map(r=>[r.messageId,r.actor,r.emoji]).sort((a,b)=>a.join(':').localeCompare(b.join(':'))),
        (thread.partReactions??[]).map(r=>[r.messageId,r.part,r.emoji].join(':')).sort(),
        statuses.map(s => [s.messageId, s.state, s.attempts]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ])).digest('hex');
}
