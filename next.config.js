/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Mencegah situs dibingkai iframe oleh web peretas (mencegah Clickjacking)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Mencegah browser menebak-nebak tipe file secara liar
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Membatasi akses fitur perangkat yang tidak digunakan
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
