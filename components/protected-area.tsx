import 'server-only';
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { usesSupabase, supabaseConfig } from "@/lib/backend/config";
import { renderAccount } from "@/lib/backend/server";
import { signOutAccount } from "@/lib/backend/account-actions";
import { AppShell, PublicShell } from "./shells";
import { Notice, Skeleton } from "./ui/primitives";
import { ChatLoading } from './chat-loading';
import { ConversationContinuity } from './conversation-continuity';

async function ConnectedArea({ area, children, standalone = false }: { area: string; children: ReactNode; standalone?: boolean }) {
  if (!supabaseConfig()) return <PublicShell><Notice title="Account services are unavailable" tone="warning">Please try again later.</Notice></PublicShell>;
  const path = (await headers()).get("x-talkingstage-path");
  let account;
  try { account = await renderAccount(); }
  catch {
    if (area === 'Messages' && standalone) return <ConversationContinuity key={path} unavailable />;
    return <PublicShell><Notice title="Account temporarily unavailable" tone="warning">We could not check your account. Please try again shortly.{area === 'Payments' && ' If you confirmed a payment, retry the same attempt once the connection returns.'}</Notice></PublicShell>;
  }
  if (!account) redirect("/sign-in");
  if (!account.profile.adult_declared_at) redirect("/onboarding/age");
  if (!account.profile.onboarding_complete) redirect("/onboarding/preferences");
  if (area === "Admin") {
    const role = await account.client.rpc("is_admin");
    if (role.error || role.data !== true) return <PublicShell><Notice title="Administrator access required">This account doesn’t have access to administration.</Notice></PublicShell>;
  }
  if(area==='Messages'&&standalone)return <ConversationContinuity key={path}>{children}</ConversationContinuity>;
  if(area==='Payments')return <AppShell items={[{label:'Discover',icon:'discover',href:'/discover'},{label:'Messages',icon:'message',href:'/messages'},{label:'Settings',icon:'settings',href:'/settings'}]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}>{children}</AppShell>;
  if(area==='Settings')return <AppShell items={[{label:'Discover',icon:'discover',href:'/discover'},{label:'Messages',icon:'message',href:'/messages'},{label:'Settings',icon:'settings',href:'/settings',active:true}]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}>{children}</AppShell>;
  if(area==='Messages')return <AppShell items={[{label:'Discover',icon:'discover',href:'/discover'},{label:'Messages',icon:'message',href:'/messages',active:true},{label:'Settings',icon:'settings',href:'/settings'}]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}>{children}</AppShell>;
  if (area === 'Discover') return <AppShell items={[{label:'Discover',icon:'discover',href:'/discover',active:true},{label:'Messages',icon:'message',href:'/messages'},{label:'Settings',icon:'settings',href:'/settings'}]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}>{children}</AppShell>;
  if (area === "Admin" && (path?.startsWith('/admin/characters') || (path?.startsWith('/admin/reports') || ['/admin/assets','/admin/operations','/admin/audit'].includes(path??'')))) return <AppShell admin items={[{ label: 'Cast', icon: 'discover', href: '/admin/characters', active: path?.startsWith('/admin/characters') }, { label: 'Assets', icon: 'photo', href: '/admin/assets', active: path === '/admin/assets' }, { label: 'Operations', icon: 'settings', href: '/admin/operations', active: path === '/admin/operations' }, {label:'Reports',icon:'shield',href:'/admin/reports',active:path?.startsWith('/admin/reports')},{label:'Activity',icon:'settings',href:'/admin/audit',active:path==='/admin/audit'}]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}>{children}</AppShell>;
  return <AppShell items={[{ label: "Discover", icon: "discover", href: "/discover", active: area === "Discover" }, { label: "Messages", icon: "message", href: "/messages", active: area === "Messages" }, { label: "Settings", icon: "settings", href: "/settings", active: area === "Settings" }]} actions={<form action={signOutAccount}><button className="button button--quiet">Sign out</button></form>}><h1 className="display page-title">{area === "Discover" ? `Welcome, ${account.profile.display_name}.` : area}</h1>{<Notice title={area === "Discover" ? "Characters are being prepared" : "This space isn’t available yet"}><Link href="/settings/preferences">Update your preferences</Link> while we prepare this space.</Notice>}</AppShell>;
}
export function ProtectedArea({ children, area, standalone = false }: { children: ReactNode; area: string; standalone?: boolean }) {
  if (!usesSupabase()) return area === 'Messages' && standalone ? <Suspense fallback={<ChatLoading />}>{children}</Suspense> : <>{children}</>;
  // Unfinished feature adapters stay in the explicit development preview.
  return <Suspense fallback={area === 'Messages' ? <ChatLoading /> : <main id="main-content" className="container shell__main"><span className="sr-only" role="status">Checking your account</span><div className="stack" aria-hidden="true"><Skeleton width="60%" height={32} /><Skeleton height={260} /></div></main>}><ConnectedArea area={area} standalone={standalone}>{children}</ConnectedArea></Suspense>;
}
