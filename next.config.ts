import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: '/log', destination: '/diary', permanent: true },
      { source: '/log/new', destination: '/diary', permanent: true },
      { source: '/chat', destination: '/nutritionist', permanent: true },
      { source: '/products', destination: '/diary', permanent: true },
      { source: '/symptoms', destination: '/diary', permanent: true },
      { source: '/symptoms/new', destination: '/diary', permanent: true },
      { source: '/upload', destination: '/scan', permanent: true },
      { source: '/pet', destination: '/settings', permanent: true },
      { source: '/pet/new', destination: '/settings', permanent: true },
      { source: '/pet/:id', destination: '/settings', permanent: true },
      { source: '/analysis', destination: '/', permanent: true },
    ]
  },
};

export default nextConfig;
