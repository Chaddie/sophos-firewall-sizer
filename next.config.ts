import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Site plan files upload directly to Vercel Blob, not through this action,
      // but multi-site submissions with several products can still be sizeable JSON.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
