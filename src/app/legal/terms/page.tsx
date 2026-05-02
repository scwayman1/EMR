import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

/**
 * EMR-336 — LeafMart Terms of Service core clauses.
 *
 * Section structure mirrors Dr. Patel's required-clause spec so a human
 * lawyer can sign off section-by-section without reformatting:
 *   1. Acceptance / 2. Eligibility / 3. Accounts / 4. Conduct
 *   5. No medical advice / 6. Assumption of risk
 *   7. Limitation of liability / 8. Indemnification
 *   9. State compliance + Farm-Bill scope
 *   10. Refunds / Returns / Chargebacks
 *   11. Arbitration + class-action waiver
 *   12. Changes / 13. Contact
 *
 * Every clause that ships in production must be reviewed by outside
 * counsel before the public launch (tracked in EMR-258).
 */
export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>Last updated: 2026-05-02 (Draft v1 — pending outside-counsel review)</p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account or completing a purchase on Leafjourney
        properties (Leafjourney Health, Leafmart, or any associated mobile
        or web application, collectively the &ldquo;Service&rdquo;), you
        agree to these Terms of Service and all referenced policies. If
        you do not agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>
          You must be at least 21 years old to view, add to cart, or
          purchase any product containing cannabinoids. Identity and
          age may be verified at checkout and on delivery.
        </li>
        <li>
          You may only purchase products lawful in your shipping
          jurisdiction. We enforce state-level and address-level
          shipping restrictions on our side, but the buyer is
          responsible for compliance with the laws of their delivery
          location, workplace, and any school, military, or
          professional-licensing program.
        </li>
      </ul>

      <h2>3. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your
        account credentials. We reserve the right to suspend or terminate
        accounts for violation of these Terms, fraud, abuse, or misuse of
        the Service. Accounts are non-transferable.
      </p>

      <h2>4. Conduct</h2>
      <ul>
        <li>No reselling or redistribution of products purchased through the platform.</li>
        <li>No fraud, chargeback abuse, identity misrepresentation, or use of stolen payment instruments.</li>
        <li>No interference with the technical operation of the Service.</li>
        <li>No use of the Service to evade state or federal law in your jurisdiction.</li>
      </ul>

      <h2 id="no-medical-advice">5. No medical advice</h2>
      <p>
        The content and products available through the Service are
        provided for informational and retail purposes only and do not
        constitute medical advice, diagnosis, or treatment. Use of the
        Service does not create a physician-patient relationship between
        you and Leafjourney, its founders, employees, or any clinician
        affiliated with the platform. Information, dosing suggestions,
        product descriptions, and educational content are general and
        not personalized to your medical history. Always seek the advice
        of a qualified licensed healthcare provider with any questions
        regarding your health, medications, or any condition. Never
        disregard, delay, or avoid professional medical advice because
        of something you have read on the Service.
      </p>

      <h2 id="dosing-waiver">6. Assumption of risk &amp; dosing waiver</h2>
      <p>
        You acknowledge that cannabinoid products carry inherent risks,
        including but not limited to: drug-drug interactions, impairment,
        positive results on workplace or sport drug tests, allergic
        reactions, and individual idiosyncratic responses. Dosing
        guidance published on the Service is general and starts-low,
        goes-slow oriented; it is not personalized. By purchasing or
        using any product, you assume full responsibility for the use,
        storage, and consequences of use, including any consequences
        related to operating vehicles or machinery, employment, military
        or professional-licensing status, parenting decisions, or
        interactions with prescribed medications. You acknowledge that
        you are required to consult your provider before starting,
        changing, or stopping any dose.
      </p>

      <h2 id="limitation-of-liability">7. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Leafjourney and its
        affiliates, officers, employees, and clinicians shall not be
        liable for any indirect, incidental, special, consequential, or
        punitive damages, or any loss of profits, revenues, data, or
        goodwill, arising out of or related to your use of the Service
        or any product purchased through it. Our aggregate liability for
        any claim arising under these Terms shall not exceed the amount
        you paid for the specific product giving rise to the claim, or
        one hundred U.S. dollars (USD 100), whichever is greater.
      </p>

      <h2 id="indemnification">8. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless Leafjourney,
        its affiliates, founders, employees, and clinicians from any
        claim, demand, loss, or expense (including reasonable attorneys&rsquo;
        fees) arising out of: (a) your breach of these Terms or any
        referenced policy; (b) your misuse of any product purchased
        through the Service, including failure to consult a provider
        before changing a dose; (c) your violation of any law or
        regulation in your shipping or use jurisdiction; or (d) your
        infringement of any third-party right.
      </p>

      <h2 id="state-compliance">9. State compliance &amp; Farm-Bill scope</h2>
      <p>
        Leafmart sells only hemp-derived products that are legal under
        the federal 2018 Farm Bill (less than 0.3% delta-9 THC by dry
        weight). Leafmart does not ship to military bases (APO/FPO/DPO,
        AA/AE/AP), VA medical facilities, U.S. territories, or
        international addresses. Some U.S. states impose additional
        restrictions on hemp-derived products; orders to restricted
        states are blocked at checkout. Buyers are responsible for
        verifying that their use is lawful where they live, work, or
        operate.
      </p>

      <h2 id="refunds">10. Refunds, returns, and chargebacks</h2>
      <p>
        Refunds and returns are governed by our{" "}
        <a href="/legal/returns">Returns Policy</a>. Chargeback handling
        is described in the <a href="/legal/disputes">Disputes Policy</a>.
        Filing a chargeback in lieu of contacting support, where the
        underlying transaction is valid, is a violation of these Terms.
      </p>

      <h2 id="arbitration">11. Arbitration and class-action waiver</h2>
      <p>
        Any dispute, claim, or controversy arising out of or relating to
        these Terms or your use of the Service shall be resolved through
        binding individual arbitration administered by the American
        Arbitration Association under its Consumer Arbitration Rules.
        <strong>
          {" "}You and Leafjourney each waive the right to a trial by
          jury and the right to participate in a class action, class
          arbitration, or representative action.
        </strong>{" "}
        You may opt out of this arbitration provision by sending written
        notice within 30 days of account creation to the contact address
        below. Governing law: <em>placeholder pending counsel.</em>
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms; material changes are posted with at
        least 30 days&rsquo; notice via email and a banner in the
        application. Continued use after the effective date constitutes
        acceptance.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions: <a href="mailto:legal@leafjourney.com">legal@leafjourney.com</a>.
      </p>
    </>
  );
}
