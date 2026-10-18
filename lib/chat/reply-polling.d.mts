export type ReplyStatus = { messageId: string; state: string; attempts: number };
export const replyWatchMs: number;
export function initialReplyWatch(statuses: ReplyStatus[], savedIds: string[], repliesEnabled: boolean): string[];
export function pollReply(url: string, options: {
  signal: AbortSignal;
  recover: () => boolean;
  fetcher?: typeof fetch;
}): Promise<{ state: string; attempts?: number; httpStatus?: number }>;
