import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { PricingClient } from "./PricingClient";

export const metadata = {
  title: "Pricing — Leafjourney",
  description:
    "Simple, transparent pricing for cannabis healthcare. Start free, scale when ready.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />
      <PricingClient />
      <SiteFooter />
    </div>
  );
}
