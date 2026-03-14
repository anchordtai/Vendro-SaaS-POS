/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'images.unsplash.com'],
  },
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
    esmExternals: true
  },
  webpack: (config, { buildId, dev, isServer, webpack }) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        '@': './src',
        '@/lib': './src/lib',
        '@/components': './src/components'
      }
    };
    return config;
  },
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn']
    }
  }
}

module.exports = nextConfig
