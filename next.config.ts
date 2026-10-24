import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  // Skip repeating codegen-time typechecking on every deployment build.
  typescript: { ignoreBuildErrors: true },
  // Poster fonts are read from disk at runtime; make sure Vercel ships them.
  outputFileTracingIncludes: { "/api/posters/[file]": ["./assets/fonts/**"] },
};

export default withEve(nextConfig);
