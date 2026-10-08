import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicShell } from '@/components/shells';
export function AdminFrame({ children }: { children: ReactNode }) { return <PublicShell>{children}</PublicShell>; }
export function AdminScreen({ section, id }: { section: string; id?: string }) { void section; void id; return <div className="stack"><h1 className="display page-title">Administration preview unavailable</h1><p>The local operator workspace is available during development. Real administrator sign-in and role enforcement have not been implemented.</p><Link href="/">Back to TalkingStage</Link></div>; }
