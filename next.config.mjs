
/** @type {import('next').NextConfig} */
const nextConfig = {
    // Always defined at build time so the login page's demo-credential code is compiled out unless enabled.
    env: {
        NEXT_PUBLIC_SHOW_DEMO_LOGIN: process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN || 'false',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'ui-avatars.com',
            },
        ],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    }
                ]
            }
        ]
    },
    output: 'standalone'
};

export default nextConfig;
