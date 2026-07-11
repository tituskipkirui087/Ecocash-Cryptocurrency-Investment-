/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "https://ecocash-api.onrender.com/api/:path*" }
    ]
  },
}

module.exports = nextConfig
