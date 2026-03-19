import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// In development, set up Cloudflare platform bindings (D1, KV, R2, etc.)
// so that getCloudflareContext().env.DB is available during `npm run dev`.
// Note: no await needed — the function handles timing internally.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
