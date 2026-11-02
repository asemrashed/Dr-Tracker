import type { NextConfig } from 'next';

// Server-side only: where the Express API lives. Never exposed to the browser.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /**
   * Proxy /api/* to the standalone Express server.
   * To the browser the API is same-origin, which keeps the auth cookie first-party
   * (HttpOnly + SameSite=Lax) and removes the need for CORS and third-party cookies.
   */
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
