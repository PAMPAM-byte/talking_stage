import type { NextConfig } from "next";
import {networkInterfaces} from 'node:os';

// Header-based CSP: nonces need fully dynamic rendering, which cacheComponents static shells rule out,
// so Next's inline bootstrap scripts require 'unsafe-inline'. Supabase is only called from the server.
const isDev = process.env.NODE_ENV === 'development';
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://challenges.cloudflare.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Only over HTTPS, so local http://localhost production checks keep loading same-origin assets.
  ...(process.env.TALKINGSTAGE_SITE_URL?.startsWith('https:') ? ['upgrade-insecure-requests'] : []),
].join('; ');
const securityHeaders = [
  // Report-only until TALKINGSTAGE_CSP_ENFORCE=1 at build time; unset it and rebuild to roll back.
  { key: process.env.TALKINGSTAGE_CSP_ENFORCE === '1' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only', value: csp },
  // No preload until the production domain has served HTTPS for some weeks.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // The floating development badge covers chat controls on narrow screens.
  devIndicators: false,
  allowedDevOrigins: Object.values(networkInterfaces()).flatMap(entries=>
    (entries??[]).filter(entry=>entry.family==='IPv4'&&!entry.internal).map(entry=>entry.address)),
  // Isolate real-auth browser checks from the user's running development server.
  distDir: process.env.TALKINGSTAGE_AUTH_TEST === "1" ? ".next-auth" : process.env.TALKINGSTAGE_PREVIEW_TEST === "1" ? ".next-preview" : ".next",
  /* config options here */
  cacheComponents: true,
  images: { qualities: [75, 90] },
  partialPrefetching: true,
  experimental: { agentUpgrade: 'security', serverActions: { bodySizeLimit: '6mb' } },
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
      "@talkingstage/gift-preview": process.env.NODE_ENV === "development"
        ? "./app/dev/gifts/preview.tsx"
        : "./lib/preview-disabled.tsx",
      "@talkingstage/chat-delivery-preview": process.env.NODE_ENV === "development"
        ? "./app/dev/chat-delivery/preview.tsx"
        : "./lib/preview-disabled.tsx",
      "@talkingstage/admin-ui": process.env.NODE_ENV === "development"
        ? "./components/admin/admin-workspace.tsx"
        : "./lib/admin-disabled.tsx",
      "@talkingstage/admin-fixtures": process.env.NODE_ENV === "development"
        ? "./lib/mock/admin-fixtures.ts"
        : "./lib/admin-fixtures-disabled.ts",
      "@talkingstage/preview": process.env.NODE_ENV === "development"
        ? "./app/dev/design-system/preview.tsx"
        : "./lib/preview-disabled.tsx",
    },
    rules: {
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
