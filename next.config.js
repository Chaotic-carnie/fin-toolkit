/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Skip ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 2. Skip TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/web-worker\/cjs\/node\.js/ },
      { message: /Critical dependency/ }
    ];
    return config;
  },
};

export default nextConfig;