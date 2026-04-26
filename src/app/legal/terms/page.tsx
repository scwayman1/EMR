import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: 2026-04-25 (Draft v0)</p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account or completing a purchase on Leafjourney
        properties (Leafjourney Health, Leafmart, or any associated mobile
        or web application), you agree to these Terms of Service. If you do
        not agree, do not use the service.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>
          You must be at least 21 years old to purchase any product
          containing more than 0.3% Δ9-THC. Identity may be verified at
          checkout and on delivery.
        </li>
        <li>
          You may only purchase products lawful in your shipping
          jurisdiction. We enforce state-level shipping restrictions on
          our side.
        </li>
      </ul>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your
        account credentials. We reserve the right to suspend or terminate
        accounts for violation of these Terms, fraud, abuse, or misuse of
        the platform.
      </p>

      <h2>4. Conduct</h2>
      <ul>
        <li>No reselling of products purchased through the platform.</li>
        <li>No fraud, chargeback abuse, or misrepresentation.</li>
        <li>No interference with the technical operation of the service.</li>
      </ul>

      <h2>5. Medical disclaimer</h2>
      <p>
        Leafjourney content and product listings are not medical advice
        and are not intended to diagnose, treat, cure, or prevent any
        disease. Talk to a qualified clinician before starting, stopping,
        or changing any treatment.
      </p>

      <h2>6. Refunds, returns, and chargebacks</h2>
      <p>
        Refunds and returns are governed by our{" "}
        <a href="/legal/returns">Returns Policy</a>. Chargeback handling
        is described in the <a href="/legal/disputes">Disputes Policy</a>.
      </p>

      <h2>7. Arbitration and governing law</h2>
      <p>
        Disputes arising under these Terms will be resolved through
        binding arbitration on an individual basis, except where
        prohibited by law. Governing law: <em>placeholder pending
        counsel.</em>
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms; material changes are posted with at
        least 30 days&rsquo; notice via email and a banner in the
        application.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions: <a href="mailto:legal@leafjourney.com">legal@leafjourney.com</a>.
      </p>
    </>
  );
}
