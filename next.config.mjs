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
      // EMR-332: shelf renames ("sleep" → "rest", "recovery" →
      // "relief") so the public copy doesn't imply cannabis treats
      // medical sleep disorders or muscle-recovery claims. Permanent
      // redirects so SEO and any external links still pointing at the
      // legacy slugs land on the canonical shelf.
      {
        source: "/leafmart/category/sleep",
        destination: "/leafmart/category/rest",
        permanent: true,
      },
      {
        source: "/leafmart/category/recovery",
        destination: "/leafmart/category/relief",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
