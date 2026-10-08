import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Isolate real-auth browser checks from the user's running development server.
  distDir: process.env.TALKINGSTAGE_AUTH_TEST === "1" ? ".next-auth" : process.env.TALKINGSTAGE_PREVIEW_TEST === "1" ? ".next-preview" : ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
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
