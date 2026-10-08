import { Suspense } from 'react';
import { Chat } from '@/components/chat';
async function Introduction({ params }: { params: Promise<{ conversationId: string }> }) { const { conversationId } = await params; return <Chat id={conversationId} />; }
export default function Page({ params }: { params: Promise<{ conversationId: string }> }) { return <Suspense fallback={<p role="status">Loading conversation…</p>}><Introduction params={params} /></Suspense>; }
