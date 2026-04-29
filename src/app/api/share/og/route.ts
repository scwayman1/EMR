// EMR-308 — Leaf-art OG card endpoint.
// `?seed=<canonical-url>&title=<title>` returns the SVG. Platforms
// fetch it for OG image previews. The seed→palette mapping is
// deterministic, so the same URL always produces the same card.

import { buildLeafArtSvg } from "@/components/share";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? "leafjourney";
  const title = searchParams.get("title") ?? undefined;

  const svg = buildLeafArtSvg({ seed, title });

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
