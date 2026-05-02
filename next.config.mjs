/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      // EMR-332: shelf renamed from "sleep" → "rest" so we don't imply
      // cannabis treats medical sleep disorders. Permanent redirect for
      // SEO and any external links still pointing at the legacy slug.
      {
        source: "/leafmart/category/sleep",
        destination: "/leafmart/category/rest",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
