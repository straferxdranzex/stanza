// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', 'gsap'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'elevatopiano.com'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
              "frame-src https://js.stripe.com https://zoom.us",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
              "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/payments/webhook',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/student', permanent: false },
    ]
  },
}

export default nextConfig
