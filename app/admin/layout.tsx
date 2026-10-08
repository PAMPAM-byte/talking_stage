import { Suspense, type ReactNode } from 'react';
import { AdminFrame } from '@talkingstage/admin-ui';
// Development access is selected in browser storage; wait for that preview state.
export const instant = false;
export default function Layout({ children }: { children: ReactNode }) { return <Suspense fallback={<p>Checking administration preview…</p>}><AdminFrame>{children}</AdminFrame></Suspense>; }
