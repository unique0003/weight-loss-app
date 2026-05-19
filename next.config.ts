/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // ขยายให้รองรับรูปได้ถึง 10MB
    },
  },
};

export default nextConfig;
