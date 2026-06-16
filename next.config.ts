import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [
      {
        // Serve the search page at the legacy /search.html URL.
        // The browser URL stays /search.html; the internal route is /search.
        source: "/search.html",
        destination: "/search",
      },
    ];
  },
};

export default nextConfig;
