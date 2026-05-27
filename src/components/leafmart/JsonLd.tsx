import { ldJson } from "@/lib/leafmart/seo";

/**
 * Renders one or more JSON-LD blocks server-side.
 * Pass a single object or an array; each becomes its own <script> tag,
 * which is what Google recommends over a single combined block.
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
