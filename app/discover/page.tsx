export const instant = false;
import { Discovery } from "@/components/discovery";
import { ConnectedDiscovery } from '@/components/connected-discovery';
import { usesSupabase } from '@/lib/backend/config';
import { Suspense } from 'react';
export const metadata = { title: "Discover", robots: { index: false, follow: false } };
async function Connected({ searchParams }: { searchParams: Promise<{ gender?: string; interest?: string; personality?: string;page?:string }> }) { return <ConnectedDiscovery filters={await searchParams} />; }
export default function Page({searchParams}:{searchParams:Promise<{gender?:string;interest?:string;personality?:string;page?:string}>}) { return usesSupabase()?<Suspense fallback={<p role="status">Loading characters…</p>}><Connected searchParams={searchParams}/></Suspense>:<Discovery/>; }
