/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'pdf-parse'],
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb'
    }
  }
};

export default nextConfig;
