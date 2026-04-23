"use client";

/**
 * Patient-facing Cannabis Combo Wheel — EMR-150/181
 *
 * Re-exports the clinician combo wheel component in a patient-friendly
 * wrapper. Same data, same interactivity, but with a warmer intro and
 * no clinical jargon in the header. This is the proprietary tool that
 * should be front-and-center in the patient portal.
 */

// We dynamically import the wheel to avoid duplicating 500+ lines
import dynamic from "next/dynamic";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";

const ComboWheelPage = dynamic(
  () =>
    import(
      "@/app/(clinician)/clinic/research/combo-wheel/page"
    ).then((mod) => mod.default),
  { ssr: false, loading: () => <div className="p-12 text-center text-text-muted">Loading wheel...</div> },
);

export default function PatientComboWheelPage() {
  return (
    <div className="px-6 lg:px-12 py-10">
      <div className="mx-auto w-full max-w-[1100px]">
        <PatientSectionNav section="journey" />
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em] text-accent font-medium mb-3">
            Leafjourney Proprietary Tool
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-tight">
            Cannabis Wellness Wheel
          </h1>
          <p className="text-[15px] text-text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            Explore how different cannabinoids and terpenes work together.
            Select compounds to see their therapeutic profiles, evidence levels,
            and potential combinations for your wellness goals.
          </p>
          <p className="text-xs text-text-subtle mt-4 italic max-w-md mx-auto">
            Always discuss any changes to your cannabis regimen with your care
            team before starting.
          </p>
        </div>
        <ComboWheelPage />
      </div>
    </div>
  );
}
