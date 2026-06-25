import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: 'standalone',
  // Tell Turbopack where the project root is so it doesn't get confused
  // by the parent directory structure on Vercel/local dev.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
