/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['tonnam.pskwr.com'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
