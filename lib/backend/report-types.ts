export const reportReasons = ['Safety concern', 'Inappropriate content', 'Payment pressure', 'Photo concern', 'Other'] as const;
export type ReportTarget = { kind: 'character' | 'message' | 'photo'; id: string };
export type ReportState = 'open' | 'in_review' | 'resolved';
export type ReportRow = { id: string; target_kind: string; reason: string; state: ReportState; created_at: string; version: number };
export type ReportDetail = {
  id: string; reporterId: string; targetKind: string; targetId: string; reason: string; details: string | null;
  state: ReportState; createdAt: string; version: number; resolution: string | null;
  context: { kind: string; name?: string; characterName?: string; age?: number; bio?: string; role?: string; text?: string; messageKind?: string; altText?: string; assetId?: string; id?: string } | null;
};
