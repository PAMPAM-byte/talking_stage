"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Layouts render once and persist across client navigation, so a highlight worked out on the
// server sticks to the first page opened (9 Nov 2026: Operations stayed selected on Reports).
// With `match`, the current page is read in the browser and follows every navigation.
export function NavLink({ href, match, active, className, children }: { href: string; match?: "exact" | "prefix"; active?: boolean; className: string; children: ReactNode }) {
  const path = usePathname();
  const current = match ? path === href || (match === "prefix" && path.startsWith(`${href}/`)) : active;
  return <Link href={href} className={className} aria-current={current ? "page" : undefined}>{children}</Link>;
}
