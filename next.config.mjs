import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// This call is required for local development to mock Cloudflare bindings.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

const nextConfigWithCloudflare = () => {
  return nextConfig;
};

export default nextConfigWithCloudflare;
