import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O package-lock.json da raiz faria o Turbopack inferir a raiz do repo como workspace.
  turbopack: { root: __dirname },
};

export default nextConfig;
