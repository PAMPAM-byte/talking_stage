export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import { Suspense } from 'react';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedReports } from '@/components/admin/connected-reports';
async function Content({ searchParams }: { searchParams: Promise<{ state?: string; page?: string }> }) {
  const filters = await searchParams;
  return <ConnectedReports state={filters.state} page={Number(filters.page ?? 1)} />;
}
export default function Page({ searchParams }: { searchParams: Promise<{ state?: string; page?: string }> }) { return usesSupabase() ? <Suspense fallback={<p role="status">Loading reports…</p>}><Content searchParams={searchParams} /></Suspense> : <AdminScreen section="reports" />; }
