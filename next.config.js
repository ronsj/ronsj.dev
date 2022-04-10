/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    concurrentFeatures: true,
    serverComponents: true,
  },
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
