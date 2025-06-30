/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to enable server-side features
  images: {
    domains: ['localhost'], // Add your domain when deployed
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig