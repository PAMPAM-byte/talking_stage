import { ProtectedArea } from '@/components/protected-area';
export const instant = false;
export const maxDuration = 60;
import { Chat } from '@/components/chat';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedThread} from '@/components/connected-conversations';
async function Introduction({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string;memory?:string}> }) { const { conversationId } = await params; return usesSupabase()?<ConnectedThread id={conversationId} before={(await searchParams).before} memorySaved={(await searchParams).memory==='saved'}/>:<Chat id={conversationId} />; }
// One boundary owns account verification and the conversation render. Nested
// copies of the same fallback made interrupted streams difficult to recover.
export default function Page({ params,searchParams }: { params: Promise<{ conversationId: string }>;searchParams:Promise<{before?:string;memory?:string}> }) { return <ProtectedArea area="Messages" standalone><Introduction params={params} searchParams={searchParams}/></ProtectedArea>; }
