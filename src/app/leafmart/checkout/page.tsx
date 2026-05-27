"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart, formatUSD } from "@/lib/leafmart/cart-store";
import { useAgeConfirmation } from "@/lib/leafmart/age-confirmation";
import { AgeGateModal } from "@/components/leafmart/AgeGateModal";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { CheckoutShareModule } from "@/components/leafmart/CheckoutShareModule";

const TAX_RATE = 0.0875;
const STEPS = ["Contact", "Shipping", "Payment", "Confirmation"] as const;
type StepIndex = 0 | 1 | 2 | 3;
type Direction = "forward" | "backward";

// Live validators — used to drive the per-field "valid" check icon as the user types.
const validators = {
  email: (v: string) => /^\S+@\S+\.\S+$/.test(v.trim()),
  phone: (v: string) => v.replace(/\D/g, "").length >= 10,
  required: (v: string) => v.trim().length > 0,
  state: (v: string) => /^[A-Za-z]{2}$/.test(v.trim()),
  zip: (v: string) => /^\d{5}(-\d{4})?$/.test(v.trim()),
  cardNumber: (v: string) => {
    const d = v.replace(/\s/g, "");
    return d.length >= 13 && d.length <= 19 && /^\d+$/.test(d);
  },
  expiry: (v: string) => /^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(v.trim()),
  cvc: (v: string) => /^\d{3,4}$/.test(v.trim()),
};

function FieldCheck({ valid }: { valid: boolean }) {
  // Inline green check that appears once a field becomes valid. Animates the
  // stroke draw so it feels like confirmation rather than a static badge.
  if (!valid) return null;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
    >
      <circle cx="7" cy="7" r="6" fill="var(--leaf)" />
      <path
        d="M4 7.2L6 9L10 5"
        fill="none"
        stroke="#FFF8E8"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="14"
        strokeDashoffset="14"
        className="animate-[draw-check_0.4s_ease-out_forwards]"
      />
    </svg>
  );
}

function ConfettiBurst() {
  // 14 dots with randomized x-drift, color, and rotation. Pure CSS — no JS frame loop.
  const colors = [
    "var(--leaf)",
    "var(--sage)",
    "var(--peach)",
    "var(--butter)",
    "var(--lilac)",
    "var(--mint)",
  ];
  const pieces = Array.from({ length: 14 }, (_, i) => {
    // deterministic-ish pseudo-random offsets so SSR/CSR match — seeded by index.
    const seed = (i + 1) * 9301 + 49297;
    const r = (seed % 233280) / 233280;
    const cx = `${Math.round((r - 0.5) * 320)}px`;
    const cr = `${Math.round(r * 720 - 180)}deg`;
    const delay = `${Math.round(r * 250)}ms`;
    const left = `${10 + Math.round(r * 80)}%`;
    return { i, cx, cr, delay, left, color: colors[i % colors.length] };
  });
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[280px] h-[260px]"
    >
      {pieces.map((p) => (
        <span
          key={p.i}
          className="lm-confetti-piece absolute top-6 w-1.5 h-2.5 rounded-sm"
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
            // CSS vars consumed by the keyframe
            ["--lm-cx" as string]: p.cx,
            ["--lm-cr" as string]: p.cr,
          }}
        />
      ))}
    </span>
  );
}

interface ContactInfo {
  email: string;
  phone: string;
}
interface ShippingInfo {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}
interface PaymentInfo {
  cardNumber: string;
  expiry: string;
  cvc: string;
  nameOnCard: string;
}

function generateOrderNumber() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `LM-${n}`;
}

function StepIndicator({ active }: { active: StepIndex }) {
  // Overall progress through steps 0..3 — drives the connector fill bar.
  const progress = active / (STEPS.length - 1);
  return (
    <div className="relative max-w-[680px] mx-auto mb-12">
      {/* Connector track + animated fill, sits behind the dots */}
      <div
        className="absolute top-3.5 left-[14px] right-[14px] h-px bg-[var(--border)]"
        aria-hidden="true"
      />
      <div
        className="absolute top-3.5 left-[14px] h-px bg-[var(--leaf)] transition-all duration-500 ease-out origin-left"
        style={{ width: `calc((100% - 28px) * ${progress})` }}
        aria-hidden="true"
      />
      <ol className="relative flex items-start justify-between">
        {STEPS.map((label, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <li key={label} className="flex flex-col items-center gap-2 min-w-0">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums transition-all duration-300 relative z-10 ${
                  isActive
                    ? "bg-[var(--ink)] text-[var(--bg)] scale-110 shadow-[0_0_0_4px_var(--bg)]"
                    : isDone
                      ? "bg-[var(--leaf)] text-[var(--bg)] shadow-[0_0_0_4px_var(--bg)]"
                      : "bg-[var(--surface-muted)] text-[var(--muted)] shadow-[0_0_0_4px_var(--bg)]"
                }`}
              >
                {isDone ? (
                  <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
                    <path
                      d="M2.5 5.7L4.5 7.7L8.5 3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`hidden sm:inline text-[11.5px] font-medium tracking-wide uppercase whitespace-nowrap ${
                  isActive ? "text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function fieldClass(opts: { valid?: boolean; error?: boolean } = {}) {
  const base =
    "w-full rounded-2xl border bg-[var(--surface)] pl-4 pr-10 py-3.5 text-[14.5px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)] transition";
  if (opts.error) return `${base} border-[var(--danger)] focus:border-[var(--danger)]`;
  if (opts.valid) return `${base} border-[var(--leaf)]/60 focus:border-[var(--leaf)]`;
  return `${base} border-[var(--border)] focus:border-[var(--leaf)]`;
}

function labelClass() {
  return "block text-[12px] font-medium tracking-wide uppercase text-[var(--text-soft)] mb-1.5";
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const ageConfirmation = useAgeConfirmation();
  const cartRequiresAge = items.some((i) => i.product.requiresAgeVerification);
  const ageGateBlocking =
    cartRequiresAge &&
    ageConfirmation.hydrated &&
    !ageConfirmation.isConfirmed;
  const [ageGateOpen, setAgeGateOpen] = useState(false);

  // Defensive guard: if a user lands on /leafmart/checkout directly (deep
  // link, refresh) with regulated items in cart but no confirmation yet,
  // open the gate before letting them fill in payment info.
  useEffect(() => {
    if (ageGateBlocking) setAgeGateOpen(true);
  }, [ageGateBlocking]);

  const [step, setStep] = useState<StepIndex>(0);
  // Direction drives the slide-in animation when stepping forward vs back.
  const [direction, setDirection] = useState<Direction>("forward");
  // Bumped on every failed validation so the form panel re-keys and shakes.
  const [shakeKey, setShakeKey] = useState(0);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [contact, setContact] = useState<ContactInfo>({ email: "", phone: "" });
  const [shipping, setShipping] = useState<ShippingInfo>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
  });
  const [payment, setPayment] = useState<PaymentInfo>({
    cardNumber: "",
    expiry: "",
    cvc: "",
    nameOnCard: "",
  });
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = subtotal + tax;

  // Snapshot the cart at confirmation so the summary still renders after we clear
  const [confirmedSnapshot, setConfirmedSnapshot] = useState<{
    items: typeof items;
    subtotal: number;
    tax: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (step !== 3 && items.length === 0 && !confirmedSnapshot) {
      // user landed on checkout with empty cart — keep them on step 0 anyway
    }
  }, [step, items.length, confirmedSnapshot]);

  // Prefill shipping (and contact email/phone if available) from the user's
  // default saved address on mount. Silently no-ops when not signed in or
  // when the user has already started typing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leafmart/addresses");
        if (!res.ok) return;
        const data: {
          addresses: Array<{
            firstName: string;
            lastName: string;
            address1: string;
            address2?: string | null;
            city: string;
            state: string;
            postalCode: string;
            phone?: string | null;
            isDefault: boolean;
          }>;
        } = await res.json();
        if (cancelled) return;
        const def = data.addresses.find((a) => a.isDefault) ?? data.addresses[0];
        if (!def) return;
        setShipping((prev) =>
          // Only prefill blank shipping — never overwrite user input.
          prev.firstName || prev.lastName || prev.address1
            ? prev
            : {
                firstName: def.firstName,
                lastName: def.lastName,
                address1: def.address1,
                address2: def.address2 ?? "",
                city: def.city,
                state: def.state,
                zip: def.postalCode,
              },
        );
        if (def.phone) {
          setContact((prev) => (prev.phone ? prev : { ...prev, phone: def.phone! }));
        }
      } catch {
        // best-effort prefill — silently ignore network errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function validateContact(): boolean {
    const e: Record<string, string> = {};
    if (!validators.email(contact.email)) e.email = "Enter a valid email.";
    if (!validators.phone(contact.phone)) e.phone = "Enter a valid phone.";
    setErrors(e);
    if (Object.keys(e).length > 0) setShakeKey((k) => k + 1);
    return Object.keys(e).length === 0;
  }
  function validateShipping(): boolean {
    const e: Record<string, string> = {};
    if (!validators.required(shipping.firstName)) e.firstName = "Required";
    if (!validators.required(shipping.lastName)) e.lastName = "Required";
    if (!validators.required(shipping.address1)) e.address1 = "Required";
    if (!validators.required(shipping.city)) e.city = "Required";
    if (!validators.state(shipping.state)) e.state = "Required";
    if (!validators.zip(shipping.zip)) e.zip = "Enter a valid ZIP";
    setErrors(e);
    if (Object.keys(e).length > 0) setShakeKey((k) => k + 1);
    return Object.keys(e).length === 0;
  }
  function validatePayment(): boolean {
    const e: Record<string, string> = {};
    if (!validators.cardNumber(payment.cardNumber)) e.cardNumber = "Enter a valid card number.";
    if (!validators.expiry(payment.expiry)) e.expiry = "MM / YY";
    if (!validators.cvc(payment.cvc)) e.cvc = "3–4 digits";
    if (!validators.required(payment.nameOnCard)) e.nameOnCard = "Required";
    if (!legalAccepted) e.legalAccepted = "Please agree to the Terms and Privacy Policy.";
    setErrors(e);
    if (Object.keys(e).length > 0) setShakeKey((k) => k + 1);
    return Object.keys(e).length === 0;
  }

  async function processOrder() {
    const startedAt = Date.now();
    setIsProcessing(true);
    setErrors({});

    let resolvedNumber = generateOrderNumber();
    let serverError: string | null = null;

    try {
      const res = await fetch("/api/leafmart/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact,
          shipping,
          subtotal,
          tax,
          total,
          items: items.map(({ product, quantity }) => ({
            slug: product.slug,
            name: product.name,
            partner: product.partner,
            format: product.format,
            formatLabel: product.formatLabel,
            support: product.support,
            dose: product.dose,
            price: product.price,
            quantity,
            shape: product.shape,
            bg: product.bg,
            deep: product.deep,
            pct: product.pct,
            n: product.n,
            tag: product.tag,
          })),
        }),
      });

      if (res.ok) {
        const data: { orderNumber?: string } = await res.json();
        if (data.orderNumber) resolvedNumber = data.orderNumber;
      } else if (res.status === 401) {
        // Not signed in — leaf-fall back to a client-only demo confirmation
        // so the UX keeps working until auth is wired.
      } else {
        const data: {
          error?: string;
          blocked?: Array<{ name: string; partner: string; message?: string }>;
          ageBlocked?: Array<{ name: string; status: string; message?: string }>;
        } = await res.json().catch(() => ({}));
        if (data.ageBlocked && data.ageBlocked.length > 0) {
          const items = data.ageBlocked.map((b) => `• ${b.name}`).join("\n");
          serverError = `${data.error ?? "21+ verification required."}\n\n${items}\n\nVerify your date of birth in your account or remove these items to continue.`;
        } else if (data.blocked && data.blocked.length > 0) {
          const items = data.blocked
            .map((b) => `• ${b.name} (${b.partner})`)
            .join("\n");
          serverError = `${data.error ?? "Some items can't ship to that address."}\n\n${items}\n\nRemove these items or change your shipping address to continue.`;
        } else {
          serverError = data.error || `Checkout failed (${res.status}).`;
        }
      }
    } catch (err) {
      serverError = (err as Error).message || "Network error during checkout.";
    }

    // Minimum 1.8s spinner — per spec, the animation matters more than ms.
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1800) {
      await new Promise((r) => setTimeout(r, 1800 - elapsed));
    }

    if (serverError) {
      setErrors({ submit: serverError });
      setIsProcessing(false);
      return;
    }

    setOrderNumber(resolvedNumber);
    setConfirmedSnapshot({ items, subtotal, tax, total });
    clearCart();
    setIsProcessing(false);
    setStep(3);
  }

  function next() {
    if (step === 0 && !validateContact()) return;
    if (step === 1 && !validateShipping()) return;
    if (step === 2) {
      if (!validatePayment()) return;
      void processOrder();
      return;
    }
    setErrors({});
    setDirection("forward");
    setStep((s) => Math.min(3, (s + 1) as StepIndex) as StepIndex);
  }

  function back() {
    setErrors({});
    setDirection("backward");
    setStep((s) => Math.max(0, (s - 1) as StepIndex) as StepIndex);
  }

  // Empty cart on step 0 — gentle nudge back to shop
  if (items.length === 0 && step !== 3) {
    return (
      <section className="max-w-[640px] mx-auto px-6 lg:px-10 py-20 lg:py-28 text-center">
        <p className="eyebrow text-[var(--text-soft)] mb-3">Checkout</p>
        <h1 className="font-display text-[40px] sm:text-[48px] font-medium tracking-tight text-[var(--ink)] leading-[1.05] mb-5">
          Your cart is empty.
        </h1>
        <p className="text-[15px] text-[var(--text-soft)] leading-relaxed mb-8">
          Add a product before checking out — we&rsquo;ll save your place.
        </p>
        <Link
          href="/leafmart/shop"
          className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
        >
          Browse the shop
        </Link>
      </section>
    );
  }

  // ── Confirmation step ──────────────────────────────────────────
  if (step === 3 && orderNumber && confirmedSnapshot) {
    return (
      <section className="max-w-[720px] mx-auto px-6 lg:px-10 py-20 lg:py-24 lm-fade-in relative">
        {/* Confetti pieces fall behind the headline; pure CSS, plays once. */}
        <ConfettiBurst />
        <div className="relative w-16 h-16 mb-7">
          {/* Soft pulse burst behind the badge */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full lm-confirm-burst"
            style={{ background: "var(--leaf)" }}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--sage)" }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <path
                d="M7 14.5L12 19.5L21 9"
                fill="none"
                stroke="var(--leaf)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="28"
                strokeDashoffset="28"
                className="animate-[draw-check_0.6s_ease-out_0.3s_forwards]"
              />
            </svg>
          </div>
        </div>
        <p className="eyebrow text-[var(--text-soft)] mb-3">Order confirmed</p>
        <h1 className="font-display text-[44px] sm:text-[56px] font-medium tracking-tight text-[var(--ink)] leading-[1.05] mb-5">
          Thanks{contact.email ? `, ${contact.email.split("@")[0]}` : ""}.
        </h1>
        <p className="text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[520px] mb-10">
          We&rsquo;ll email a receipt to{" "}
          <span className="text-[var(--ink)] font-medium">{contact.email}</span> shortly.
          Every Leafmart order ships discreet, with a third-party COA on file.
        </p>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <div className="flex justify-between items-center mb-5 pb-5 border-b border-[var(--border)]">
            <div>
              <p className="eyebrow text-[var(--text-soft)] mb-1">Order number</p>
              <p className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
                {orderNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="eyebrow text-[var(--text-soft)] mb-1">Total</p>
              <p className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
                {formatUSD(confirmedSnapshot.total)}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {confirmedSnapshot.items.map(({ product, quantity }) => (
              <li key={product.slug} className="py-4 flex items-center gap-4">
                <Link
                  href={`/leafmart/products/${product.slug}`}
                  aria-label={`View ${product.name}`}
                  className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--leaf)]"
                >
                  <ProductSilhouette shape={product.shape} bg={product.bg} deep={product.deep} height={56} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/leafmart/products/${product.slug}`}
                    className="font-display text-[15px] font-medium text-[var(--ink)] truncate block hover:text-[var(--leaf)] transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="text-[12px] text-[var(--muted)]">
                    {product.dose} · Qty {quantity}
                  </p>
                </div>
                <span className="text-[14px] font-medium text-[var(--ink)] tabular-nums">
                  {formatUSD(product.price * quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/leafmart/shop"
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Keep shopping
          </Link>
          <Link
            href="/leafmart"
            className="inline-flex items-center rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
          >
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  // ── Steps 0–2 ──────────────────────────────────────────────────
  return (
    <section
      className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12 lg:py-16"
      aria-busy={ageGateBlocking}
    >
      <AgeGateModal
        open={ageGateOpen}
        onClose={() => setAgeGateOpen(false)}
        onConfirmed={() => setAgeGateOpen(false)}
      />

      <div className="text-center mb-3">
        <p className="eyebrow text-[var(--text-soft)]">Secure checkout</p>
      </div>
      <h1 className="font-display text-[36px] sm:text-[44px] font-medium tracking-tight text-[var(--ink)] leading-[1.05] text-center mb-10">
        {step === 0 && "How can we reach you?"}
        {step === 1 && "Where should we send it?"}
        {step === 2 && "Payment details"}
      </h1>

      <StepIndicator active={step} />

      <div className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-start">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className={labelClass()}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="you@example.com"
                  className={fieldClass()}
                />
                {errors.email && (
                  <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className={labelClass()}>
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="(555) 555-1234"
                  className={fieldClass()}
                />
                {errors.phone && (
                  <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.phone}</p>
                )}
              </div>
              <p className="text-[12px] text-[var(--muted)] leading-relaxed pt-2">
                We&rsquo;ll only use this to send order updates and shipping notifications.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className={labelClass()}>
                    First name
                  </label>
                  <input
                    id="firstName"
                    autoComplete="given-name"
                    value={shipping.firstName}
                    onChange={(e) => setShipping({ ...shipping, firstName: e.target.value })}
                    className={fieldClass()}
                  />
                  {errors.firstName && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass()}>
                    Last name
                  </label>
                  <input
                    id="lastName"
                    autoComplete="family-name"
                    value={shipping.lastName}
                    onChange={(e) => setShipping({ ...shipping, lastName: e.target.value })}
                    className={fieldClass()}
                  />
                  {errors.lastName && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="address1" className={labelClass()}>
                  Address
                </label>
                <input
                  id="address1"
                  autoComplete="address-line1"
                  value={shipping.address1}
                  onChange={(e) => setShipping({ ...shipping, address1: e.target.value })}
                  placeholder="Street address"
                  className={fieldClass()}
                />
                {errors.address1 && (
                  <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.address1}</p>
                )}
              </div>
              <div>
                <label htmlFor="address2" className={labelClass()}>
                  Apt, suite, etc. <span className="text-[var(--muted)] normal-case">(optional)</span>
                </label>
                <input
                  id="address2"
                  autoComplete="address-line2"
                  value={shipping.address2}
                  onChange={(e) => setShipping({ ...shipping, address2: e.target.value })}
                  className={fieldClass()}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px] gap-4">
                <div>
                  <label htmlFor="city" className={labelClass()}>
                    City
                  </label>
                  <input
                    id="city"
                    autoComplete="address-level2"
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    className={fieldClass()}
                  />
                  {errors.city && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.city}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="state" className={labelClass()}>
                    State
                  </label>
                  <input
                    id="state"
                    autoComplete="address-level1"
                    value={shipping.state}
                    onChange={(e) => setShipping({ ...shipping, state: e.target.value.toUpperCase() })}
                    maxLength={2}
                    placeholder="NY"
                    className={fieldClass()}
                  />
                  {errors.state && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.state}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="zip" className={labelClass()}>
                    ZIP
                  </label>
                  <input
                    id="zip"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={shipping.zip}
                    onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                    placeholder="10001"
                    className={fieldClass()}
                  />
                  {errors.zip && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.zip}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="cardNumber" className={labelClass()}>
                  Card number
                </label>
                <input
                  id="cardNumber"
                  autoComplete="cc-number"
                  inputMode="numeric"
                  value={payment.cardNumber}
                  onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  className={fieldClass()}
                />
                {errors.cardNumber && (
                  <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.cardNumber}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className={labelClass()}>
                    Expiry
                  </label>
                  <input
                    id="expiry"
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    value={payment.expiry}
                    onChange={(e) => setPayment({ ...payment, expiry: e.target.value })}
                    placeholder="MM / YY"
                    className={fieldClass()}
                  />
                  {errors.expiry && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.expiry}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="cvc" className={labelClass()}>
                    CVC
                  </label>
                  <input
                    id="cvc"
                    autoComplete="cc-csc"
                    inputMode="numeric"
                    value={payment.cvc}
                    onChange={(e) => setPayment({ ...payment, cvc: e.target.value })}
                    placeholder="123"
                    className={fieldClass()}
                  />
                  {errors.cvc && (
                    <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.cvc}</p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="nameOnCard" className={labelClass()}>
                  Name on card
                </label>
                <input
                  id="nameOnCard"
                  autoComplete="cc-name"
                  value={payment.nameOnCard}
                  onChange={(e) => setPayment({ ...payment, nameOnCard: e.target.value })}
                  className={fieldClass()}
                />
                {errors.nameOnCard && (
                  <p className="text-[12px] text-[var(--danger)] mt-1.5">{errors.nameOnCard}</p>
                )}
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl bg-[var(--surface-muted)] px-4 py-3 text-[12px] text-[var(--text-soft)] leading-relaxed">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  className="mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  <rect
                    x="2.5"
                    y="6"
                    width="9"
                    height="6.5"
                    rx="1.2"
                    fill="none"
                    stroke="var(--leaf)"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M4.5 6V4.2a2.5 2.5 0 0 1 5 0V6"
                    fill="none"
                    stroke="var(--leaf)"
                    strokeWidth="1.3"
                  />
                </svg>
                Demo checkout. No card is charged and no payment data is transmitted.
              </div>
              <div>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={legalAccepted}
                    onChange={(e) => {
                      setLegalAccepted(e.target.checked);
                      if (e.target.checked && errors.legalAccepted) {
                        setErrors(({ legalAccepted: _omit, ...rest }) => rest);
                      }
                    }}
                    aria-invalid={!!errors.legalAccepted}
                    aria-describedby={errors.legalAccepted ? "legal-accept-error" : undefined}
                    className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--leaf)] focus:ring-[var(--leaf)] focus:ring-offset-0"
                  />
                  <span className="text-[13px] text-[var(--text-soft)] leading-relaxed">
                    I agree to the{" "}
                    <Link href="/legal/terms" target="_blank" rel="noopener" className="text-[var(--ink)] underline underline-offset-2 hover:text-[var(--leaf)]">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/legal/privacy" target="_blank" rel="noopener" className="text-[var(--ink)] underline underline-offset-2 hover:text-[var(--leaf)]">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.legalAccepted && (
                  <p id="legal-accept-error" className="text-[12px] text-[var(--danger)] mt-1.5 ml-7">
                    {errors.legalAccepted}
                  </p>
                )}
              </div>
              {errors.submit && (
                <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger)]/[0.04] px-4 py-3 text-[13px] text-[var(--danger)] whitespace-pre-line">
                  {errors.submit}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
            {step > 0 ? (
              <button
                onClick={back}
                className="text-[14px] font-medium text-[var(--ink)] hover:text-[var(--leaf)] transition-colors inline-flex items-center gap-1.5"
              >
                <span aria-hidden>←</span> Back
              </button>
            ) : (
              <Link
                href="/leafmart/cart"
                className="text-[14px] font-medium text-[var(--ink)] hover:text-[var(--leaf)] transition-colors inline-flex items-center gap-1.5"
              >
                <span aria-hidden>←</span> Return to cart
              </Link>
            )}
            <button
              onClick={next}
              disabled={isProcessing}
              className={`inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-medium tracking-wide transition-all duration-300 ${
                isProcessing
                  ? "bg-[var(--leaf)] text-[var(--bg)] cursor-wait"
                  : "bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)]"
              }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Processing…
                </>
              ) : (
                step === 2 ? `Pay ${formatUSD(total)}` : "Continue"
              )}
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[100px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <p className="eyebrow text-[var(--text-soft)] mb-5">In your cart</p>
          <ul className="divide-y divide-[var(--border)] mb-5">
            {items.map(({ product, quantity }) => (
              <li key={product.slug} className="py-3 flex items-center gap-3">
                <Link
                  href={`/leafmart/products/${product.slug}`}
                  aria-label={`View ${product.name}`}
                  className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden relative block focus:outline-none focus:ring-2 focus:ring-[var(--leaf)]"
                >
                  <ProductSilhouette shape={product.shape} bg={product.bg} deep={product.deep} height={48} />
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--ink)] text-[var(--bg)] text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center tabular-nums">
                    {quantity}
                  </span>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/leafmart/products/${product.slug}`}
                    className="text-[13.5px] font-medium text-[var(--ink)] truncate leading-tight block hover:text-[var(--leaf)] transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="text-[11.5px] text-[var(--muted)] mt-0.5">{product.dose}</p>
                </div>
                <span className="text-[13px] font-medium text-[var(--ink)] tabular-nums">
                  {formatUSD(product.price * quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="space-y-2.5 text-[13.5px] border-t border-[var(--border)] pt-5">
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Subtotal</dt>
              <dd className="text-[var(--ink)] font-medium tabular-nums">{formatUSD(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Shipping</dt>
              <dd className="text-[var(--leaf)] font-medium">Free</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Tax</dt>
              <dd className="text-[var(--ink)] font-medium tabular-nums">{formatUSD(tax)}</dd>
            </div>
          </dl>
          <div className="border-t border-[var(--border)] mt-4 pt-4 flex justify-between items-baseline">
            <span className="text-[14px] font-medium text-[var(--ink)]">Total</span>
            <span className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
              {formatUSD(total)}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/leafmart/cart"
              className="flex-1 inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink)] px-4 py-2.5 text-[12.5px] font-medium hover:border-[var(--leaf)] hover:text-[var(--leaf)] transition-colors"
            >
              Compare similar items
            </Link>
          </div>

          <CheckoutShareModule
            cartItems={items.map((i) => ({ slug: i.product.slug, quantity: i.quantity }))}
            fromName={shipping.firstName || undefined}
          />
        </aside>
      </div>
    </section>
  );
}
