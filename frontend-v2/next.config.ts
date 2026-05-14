import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@deck.gl/layers', '@deck.gl/geo-layers', '@deck.gl/core', '@deck.gl/react', 'luma.gl', '@luma.gl/core', '@luma.gl/engine', '@luma.gl/webgl'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
