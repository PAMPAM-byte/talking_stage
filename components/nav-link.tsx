"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { likesBadge } from "@/lib/likes-badge";

// Layouts render once and persist across client navigation, so a highlight worked out on the
// server sticks to the first page opened (9 Nov 2026: Operations stayed selected on Reports).
// With `match`, the current page is read in the browser and follows every navigation.
export function NavLink({ href, match, active, className, badge, children }: { href: string; match?: "exact" | "prefix"; active?: boolean; className: string; badge?: number; children: ReactNode }) {
  const path = usePathname();
  const current = match ? path === href || (match === "prefix" && path.startsWith(`${href}/`)) : active;
  return <Link href={href} className={className} aria-current={current ? "page" : undefined}>{children}{badge !== undefined && <LikesCount initial={badge} />}</Link>;
}

/** New likes back (14 Nov 2026); kept fresh by the likes watcher. */
function LikesCount({ initial }: { initial: number }) {
  useEffect(() => { if (likesBadge.get() === null) likesBadge.set(initial); }, [initial]);
  const live = useSyncExternalStore(likesBadge.subscribe, likesBadge.get, () => null);
  const count = live ?? initial;
  return count > 0 ? <span className="nav-badge"><span aria-hidden="true">{count > 9 ? '9+' : count}</span><span className="sr-only">, {count} new</span></span> : null;
}
