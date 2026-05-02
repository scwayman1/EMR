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
      // Shelf renames — preserve any external/SEO links into the old slugs.
      { source: "/leafmart/category/sleep", destination: "/leafmart/category/rest", permanent: true },
      { source: "/leafmart/category/recovery", destination: "/leafmart/category/relief", permanent: true },
    ];
  },
};

export default nextConfig;
