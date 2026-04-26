import { getProducts } from "@/lib/leafmart/products";
import { SearchClient } from "./search-client";

export const metadata = {
  title: "Search the shelf",
  description:
    "Search physician-curated cannabis wellness products by name, partner, format, or how you want to feel.",
};

export default async function SearchPage() {
  const products = await getProducts();
  return <SearchClient products={products} />;
}
