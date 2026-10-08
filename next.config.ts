import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    resolveAlias: {
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
