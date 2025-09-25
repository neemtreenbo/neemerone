import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ekfwqainoexczvpuzlgr.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'hcgyxewvxyikvlhejuip.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Improved cache and development configuration
  experimental: {
    // Better cache invalidation
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
      // Better cache management for development
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // Invalidate cache more aggressively for development
        maxAge: 1000 * 60 * 60, // 1 hour
      };

      // Improve hot reload reliability
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next'],
      };

      return config;
    },
  }),
};

export default nextConfig;
