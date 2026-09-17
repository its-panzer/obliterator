import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Vinext local preview; Vercel serves a static Next.js export.
  ...(process.env.OBLITERATOR_STATIC_EXPORT === "1" ? {
    output: "export" as const,
    distDir: ".next-production",
    typescript: { tsconfigPath: "tsconfig.production.json" },
  } : {}),
};

export default nextConfig;
