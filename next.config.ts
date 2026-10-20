import type { NextConfig } from "next";

// STATIC_EXPORT=true (npm run build:web) builds a static site that the backend serves from its ./web folder.
const isStaticExport = process.env.STATIC_EXPORT === "true";
const backendUrl = (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/+$/, "");

const nextConfig: NextConfig = isStaticExport
  ? { output: "export", images: { unoptimized: true } }
  : {
      // The API client calls same-origin /api; in dev/server mode forward it to the backend.
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
      },
    };

export default nextConfig;
