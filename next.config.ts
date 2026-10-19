import type { NextConfig } from "next";
import {networkInterfaces} from 'node:os';

const nextConfig: NextConfig = {
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
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
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
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
