/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // key_secret and other server-only vars are never exposed; only NEXT_PUBLIC_* reach the client.
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
