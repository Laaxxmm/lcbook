import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the file-tracing root to THIS app dir so a stray lockfile higher up the tree can't make
  // Next infer the wrong workspace root (silences the "multiple lockfiles" build warning, §17).
  outputFileTracingRoot: __dirname,
  // key_secret and other server-only vars are never exposed; only NEXT_PUBLIC_* reach the client.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
