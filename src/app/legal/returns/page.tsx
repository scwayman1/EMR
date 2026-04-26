import type { Metadata } from "next";

export const metadata: Metadata = { title: "Returns Policy" };

export default function ReturnsPage() {
  return (
    <>
      <h1>Returns Policy</h1>
      <p>Last updated: 2026-04-25 (Draft v0)</p>

      <h2>1. Return window</h2>
      <p>
        Eligible products may be returned within <strong>30 days</strong> of
        delivery. After that window, returns are not accepted except as
        described in section 3.
      </p>

      <h2>2. What can be returned</h2>
      <ul>
        <li>
          <strong>Unopened, undamaged products</strong> in their original
          packaging.
        </li>
        <li>
          <strong>Accessories and apparel</strong> in resaleable
          condition.
        </li>
      </ul>

      <h2>3. What cannot be returned</h2>
      <ul>
        <li>
          <strong>Opened cannabinoid products</strong> — for safety and
          regulatory reasons we cannot accept returns of consumable
          cannabinoid products that have been opened. This includes
          tinctures, topicals once seal-broken, edibles, and inhalable
          products.
        </li>
        <li>
          <strong>Final-sale items</strong> marked as such on the
          product page.
        </li>
      </ul>

      <h2>4. Defective products and COA mismatches</h2>
      <p>
        If a product&rsquo;s actual cannabinoid content materially
        differs from the published Certificate of Analysis (COA), or if
        the product arrived defective, the 30-day window does not apply.
        Email <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>{" "}
        with photos and we&rsquo;ll resolve it. The product is fully
        refundable in this case, opened or not.
      </p>

      <h2>5. How returns work</h2>
      <ol>
        <li>
          Email <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>{" "}
          with your order number to start the return.
        </li>
        <li>
          We provide a prepaid return label or vendor-direct return
          instructions, depending on the vendor.
        </li>
        <li>
          Once the return is received and inspected, a refund is issued
          to the original payment method within 5–10 business days.
        </li>
      </ol>

      <h2>6. Refund amount</h2>
      <ul>
        <li>
          <strong>Standard returns:</strong> product price refunded;
          original shipping not refunded.
        </li>
        <li>
          <strong>Defective or COA-mismatch returns:</strong> product +
          original shipping refunded, no return shipping cost to you.
        </li>
      </ul>

      <h2>7. Contact</h2>
      <p>
        <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>.
      </p>
    </>
  );
}
