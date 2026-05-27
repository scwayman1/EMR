import { NextResponse } from "next/server";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";
import {
  parseListParam,
  searchProducts,
  type SortKey,
} from "@/lib/leafmart/search";

export const runtime = "nodejs";

const ALLOWED_SORTS = new Set<SortKey>(["relevance", "price-asc", "price-desc", "outcome"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const categories = parseListParam(url.searchParams.get("cat"));
  const formats = parseListParam(url.searchParams.get("format"));
  const prices = parseListParam(url.searchParams.get("price"));
  const sortRaw = url.searchParams.get("sort") ?? "relevance";
  const sort: SortKey = (ALLOWED_SORTS.has(sortRaw as SortKey) ? sortRaw : "relevance") as SortKey;

  // TODO: swap DEMO_PRODUCTS for a Supabase query when Ticket #1 lands.
  const result = searchProducts(
    { q, categories, formats, prices, sort },
    DEMO_PRODUCTS,
  );

  return NextResponse.json(
    { products: result.products, total: result.total },
    {
      status: 200,
      // Short cache — search results are public and inexpensive to recompute
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    },
  );
}
