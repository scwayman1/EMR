import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import { ProductDetailClient } from "@/components/leafmart/ProductDetailClient";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.support };
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const related = DEMO_PRODUCTS.filter((p) => p.slug !== params.slug).slice(0, 3);

  return <ProductDetailClient product={product} related={related} />;
}
