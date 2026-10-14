export const instant = false;
import { Suspense } from 'react';
import { Chat } from '@/components/chat';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedThread} from '@/components/connected-conversations';
import { ChatLoading } from '@/components/chat-loading';
async function Introduction({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string}> }) { const { conversationId } = await params; return usesSupabase()?<ConnectedThread id={conversationId} before={(await searchParams).before}/>:<Chat id={conversationId} />; }
export default function Page({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string}> }) { return <Suspense fallback={<ChatLoading />}><Introduction params={params} searchParams={searchParams}/></Suspense>; }
