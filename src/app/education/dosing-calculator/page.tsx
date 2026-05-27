import type { Metadata } from "next";
import { DosingCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "Cannabis dosing calculator — Leafjourney Education",
  description:
    "Plug in your product concentration and target daily dose to see how much volume to take per dose, in mL or drops. For education only — confirm with your clinician.",
};

export default function DosingCalculatorPage() {
  return (
    <main className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">
          Education
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-text tracking-tight mt-2">
          Dosing &amp; concentration calculator
        </h1>
        <p className="text-sm text-text-muted mt-3 max-w-2xl leading-relaxed">
          Pull the dials to see how product concentration, target daily dose,
          and dose splits combine into a per-dose volume. Useful when a label
          says &ldquo;mg per mL&rdquo; but you need to know how many mL — or
          drops — to actually pour.
        </p>
      </header>
      <DosingCalculator />
    </main>
  );
}
