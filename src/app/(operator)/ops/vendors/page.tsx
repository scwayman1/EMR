import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import type { Vendor } from "@/lib/domain/overnight-batch";
import { VendorsView } from "./vendors-view";

export const metadata = { title: "Vendor Directory" };

const DEMO_VENDORS: Vendor[] = [
  {
    id: "v-1",
    name: "Leafjourney Cloud (internal)",
    category: "IT",
    contactName: "Account Manager",
    email: "success@leafjourney.com",
    phone: "(555) 010-2233",
    contractEnds: "2027-01-01",
    monthlyCost: 399,
    active: true,
  },
  {
    id: "v-2",
    name: "ChatCB PubMed API",
    category: "Software",
    contactName: "Technical Liaison",
    email: "api@chatcb.example",
    contractEnds: "2026-05-30",
    monthlyCost: 249,
    active: true,
  },
  {
    id: "v-3",
    name: "Henry Schein",
    category: "Medical Supplies",
    contactName: "Rep: S. Nguyen",
    phone: "(800) 555-9901",
    email: "sales@henryschein.example",
    contractEnds: "2026-12-15",
    monthlyCost: 1200,
    active: true,
  },
  {
    id: "v-4",
    name: "BlueCross Payer Portal",
    category: "Insurance",
    contactName: "Provider Services",
    phone: "(800) 555-2020",
    contractEnds: "2027-06-30",
    active: true,
  },
  {
    id: "v-5",
    name: "Caldwell Compliance Law",
    category: "Legal",
    contactName: "E. Caldwell, Esq.",
    email: "ec@caldwell.example",
    contractEnds: "2026-05-05",
    monthlyCost: 850,
    active: true,
  },
  {
    id: "v-6",
    name: "LedgerWorks Accounting",
    category: "Accounting",
    contactName: "M. Guerrero",
    email: "mg@ledgerworks.example",
    contractEnds: "2026-11-01",
    monthlyCost: 1450,
    active: true,
  },
  {
    id: "v-7",
    name: "FreshStart Cleaning Co.",
    category: "Cleaning",
    contactName: "Dispatch",
    phone: "(555) 303-8811",
    contractEnds: "2026-09-30",
    monthlyCost: 640,
    active: true,
  },
  {
    id: "v-8",
    name: "Terra Marketing Group",
    category: "Marketing",
    contactName: "J. Park",
    email: "jp@terramark.example",
    contractEnds: "2026-07-20",
    monthlyCost: 2100,
    active: true,
  },
];

export default async function VendorsPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Vendor directory"
        description="All contracted vendors in one place, with contract end-date alerts."
      />
      <VendorsView initialVendors={DEMO_VENDORS} />
    </PageShell>
  );
}
