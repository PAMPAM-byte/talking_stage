export const instant = false;
import { Suspense } from 'react';
import { Chat } from '@/components/chat';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedThread} from '@/components/connected-conversations';
async function Introduction({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string}> }) { const { conversationId } = await params; return usesSupabase()?<ConnectedThread id={conversationId} before={(await searchParams).before}/>:<Chat id={conversationId} />; }
export default function Page({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string}> }) { return <Suspense fallback={<p role="status">Loading conversation…</p>}><Introduction params={params} searchParams={searchParams}/></Suspense>; }
