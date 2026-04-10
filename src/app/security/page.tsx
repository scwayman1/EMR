import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Security & Data Ownership — Green Path Health",
  description:
    "Your data belongs to you. Learn about our security practices and data ownership framework.",
};

const SECURITY_PILLARS = [
  {
    title: "HIPAA Compliance",
    icon: "shield",
    description:
      "Full HIPAA compliance with administrative, physical, and technical safeguards. Business Associate Agreements with all infrastructure partners. Regular security audits and risk assessments.",
    badges: ["HIPAA", "BAA", "Risk Assessment"],
  },
  {
    title: "Encryption at Rest & In Transit",
    icon: "lock",
    description:
      "All patient data is encrypted at rest using AES-256 encryption. All communications use TLS 1.3. Database connections are encrypted with SSL certificates.",
    badges: ["AES-256", "TLS 1.3", "SSL"],
  },
  {
    title: "Access Controls",
    icon: "key",
    description:
      "Role-based access control (RBAC) ensures users only see data relevant to their role. Every access is logged in an immutable audit trail. Multi-factor authentication available for all accounts.",
    badges: ["RBAC", "Audit Log", "MFA"],
  },
  {
    title: "Data Ownership",
    icon: "user",
    description:
      "Your health data is yours — not ours, not AWS's, not anyone else's. You can export your complete medical record at any time. We maintain proprietary ownership controls that ensure your data remains yours even when hosted on cloud infrastructure.",
    badges: ["Patient-owned", "Export anytime", "Portable"],
  },
];

const DATA_RIGHTS = [
  {
    right: "Right to access",
    description:
      "View all of your health data at any time through the patient portal. Complete chart access including notes, labs, messages, assessments, and care plans.",
  },
  {
    right: "Right to export",
    description:
      "Download your complete medical record in standard formats (PDF, CCD/CDA). Print any document directly from the portal.",
  },
  {
    right: "Right to delete",
    description:
      "Request deletion of your data at any time. We comply with applicable state and federal data retention requirements, then permanently remove your information.",
  },
  {
    right: "Right to correct",
    description:
      "Request corrections to any inaccurate information in your medical record. Your care team will review and update accordingly.",
  },
  {
    right: "Right to restrict",
    description:
      "Control who can access your data within the platform. Restrict sharing of specific records, notes, or documents.",
  },
  {
    right: "Right to portability",
    description:
      "Transfer your records to another provider seamlessly via HL7 FHIR interoperability standards. Your data moves with you.",
  },
];

const INFRASTRUCTURE = [
  { label: "Hosting", value: "Render (US data centers)" },
  { label: "Database", value: "PostgreSQL with encrypted connections" },
  { label: "Authentication", value: "Bcrypt-hashed passwords, iron-session cookies" },
  { label: "API Security", value: "Server-side validation, CSRF protection, rate limiting" },
  { label: "Audit Trail", value: "Immutable event log for all sensitive operations" },
  { label: "Backups", value: "Daily automated backups with point-in-time recovery" },
  { label: "Monitoring", value: "Real-time alerting for suspicious access patterns" },
  { label: "Penetration Testing", value: "Annual third-party security assessments" },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 85% 10%, var(--highlight-soft), transparent 65%)," +
            "radial-gradient(ellipse 50% 60% at 10% 90%, var(--accent-soft), transparent 60%)",
        }}
      />

      {/* Nav */}
      <nav className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-12 h-20">
        <Link href="/">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/about"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            About
          </Link>
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Start your care</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pt-12 pb-16">
        <Eyebrow className="mb-6">Security & Data Ownership</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight text-text max-w-3xl">
          Your data belongs to <span className="text-accent">you</span>.
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-2xl leading-relaxed">
          We don&apos;t just protect your data — we believe you own it. Green
          Path Health is built with security by design and patient data
          sovereignty at its core.
        </p>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Security Pillars */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECURITY_PILLARS.map((pillar) => (
            <Card key={pillar.title} tone="raised" className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LeafSprig size={16} className="text-accent" />
                  {pillar.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  {pillar.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pillar.badges.map((badge) => (
                    <Badge key={badge} tone="accent">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Patient Data Rights */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">Your rights</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Patient Data Bill of Rights
          </h2>
          <p className="text-text-muted mt-3 text-[15px] leading-relaxed">
            Every patient on Green Path Health has these fundamental data rights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DATA_RIGHTS.map((item, i) => (
            <div
              key={item.right}
              className="bg-surface-raised rounded-2xl border border-border p-6 shadow-sm card-hover"
            >
              <span className="font-display text-[28px] leading-none text-accent/25 select-none">
                0{i + 1}
              </span>
              <h3 className="font-display text-lg text-text tracking-tight mt-3">
                {item.right}
              </h3>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <EditorialRule className="max-w-[1280px] mx-auto px-6 lg:px-12" />

      {/* Infrastructure */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 py-20">
        <div className="max-w-2xl mb-14">
          <Eyebrow className="mb-4">Infrastructure</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            How we keep your data safe
          </h2>
        </div>

        <Card tone="raised">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-10">
              {INFRASTRUCTURE.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <LeafSprig
                    size={14}
                    className="text-accent/60 mt-1 shrink-0"
                  />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-subtle">
                      {item.label}
                    </p>
                    <p className="text-sm text-text mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-12 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl">
            <Eyebrow className="mb-4">Questions?</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              Security is a conversation.
            </h2>
            <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
              If you have questions about how we handle your data, want to
              request an export, or need to report a security concern — reach
              out anytime.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">Create your account</Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="ghost">
                  About us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-8 flex flex-col gap-4">
          <p className="text-xs italic text-text-muted leading-relaxed max-w-2xl">
            Cannabis should be considered a medicine so please use it carefully
            and judiciously. Do not abuse Cannabis and please respect the plant
            and its healing properties.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <Wordmark size="sm" />
            <p className="text-xs text-text-subtle">
              &copy; {new Date().getFullYear()} Green Path Health. A
              demonstration product — not a substitute for medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
