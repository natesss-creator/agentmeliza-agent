import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.app.github.dev"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
