import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize Cloudflare dev bindings immediately at module load time.
initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default nextConfig;
