/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path((?!backend).*)",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000"}/:path*`,
      },
    ];
  },
  webpack(config) {
    return config;
  },
};
module.exports = nextConfig;
