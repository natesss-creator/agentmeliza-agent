import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  outputFileTracingIncludes: { "/api/posters/[file]": ["./assets/fonts/**"] },
};

export default nextConfig;
