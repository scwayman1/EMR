import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/leafmart/products";
import { listGuides } from "@/lib/leafmart/dosing-guides";
import { SITE_URL } from "@/lib/leafmart/seo";

export const revalidate = 3600;

/**
 * Dynamic sitemap for the Leafmart storefront. Includes static marketing
 * pages, every active product, every category shelf, and every dosing
 * guide. Backed by the same data layer as the storefront, so it falls
 * back to demo data when the DB is empty.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/leafmart", changeFrequency: "daily", priority: 1.0 },
    { path: "/leafmart/shop", changeFrequency: "daily", priority: 0.9 },
    { path: "/leafmart/products", changeFrequency: "daily", priority: 0.9 },
    { path: "/leafmart/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/leafmart/faq", changeFrequency: "monthly", priority: 0.6 },
    { path: "/leafmart/quiz", changeFrequency: "monthly", priority: 0.5 },
    { path: "/leafmart/consult", changeFrequency: "monthly", priority: 0.5 },
    { path: "/leafmart/vendors", changeFrequency: "monthly", priority: 0.4 },
    { path: "/leafmart/dosing-guide", changeFrequency: "monthly", priority: 0.5 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  const [products, categories] = await Promise.all([
    getProducts().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/leafmart/products/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/leafmart/category/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const guideEntries: MetadataRoute.Sitemap = listGuides().map((g) => ({
    url: `${SITE_URL}/leafmart/dosing-guide/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...guideEntries];
}
