import type { Metadata } from "next";

export const metadata: Metadata = { title: "Disputes & Resolution" };

export default function DisputesPage() {
  return (
    <>
      <h1>Disputes & Resolution</h1>
      <p>Last updated: 2026-04-25 (Draft v0)</p>

      <h2>1. Contact us first</h2>
      <p>
        Most issues are resolved fastest by emailing us directly:
        <a href="mailto:support@leafjourney.com">support@leafjourney.com</a>.
        We respond within 1 business day. We&rsquo;d much rather fix
        something than fight about it.
      </p>

      <h2>2. Refund requests</h2>
      <p>
        Refunds for eligible returns are handled per the{" "}
        <a href="/legal/returns">Returns Policy</a>. Refunds for orders
        that never arrived are handled per the{" "}
        <a href="/legal/shipping">Shipping Policy</a>.
      </p>

      <h2>3. Chargebacks</h2>
      <ul>
        <li>
          If you file a chargeback with your card issuer, we&rsquo;ll be
          notified by Payabli within 24 hours and will reach out to
          gather context.
        </li>
        <li>
          Your account is provisionally debited at the time of
          chargeback; the funds are restored if the dispute is resolved
          in your favor.
        </li>
        <li>
          We document order, shipping, and delivery confirmation
          evidence and submit it through Payabli&rsquo;s evidence
          portal. Card networks make the final determination.
        </li>
        <li>
          Repeated chargeback abuse without prior contact may result in
          account suspension.
        </li>
      </ul>

      <h2>4. Vendor disputes</h2>
      <p>
        We own first-line customer service for the first 14 days after
        delivery. If a dispute is between you and a vendor about
        product quality, COA accuracy, or fulfillment, contact us and
        we will mediate. Vendors are expected to respond to escalations
        within 24 hours.
      </p>

      <h2>5. Arbitration</h2>
      <p>
        Disputes that cannot be resolved through the steps above are
        handled per the arbitration clause in the{" "}
        <a href="/legal/terms">Terms of Service</a>. Governing law and
        arbitration venue are described there.
      </p>

      <h2>6. Class action waiver</h2>
      <p>
        <em>Pending counsel review.</em> The final Terms will state
        whether disputes proceed individually or via class action.
      </p>

      <h2>7. Contact</h2>
      <p>
        <a href="mailto:support@leafjourney.com">support@leafjourney.com</a> for
        all disputes. Legal escalations:{" "}
        <a href="mailto:legal@leafjourney.com">legal@leafjourney.com</a>.
      </p>
    </>
  );
}
