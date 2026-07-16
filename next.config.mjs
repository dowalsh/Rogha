/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
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
