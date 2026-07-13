/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "https://ecocash-cryptocurrency-investment-s.vercel.app/api/:path*" }
    ]
  },
}

module.exports = nextConfig
