import type { NextConfig } from "next";

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate"
  },
  {
    key: "Pragma",
    value: "no-cache"
  },
  {
    key: "Expires",
    value: "0"
  }
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      "/",
      "/dashboard/:path*",
      "/bills/:path*",
      "/income/:path*",
      "/driver-log/:path*",
      "/settings/:path*",
      "/pricing/:path*",
      "/login",
      "/signup",
      "/manifest.json",
      "/sw.js",
      "/api/:path*"
    ].map((source) => ({
      source,
      headers: noStoreHeaders
    }));
  }
};

export default nextConfig;
