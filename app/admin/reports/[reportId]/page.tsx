export const instant = false;
import { Suspense } from 'react';
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedReportDetail } from '@/components/admin/connected-reports';
async function Detail({ params }: { params: Promise<{ reportId: string }> }) { const { reportId } = await params; return usesSupabase() ? <ConnectedReportDetail id={reportId} /> : <AdminScreen section="reports" id={reportId} />; }
export default function Page({ params }: { params: Promise<{ reportId: string }> }) { return <Suspense fallback={<p role="status">Loading operator record…</p>}><Detail params={params} /></Suspense>; }
