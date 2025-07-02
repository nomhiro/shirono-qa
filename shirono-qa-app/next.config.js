/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to enable server-side features
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'], // Add your domain when deployed
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig