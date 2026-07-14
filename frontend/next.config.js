/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000"}/:path*`,
      },
    ];
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};
module.exports = nextConfig;
