export type Capabilities = { chat: boolean; photos: boolean; payments: boolean };
export type Control = Capabilities & { scope: string; version: number; name?: string; status?: string; effective?: Capabilities };
export type AuditEvent = { id: string; actor_id: string | null; action: string; target_kind: string; target_id: string | null; outcome: 'succeeded' | 'failed'; reason: string | null; created_at: string };
