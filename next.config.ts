import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("http://127.0.0.1:54321/**")],
  },
};

export default nextConfig;
