/** @type {import('next').NextConfig} */
const nextConfig = {
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
