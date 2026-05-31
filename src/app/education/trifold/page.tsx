// EMR-203 — LeafJourney Trifold Reference Guide (public, web-flip version).
//
// Public, dual-audience (patient + provider) reference: cannabinoids,
// terpenes, bioavailability by route, and dosing guidance. Reuses the same
// `@/lib/education/trifold` data as the in-portal printable. Print to PDF
// from the browser, or download the pre-built print-ready PDF.

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, BookOpen } from "lucide-react";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow } from "@/components/ui/ornament";
import { SITE_URL } from "@/lib/seo";
import {
  TRIFOLD_BIOAVAILABILITY,
  TRIFOLD_CANNABINOIDS,
  TRIFOLD_DOSING,
  TRIFOLD_PRINT_CSS,
  TRIFOLD_TERPENES,
} from "@/lib/education/trifold";
import {
  TrifoldPrintButton,
  TrifoldDownloadButton,
} from "@/components/education/TrifoldPrintButton";

export const metadata: Metadata = {
  title: "Reference Guide — Cannabinoids, terpenes & dosing — Leafjourney",
  description:
    "A printable pocket reference for medical cannabis: cannabinoids, terpenes, bioavailability by route, and dosing guidance. Written for both patients and providers.",
  alternates: { canonical: `${SITE_URL}/education/trifold` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "LeafJourney Reference Guide",
    description:
      "Pocket reference: cannabinoids, terpenes, bioavailability, and dosing. For patients and providers.",
    url: `${SITE_URL}/education/trifold`,
    siteName: "Leafjourney",
    type: "website",
  },
};

export default function PublicTrifoldGuidePage() {
  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <style dangerouslySetInnerHTML={{ __html: TRIFOLD_PRINT_CSS }} />

      <main id="main-content">
        <div className="no-print px-6 lg:px-12 py-8 max-w-[11in] mx-auto">
          <Link
            href="/education"
            className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-accent transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back to Education
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <Eyebrow className="mb-2 text-accent">
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                Reference Guide
              </Eyebrow>
              <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight">
                LeafJourney Reference Guide
              </h1>
              <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
                A pocket reference for medical cannabis — cannabinoids,
                terpenes, how each route is absorbed, and how to dose safely.
                Written for both patients and providers. Print to PDF and fold
                along the gutters, or download the print-ready version.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TrifoldPrintButton />
              <TrifoldDownloadButton />
            </div>
          </div>
        </div>

        {/* ── Outside of trifold (panels read 3-1-2 when folded) ─────── */}
        <section className="trifold-page">
          <article className="panel">
            <h2>Bioavailability by route</h2>
            <table>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Onset</th>
                  <th>BA</th>
                </tr>
              </thead>
              <tbody>
                {TRIFOLD_BIOAVAILABILITY.map((b) => (
                  <tr key={b.route}>
                    <td>{b.route}</td>
                    <td>{b.onset}</td>
                    <td>{b.bioavailability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Notes</h3>
            <ul>
              {TRIFOLD_BIOAVAILABILITY.slice(0, 3).map((b) => (
                <li key={b.route}>
                  <strong>{b.route}:</strong> {b.notes}
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>LeafJourney</h2>
            <h3>Reference guide</h3>
            <p>
              Your pocket-sized companion to medical cannabis: cannabinoids,
              terpenes, delivery routes, and dosing. Always discuss changes
              with your care team.
            </p>
            <h3>Quick rules</h3>
            <ul>
              <li>Start low. Go slow. Wait between doses.</li>
              <li>Edibles take 30–120 min — don&apos;t redose.</li>
              <li>1:1 CBD softens THC side effects.</li>
              <li>Never drive within 4–6 hours of THC.</li>
              <li>Tell your provider about <em>all</em> products you use.</li>
            </ul>
            <h3>When to call us</h3>
            <ul>
              <li>Anxiety or panic that lasts &gt;1 hour</li>
              <li>Vomiting or persistent nausea</li>
              <li>Chest pain or rapid heart rate</li>
              <li>Any reaction with prescription meds</li>
            </ul>
          </article>

          <article className="panel">
            <h2>Cannabinoids</h2>
            <table>
              <thead>
                <tr>
                  <th>Compound</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>
                {TRIFOLD_CANNABINOIDS.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="swatch" style={{ backgroundColor: c.color }} />
                      <strong>{c.name}</strong>
                    </td>
                    <td>{c.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Notes</h3>
            <ul>
              {TRIFOLD_CANNABINOIDS.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <strong>{c.name}:</strong> {c.notes}
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* ── Inside of trifold ─────── */}
        <section className="trifold-page">
          <article className="panel">
            <h2>Terpenes</h2>
            <table>
              <thead>
                <tr>
                  <th>Terpene</th>
                  <th>Aroma</th>
                  <th>Effect</th>
                </tr>
              </thead>
              <tbody>
                {TRIFOLD_TERPENES.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="swatch" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </td>
                    <td>{t.aroma}</td>
                    <td>{t.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Also found in</h3>
            <ul>
              {TRIFOLD_TERPENES.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}:</strong> {t.alsoFoundIn}
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Dosing</h2>
            <table>
              <thead>
                <tr>
                  <th>Population</th>
                  <th>Start</th>
                  <th>Ceiling</th>
                </tr>
              </thead>
              <tbody>
                {TRIFOLD_DOSING.map((d) => (
                  <tr key={d.population}>
                    <td>{d.population}</td>
                    <td>{d.startLow}</td>
                    <td>{d.ceiling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Titration tips</h3>
            <ul>
              {TRIFOLD_DOSING.map((d) => (
                <li key={d.population}>
                  <strong>{d.population}:</strong> {d.goSlow}. {d.notes}
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h2>Bioavailability — full table</h2>
            <table>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Onset</th>
                  <th>Duration</th>
                  <th>BA</th>
                </tr>
              </thead>
              <tbody>
                {TRIFOLD_BIOAVAILABILITY.map((b) => (
                  <tr key={b.route}>
                    <td>{b.route}</td>
                    <td>{b.onset}</td>
                    <td>{b.duration}</td>
                    <td>{b.bioavailability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Choosing a route</h3>
            <ul>
              <li><strong>Fast relief:</strong> inhaled or sublingual.</li>
              <li><strong>Long lasting:</strong> edible or capsule.</li>
              <li><strong>Localized pain:</strong> topical balm.</li>
              <li><strong>Severe nausea:</strong> suppository.</li>
            </ul>
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
