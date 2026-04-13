import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// This call is required for local development to mock Cloudflare bindings.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      }
    ],
  },
};

const nextConfigWithCloudflare = () => {
  return nextConfig;
};

export default nextConfigWithCloudflare;
