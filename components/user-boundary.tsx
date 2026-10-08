"use client";
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useMockAccount } from './account-provider';
import { accountDestination, signOut } from '@/lib/mock/account';
import { AppShell } from './shells';
import { Button, Skeleton } from './ui/primitives';
export function UserBoundary({ children, active = 'Discover', standalone = false }: { children: ReactNode; active?: string; standalone?: boolean }) {
  const a = useMockAccount(); const router = useRouter();
  const eligible = a.age === 'adult' && a.consent && a.user?.adultAccessState === 'approved' && a.user.onboardingStep === 'complete';
  useEffect(() => { if (a.ready && !eligible) router.replace(a.deleted ? '/account-deleted' : a.age === 'blocked' ? '/onboarding/age' : accountDestination(a.user)); }, [a.ready, eligible, a.age, a.user, a.deleted, router]);
  if (!a.ready || !eligible) return <main id="main-content" className="container shell__main"><span role="status" className="sr-only">Checking adult access</span><Skeleton height={40} width="60%" /></main>;
  if (standalone) return <>{children}</>;
  return <AppShell items={[{ label: 'Discover', icon: 'discover', href: '/discover', active: active === 'Discover' }, { label: 'Messages', icon: 'message', href: '/messages', active: active === 'Messages' }, { label: 'Settings', icon: 'settings', href: '/settings', active: active === 'Settings' }]} actions={<Button variant="quiet" onClick={() => { signOut(); router.replace('/sign-in'); }}>Sign out</Button>}>{children}<p className="preview-footnote caption muted">Frontend preview · fictional adult AI characters · draft cast and photos</p></AppShell>;
}
