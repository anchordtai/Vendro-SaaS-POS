/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'images.unsplash.com', 'vlksqjwupktmvypfmfur.supabase.co'],
    unoptimized: true, // Required for Netlify deployment
  },
  // Path alias is resolved via tsconfig.json paths; ensure webpack matches
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  // Optimize for Netlify serverless functions
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  // Disable server-side features that don't work with serverless
  swcMinify: true,
};

module.exports = nextConfig;
