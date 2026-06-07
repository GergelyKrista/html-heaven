import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Make getCloudflareContext() work during `next dev` — wires up the LOCAL
// simulated bindings from wrangler.toml (the .wrangler/state D1, not prod).
// Without this, every D1-backed feature (likes, comments, ArcH) 500s in dev.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
