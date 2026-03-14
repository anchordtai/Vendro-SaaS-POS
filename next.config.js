/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'images.unsplash.com'],
  },
  experimental: {
    optimizePackageImports: true,
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
  transpilePackages: ['tailwindcss'],
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn']
    }
  }
}

module.exports = nextConfig
