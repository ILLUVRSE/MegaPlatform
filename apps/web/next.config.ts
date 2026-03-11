import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // TODO(typed-routes): keep disabled until route literal cleanup in docs/typed-routes-plan.md is completed.
  typedRoutes: false,
  transpilePackages: ["@illuvrse/db", "@illuvrse/audit", "@illuvrse/ui"]
};

export default nextConfig;
