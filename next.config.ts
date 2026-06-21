import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type safety is enforced via `tsc --noEmit` separately.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@circle-fin/w3s-pw-web-sdk",
  ],
};

export default nextConfig;
