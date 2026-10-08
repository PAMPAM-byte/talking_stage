import type { SVGProps, ReactNode } from "react";
export type IconName = "discover" | "message" | "settings" | "arrow" | "back" | "close" | "check" | "info" | "warning" | "photo" | "filter" | "people" | "payment" | "shield" | "menu";
const paths: Record<IconName, ReactNode> = {
  discover: <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" /></>,
  message: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3h2a8.5 8.5 0 0 1 8.5 8.5Z" />,
  settings: <><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />, back: <path d="M20 12H4m6-6-6 6 6 6" />, close: <path d="m6 6 12 12M6 18 18 6" />, check: <path d="m5 12 4 4L19 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.1" /></>, warning: <path d="m12 3 10 18H2Zm0 6v5m0 3v.1" />,
  photo: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 17 5-5 4 4 4-7 5 8" /></>,
  filter: <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="16" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m3-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5" /></>,
  payment: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20m-15 5h3" /></>, shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>, menu: <path d="M4 6h16M4 12h16M4 18h16" />,
};
export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) { return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>; }
