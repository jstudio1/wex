/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    },
  },
  // Skip static generation for API routes that require env vars at build time
  // They will be rendered dynamically at runtime
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Enable static page generation optimization
  compress: true,
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Enable prefetching for better navigation performance
  onDemandEntries: {
    maxInactiveAge: 25 * 1000, // Keep pages in memory for 25 seconds
    pagesBufferLength: 5, // Increase buffer for better prefetching
  },
  // Production optimizations
  poweredByHeader: false,
};

export default nextConfig;



