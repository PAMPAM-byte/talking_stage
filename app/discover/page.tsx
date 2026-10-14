import { LoadingState } from '@/components/loading-state';
export const instant = false;
import { Discovery } from "@/components/discovery";
import { ConnectedDiscovery } from '@/components/connected-discovery';
import { usesSupabase } from '@/lib/backend/config';
import { Suspense } from 'react';
export const metadata = { title: "Discover", robots: { index: false, follow: false } };
async function Content({ searchParams }: { searchParams: Promise<{ gender?: string; interest?: string; personality?: string;page?:string }> }) { const filters = await searchParams; return usesSupabase() ? <ConnectedDiscovery filters={filters} /> : <Discovery initialFilters={filters} />; }
export default function Page({searchParams}:{searchParams:Promise<{gender?:string;interest?:string;personality?:string;page?:string}>}) { return <Suspense fallback={<LoadingState label="Loading characters…" />}><Content searchParams={searchParams}/></Suspense>; }
