import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  outputFileTracingIncludes: {
    "/api/posters/[file]": ["./assets/fonts/**"],
    "/api/uhiko/publish-mlolongo": ["./assets/mlolongo/**"],
  },
};

export default nextConfig;
