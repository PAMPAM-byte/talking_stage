import { Suspense, type ReactNode } from 'react';
import { AdminFrame } from '@talkingstage/admin-ui';
import { ProtectedArea } from '@/components/protected-area';
import { usesSupabase } from '@/lib/backend/config';
// Development access is selected in browser storage; wait for that preview state.
export const instant = false;
export default function Layout({ children }: { children: ReactNode }) { return usesSupabase() ? <ProtectedArea area="Admin">{children}</ProtectedArea> : <Suspense fallback={<p>Checking administration preview…</p>}><AdminFrame>{children}</AdminFrame></Suspense>; }
