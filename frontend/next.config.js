/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['tonnam.pskwr.com'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '${process.env.NEXT_PUBLIC_API_URL}/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
