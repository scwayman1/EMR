import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts, getProducts } from "@/lib/leafmart/products";
import { ProductDetailClient } from "@/components/leafmart/ProductDetailClient";
import { ProductDetailsList } from "@/components/leafmart/ProductDetailsList";
import { ProductQATab } from "@/components/leafmart/ProductQATab";
import { JsonLd } from "@/components/leafmart/JsonLd";
import { curatedDetailsForLeafmartProduct } from "@/lib/marketplace/product-details";
import { listProductQuestions } from "@/lib/marketplace/qa";
import {
  absoluteUrl,
  breadcrumbList,
  productLd,
} from "@/lib/leafmart/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product" };
  const url = absoluteUrl(`/leafmart/products/${product.slug}`);
  return {
    title: product.name,
    description: product.support,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.name} — ${product.partner}`,
      description: product.support,
      url,
      type: "website",
      siteName: "Leafmart",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.support,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const [related, questions] = await Promise.all([
    getRelatedProducts(params.slug, 3),
    listProductQuestions(params.slug),
  ]);
  const details = curatedDetailsForLeafmartProduct(product);

  const breadcrumbs = breadcrumbList([
    { name: "Leafmart", url: "/leafmart" },
    { name: "Products", url: "/leafmart/products" },
    { name: product.name, url: `/leafmart/products/${product.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[productLd(product), breadcrumbs]} />
      <ProductDetailClient product={product} related={related} />
      <ProductDetailsList details={details} />
      <ProductQATab productSlug={product.slug} initialQuestions={questions} />
    </>
  );
}
