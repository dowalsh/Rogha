/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  experimental: {
    // Default dynamic-route prefetch cache TTL is 30s — bumped so the
    // latest-edition preloader's warm-up survives a realistic browsing
    // pause before the user clicks through.
    staleTimes: {
      dynamic: 60,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "whczy8zi60.ufs.sh", pathname: "/f/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/f/**" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(?:.*\\.)?rogha\\.vercel\\.app" }],
        destination: "https://rogha.dylanwalsh.ie/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
