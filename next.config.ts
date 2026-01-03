import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Enable strict mode for React
    reactStrictMode: true,

    // Disable ESLint during builds to allow migration to complete
    eslint: {
        ignoreDuringBuilds: false,
    },

    // Disable TypeScript errors during builds
    typescript: {
        ignoreBuildErrors: false,
    },

    // Configure image optimization
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
            },
        ],
    },

    // Enable Turbopack for development
    turbopack: {},
};

export default nextConfig;
