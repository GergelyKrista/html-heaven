import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow JSON imports for manifest
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
