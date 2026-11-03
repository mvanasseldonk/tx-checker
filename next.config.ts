import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The logo switch (components/brand) is for previews and development only: not on production.
  env: { NEXT_PUBLIC_MARK_PREVIEW: String(process.env.VERCEL_ENV !== "production") },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
