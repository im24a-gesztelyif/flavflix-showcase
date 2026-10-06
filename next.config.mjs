import { fileURLToPath } from "node:url";
import { createStaticAssetHeaders, createStaticAssetVersions } from "./scripts/static-asset-cache.mjs";

const assetVersions = createStaticAssetVersions(fileURLToPath(new URL("./public/", import.meta.url)));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_STATIC_ASSET_VERSIONS: JSON.stringify(assetVersions),
  },
  async headers() {
    return [
      ...createStaticAssetHeaders(assetVersions, process.env.NODE_ENV === "development"),
      {
        source: "/watch/:path*",
        headers: [{ key: "Permissions-Policy", value: "fullscreen=(self)" }],
      },
    ];
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
