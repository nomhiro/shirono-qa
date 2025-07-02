/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静的エクスポートを有効化
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'build', // Azure Static Web Appsが期待するフォルダー名
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // 静的エクスポートでは画像最適化を無効化
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif']
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
  }
}

module.exports = nextConfig