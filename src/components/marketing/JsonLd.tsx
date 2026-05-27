import { ldJson } from "@/lib/seo";

/**
 * Renders one or more JSON-LD blocks server-side.
 * Pass a single object or an array; each becomes its own <script> tag —
 * Google prefers separate blocks over a single combined object.
 *
 * Mirrors `@/components/leafmart/JsonLd` but pulls from the marketing
 * `@/lib/seo` so the marketing tree has zero dep on the storefront.
 */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(block) }}
        />
      ))}
    </>
  );
}
