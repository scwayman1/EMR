import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shipping Policy" };

export default function ShippingPage() {
  return (
    <>
      <h1>Shipping Policy</h1>
      <p>Last updated: 2026-04-25 (Draft v0)</p>

      <h2>1. Where we ship</h2>
      <ul>
        <li>
          <strong>Hemp-derived products</strong> ship to all U.S. states
          where federally legal under the 2018 Farm Bill and where the
          state has not enacted a contrary restriction. Excluded states
          are flagged at checkout before payment.
        </li>
        <li>
          <strong>Licensed cannabis products</strong> are available
          intrastate only, in accordance with the dispensary&rsquo;s
          license. The marketplace blocks attempts to ship across state
          lines automatically.
        </li>
      </ul>

      <h2>2. Rates and timelines</h2>
      <ul>
        <li>
          Shipping is calculated per vendor at checkout. Multi-vendor
          carts may show separate shipping totals for each vendor.
        </li>
        <li>
          Orders typically ship within 24 hours of payment capture.
          Delivery timelines depend on carrier, distance, and product
          type.
        </li>
        <li>
          Free shipping thresholds are vendor-specific and shown at
          checkout.
        </li>
      </ul>

      <h2>3. Signature on delivery</h2>
      <p>
        Products containing more than 0.3% Δ9-THC may require a 21+
        adult signature on delivery. Carrier discretion applies.
      </p>

      <h2>4. Lost, damaged, or delayed packages</h2>
      <ul>
        <li>
          Email <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>{" "}
          within 14 days of expected delivery for lost packages.
        </li>
        <li>
          Damaged packages: photograph the package and contents, then
          contact us within 7 days. Do not discard the original
          packaging.
        </li>
        <li>
          Carrier delays beyond our control are not eligible for
          shipping refunds, but we will reissue or refund products that
          do not arrive.
        </li>
      </ul>

      <h2>5. Address accuracy</h2>
      <p>
        Orders ship to the address you provide at checkout. We are not
        responsible for orders shipped to incorrect addresses entered
        by the buyer.
      </p>

      <h2>6. Contact</h2>
      <p>
        Shipping questions:{" "}
        <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>.
      </p>
    </>
  );
}
