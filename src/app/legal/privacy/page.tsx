import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Last updated: 2026-04-25 (Draft v0)</p>

      <h2>1. What we collect</h2>
      <ul>
        <li>
          <strong>Account information</strong> — name, email, phone,
          shipping address, date of birth (for age verification).
        </li>
        <li>
          <strong>Order information</strong> — products purchased,
          quantities, prices, payment method metadata. We do not store
          full card numbers; payment processing is handled by Payabli.
        </li>
        <li>
          <strong>Patient information</strong> — for clinical accounts,
          information you provide as part of your treatment record. This
          is treated as Protected Health Information (PHI).
        </li>
        <li>
          <strong>Outcome and product feedback</strong> — what you tell
          us about how a product worked for you, in aggregate or attached
          to your record.
        </li>
        <li>
          <strong>Technical data</strong> — IP address, device type,
          pages visited, timestamps.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To fulfill your orders and operate the service.</li>
        <li>
          To provide aggregate, de-identified outcome data to vendors
          (e.g., &ldquo;patients using Product X report a 32% average
          reduction in sleep onset latency&rdquo;) — never patient-level.
        </li>
        <li>
          To improve product recommendations within your treatment
          context.
        </li>
        <li>
          To meet legal, tax, accounting, and compliance obligations.
        </li>
      </ul>

      <h2>3. What we will never do</h2>
      <ul>
        <li>Sell your personal information.</li>
        <li>Share patient-level health information with vendors.</li>
        <li>Use your data for a competing house brand without explicit consent.</li>
      </ul>

      <h2>4. State privacy rights (CCPA/CPRA and equivalents)</h2>
      <p>
        Residents of California, Virginia, Colorado, Connecticut, Utah,
        and other states with comprehensive privacy laws have rights to
        access, correct, delete, and port their personal information,
        and to opt out of certain processing. Submit requests to{" "}
        <a href="mailto:privacy@leafjourney.com">privacy@leafjourney.com</a>.
      </p>

      <h2>5. Retention</h2>
      <p>
        We retain account and order records for the duration of your
        account plus the period required by tax, accounting, and
        applicable health-record retention laws (typically 7 years for
        financial records and longer for clinical records).
      </p>

      <h2>6. Security</h2>
      <p>
        We use industry-standard encryption in transit (TLS 1.2+) and at
        rest. Payment information is tokenized through Payabli; we do
        not store full card data.
      </p>

      <h2>7. Children</h2>
      <p>
        Leafjourney is not directed to children. We do not knowingly
        collect personal information from anyone under 18.
      </p>

      <h2>8. Contact</h2>
      <p>
        Data Protection Officer:{" "}
        <a href="mailto:privacy@leafjourney.com">privacy@leafjourney.com</a>.
      </p>
    </>
  );
}
