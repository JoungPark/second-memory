import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@second-memory/ui', '@second-memory/client-sdk'],
};

export default nextConfig;
