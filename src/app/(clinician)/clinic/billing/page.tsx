import { redirect } from "next/navigation";

// EMR-178 — The clinician-side "Billing" tab is consolidated into the
// operator Financial Cockpit so there's one canonical surface for AR,
// claims, denials, and dispensary revenue. This route exists only to
// preserve any deep links that still point at /clinic/billing.

export const metadata = { title: "Billing → Financial Cockpit" };

export default function ClinicianBillingRedirectPage() {
  redirect("/ops/financial-cockpit");
}
