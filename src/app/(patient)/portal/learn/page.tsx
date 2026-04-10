"use client";

import { useState } from "react";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { LeafSprig, EditorialRule, Eyebrow } from "@/components/ui/ornament";

export default function LearnPage() {
  return (
    <PageShell maxWidth="max-w-[860px]">
      <PageHeader
        eyebrow="Educational Library"
        title="Learn about your care"
        description="Understanding how cannabis medicine works can help you get the most out of your treatment. Take your time with these sections -- they are here whenever you need them."
      />

      {/* ----------------------------------------------------------------
          Hero card
          ---------------------------------------------------------------- */}
      <Card tone="ambient" className="mb-10 p-8 md:p-10">
        <div className="relative z-10 flex flex-col items-center text-center">
          <LeafSprig size={36} className="text-accent mb-4" />
          <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight leading-tight mb-3">
            Knowledge is part of healing
          </h2>
          <p className="text-sm text-text-muted max-w-lg leading-relaxed">
            The more you understand about how cannabis medicine works with your
            body, the more confident you will feel about your care plan. Below
            you will find clear, plain-language guides on each topic.
          </p>
        </div>
      </Card>

      {/* ----------------------------------------------------------------
          Expandable sections
          ---------------------------------------------------------------- */}
      <div className="space-y-0">
        {/* 1 ------------------------------------------------------------ */}
        <ExpandableSection
          number={1}
          title="What is the endocannabinoid system?"
        >
          <div className="prose-clinical space-y-3">
            <p>
              Your body has a built-in system for cannabinoids called the{" "}
              <strong>endocannabinoid system (ECS)</strong>. Scientists discovered
              it in the 1990s, and it turns out every human has one.
            </p>
            <p>
              The ECS helps regulate many important functions:{" "}
              <strong>sleep, pain, mood, appetite, and immune function</strong>.
              It is made up of receptors (tiny docking stations on your cells),
              natural compounds your body makes, and enzymes that break those
              compounds down when they are done working.
            </p>
            <p>
              When you use cannabis medicine, the cannabinoids in the plant work{" "}
              <em>with</em> this system -- not against it.
            </p>
            <div className="mt-4 p-4 rounded-lg bg-accent-soft/40 border border-accent/10">
              <p className="text-sm text-accent font-medium mb-1">
                A helpful way to think about it
              </p>
              <p className="text-sm text-text-muted">
                Think of the ECS as a set of <strong>locks</strong> throughout
                your body. Cannabinoids are the <strong>keys</strong>. Different
                keys fit different locks, which is why different cannabinoids
                can have different effects.
              </p>
            </div>
          </div>
        </ExpandableSection>

        <EditorialRule className="my-6" />

        {/* 2 ------------------------------------------------------------ */}
        <ExpandableSection number={2} title="Understanding cannabinoids">
          <div className="prose-clinical space-y-4">
            <div className="space-y-3">
              <h3>THC (tetrahydrocannabinol)</h3>
              <p>
                This is the cannabinoid most people have heard of. THC can help
                with <strong>pain, nausea, sleep, and appetite</strong>. It is
                also the one that can cause psychoactive effects -- the feeling
                of being &quot;high.&quot; Your care team will help you find a dose where
                you get the benefits without unwanted intensity.
              </p>
            </div>

            <div className="space-y-3">
              <h3>CBD (cannabidiol)</h3>
              <p>
                CBD is <strong>non-intoxicating</strong> -- it will not make you
                feel &quot;high.&quot; Research shows it may help with{" "}
                <strong>anxiety, inflammation, and seizures</strong>. Many
                patients use CBD alongside THC, and it may even soften some of
                THC&apos;s stronger effects.
              </p>
            </div>

            <div className="space-y-3">
              <h3>CBN (cannabinol)</h3>
              <p>
                CBN is <strong>mildly sedating</strong> and is often included in
                products designed for sleep. It is less well-studied than THC or
                CBD, but early research and patient reports are encouraging.
              </p>
            </div>

            <div className="space-y-3">
              <h3>CBG (cannabigerol)</h3>
              <p>
                CBG is sometimes called the &quot;parent cannabinoid&quot; because other
                cannabinoids start as CBG in the plant. Emerging research
                suggests it may help with <strong>anxiety and inflammation</strong>.
                A 2024 clinical trial found that a single 20 mg dose of CBG
                reduced anxiety and stress within 20 minutes.
              </p>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-highlight-soft/40 border border-highlight/10">
              <p className="text-sm text-highlight font-medium mb-1">
                What about terpenes?
              </p>
              <p className="text-sm text-text-muted">
                Terpenes are aromatic compounds found in cannabis (and many other
                plants). They contribute to the smell and may influence effects.
                For example, <strong>myrcene</strong> is associated with
                relaxation, <strong>limonene</strong> with mood uplift, and{" "}
                <strong>linalool</strong> with calm. Your product labels may list
                the dominant terpenes.
              </p>
            </div>
          </div>
        </ExpandableSection>

        <EditorialRule className="my-6" />

        {/* 3 ------------------------------------------------------------ */}
        <ExpandableSection number={3} title="How dosing works">
          <div className="prose-clinical space-y-4">
            <div className="space-y-3">
              <h3>Milligrams vs. milliliters</h3>
              <p>
                A <strong>milligram (mg)</strong> measures the amount of
                cannabinoid -- this is what matters for your dose. A{" "}
                <strong>milliliter (mL)</strong> measures the volume of liquid.
                For example, an oil might contain 10 mg of THC per 1 mL. Your
                care team prescribes in mg so you always know exactly how much
                active medicine you are getting, regardless of the product.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-accent-soft/40 border border-accent/10">
              <p className="text-sm text-accent font-medium mb-1">
                The golden rule of cannabis dosing
              </p>
              <p className="text-sm text-text-muted">
                <strong>&quot;Start low, go slow.&quot;</strong> Begin with the lowest
                recommended dose and only increase gradually. It is much easier
                to take a little more next time than to deal with taking too
                much today.
              </p>
            </div>

            <div className="space-y-3">
              <h3>Delivery methods and timing</h3>
              <p>
                How you take cannabis affects how quickly it starts working and
                how long the effects last.
              </p>
            </div>

            {/* Delivery method table */}
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border-strong/40">
                    <th className="text-left py-2.5 px-3 font-display font-medium text-text">
                      Method
                    </th>
                    <th className="text-left py-2.5 px-3 font-display font-medium text-text">
                      Onset
                    </th>
                    <th className="text-left py-2.5 px-3 font-display font-medium text-text">
                      Duration
                    </th>
                    <th className="text-left py-2.5 px-3 font-display font-medium text-text">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-text">
                      Sublingual
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">15 -- 30 min</td>
                    <td className="py-2.5 px-3 text-text-muted">4 -- 6 hr</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      Drops or spray held under the tongue
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-text">
                      Oral / Edible
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">30 -- 90 min</td>
                    <td className="py-2.5 px-3 text-text-muted">6 -- 8 hr</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      Capsules, gummies, oils swallowed
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-text">
                      Inhalation
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">1 -- 5 min</td>
                    <td className="py-2.5 px-3 text-text-muted">2 -- 3 hr</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      Vaporized flower or concentrate
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-text">
                      Topical
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">15 -- 30 min</td>
                    <td className="py-2.5 px-3 text-text-muted">Varies</td>
                    <td className="py-2.5 px-3 text-text-muted">
                      Local effect only -- creams, balms, patches
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ExpandableSection>

        <EditorialRule className="my-6" />

        {/* 4 ------------------------------------------------------------ */}
        <ExpandableSection number={4} title="What to expect">
          <div className="prose-clinical space-y-4">
            <div className="space-y-3">
              <h3>Common benefits patients report</h3>
              <ul className="list-disc pl-5 space-y-1 text-text-muted">
                <li>Reduced pain or easier pain management</li>
                <li>Better sleep -- falling asleep faster, staying asleep longer</li>
                <li>Less anxiety and a calmer overall feeling</li>
                <li>Improved appetite, especially during cancer treatment</li>
                <li>Reduced nausea and vomiting</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3>Possible side effects</h3>
              <ul className="list-disc pl-5 space-y-1 text-text-muted">
                <li>Dry mouth -- keep water nearby</li>
                <li>Drowsiness -- especially with higher THC doses or CBN</li>
                <li>Increased appetite (&quot;the munchies&quot;)</li>
                <li>Lightheadedness, particularly when standing up quickly</li>
                <li>Mild changes in coordination or reaction time</li>
              </ul>
              <p>
                Most side effects are mild and temporary. They tend to decrease
                as your body adjusts to a stable dose.
              </p>
            </div>

            <div className="mt-2 p-4 rounded-lg bg-[#B83B2E]/5 border border-[#B83B2E]/10">
              <p className="text-sm font-medium text-[#B83B2E] mb-1">
                When to contact your care team
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-text-muted">
                <li>You feel too intoxicated or the effects are overwhelming</li>
                <li>You experience unexpected reactions like racing heart, panic, or paranoia</li>
                <li>Your symptoms are getting worse instead of better</li>
                <li>You have questions before changing your dose</li>
              </ul>
              <p className="text-sm text-text-muted mt-2">
                Do not hesitate to reach out -- that is what your care team is for.
              </p>
            </div>
          </div>
        </ExpandableSection>

        <EditorialRule className="my-6" />

        {/* 5 ------------------------------------------------------------ */}
        <ExpandableSection number={5} title="Tips for success">
          <div className="prose-clinical space-y-3">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-medium text-text">Take your cannabis at consistent times</p>
                  <p className="text-text-muted text-sm mt-0.5">
                    Consistency helps your body build a predictable response and
                    makes it easier to evaluate what is working.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-medium text-text">Log your outcomes regularly</p>
                  <p className="text-text-muted text-sm mt-0.5">
                    Tracking pain, sleep, mood, and other symptoms helps you and
                    your doctor see patterns and make better decisions.{" "}
                    <a
                      href="/portal/outcomes"
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      Go to Outcomes
                    </a>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-medium text-text">Communicate with your care team</p>
                  <p className="text-text-muted text-sm mt-0.5">
                    If something does not feel right -- or if something is
                    working well -- let your team know.{" "}
                    <a
                      href="/portal/messages"
                      className="text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      Send a message
                    </a>
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                  4
                </span>
                <div>
                  <p className="font-medium text-text">Store safely</p>
                  <p className="text-text-muted text-sm mt-0.5">
                    Keep all cannabis products in a secure location, away from
                    children, pets, and direct sunlight. Most products last
                    longer when stored in a cool, dark place.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </ExpandableSection>

        <EditorialRule className="my-6" />

        {/* 6 ------------------------------------------------------------ */}
        <ExpandableSection number={6} title="Free resources">
          <div className="prose-clinical space-y-4">
            <div className="p-5 rounded-lg bg-surface border border-border">
              <h3 className="mb-2">Cannabis and Cancer: Free Book</h3>
              <p>
                Justin Kander&apos;s book is the largest integration of human cases
                and research on cannabis and cancer. It is available for free
                online and is an excellent resource for patients and families.
              </p>
              <a
                href="https://FreeCannabisCancerBook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-accent hover:text-accent-hover underline underline-offset-2"
              >
                Visit FreeCannabisCancerBook.com
                <span aria-hidden="true">&rarr;</span>
              </a>
            </div>
            <p className="text-sm text-text-subtle">
              Your care team may share additional resources tailored to your
              specific condition. Check your{" "}
              <a
                href="/portal/care-plan"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                care plan
              </a>{" "}
              for personalized recommendations.
            </p>
          </div>
        </ExpandableSection>
      </div>

      {/* Bottom ornament */}
      <div className="mt-12 mb-4 flex justify-center">
        <LeafSprig size={28} className="text-accent/40" />
      </div>
    </PageShell>
  );
}

/* ===========================================================================
   Expandable section component
   =========================================================================== */

function ExpandableSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card tone="default" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-6 py-5 flex items-center gap-4 hover:bg-surface-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset rounded-xl"
        aria-expanded={open}
      >
        {/* Numbered circle */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent/30 bg-accent-soft/50 text-accent text-xs font-medium">
          {number}
        </span>

        {/* Title */}
        <span className="font-display text-lg font-medium text-text tracking-tight flex-1">
          {title}
        </span>

        {/* Chevron */}
        <svg
          width={20}
          height={20}
          viewBox="0 0 20 20"
          fill="none"
          className={`shrink-0 text-text-subtle transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expandable content */}
      {open && (
        <div className="px-6 pb-6 pt-0">
          <div className="pl-12">{children}</div>
        </div>
      )}
    </Card>
  );
}
