"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart, formatUSD } from "@/lib/leafmart/cart-store";

const TAX_RATE = 0.0875;
const STEPS = ["Contact", "Shipping", "Payment", "Confirmation"] as const;
type StepIndex = 0 | 1 | 2 | 3;

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
  return (
    <ol className="flex items-center justify-center gap-3 sm:gap-5 mb-12">
      {STEPS.map((label, i) => {
        const isActive = i === active;
        const isDone = i < active;
        return (
          <li key={label} className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold tabular-nums transition-colors ${
                  isActive
                    ? "bg-[var(--ink)] text-[#FFF8E8]"
                    : isDone
                      ? "bg-[var(--leaf)] text-[#FFF8E8]"
                      : "bg-[var(--surface-muted)] text-[var(--muted)]"
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
                className={`hidden sm:inline text-[12.5px] font-medium tracking-wide uppercase ${
                  isActive ? "text-[var(--ink)]" : "text-[var(--muted)]"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="w-6 sm:w-12 h-px bg-[var(--border)]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function fieldClass() {
  return "w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3.5 text-[14.5px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--accent-soft)] transition";
}

function labelClass() {
  return "block text-[12px] font-medium tracking-wide uppercase text-[var(--text-soft)] mb-1.5";
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<StepIndex>(0);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
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

  function validateContact(): boolean {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) e.email = "Enter a valid email.";
    if (contact.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function validateShipping(): boolean {
    const e: Record<string, string> = {};
    if (!shipping.firstName.trim()) e.firstName = "Required";
    if (!shipping.lastName.trim()) e.lastName = "Required";
    if (!shipping.address1.trim()) e.address1 = "Required";
    if (!shipping.city.trim()) e.city = "Required";
    if (!shipping.state.trim()) e.state = "Required";
    if (!/^\d{5}(-\d{4})?$/.test(shipping.zip.trim())) e.zip = "Enter a valid ZIP";
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function validatePayment(): boolean {
    const e: Record<string, string> = {};
    const digits = payment.cardNumber.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 19) e.cardNumber = "Enter a valid card number.";
    if (!/^(0[1-9]|1[0-2])\s?\/\s?\d{2}$/.test(payment.expiry)) e.expiry = "MM / YY";
    if (!/^\d{3,4}$/.test(payment.cvc)) e.cvc = "3–4 digits";
    if (!payment.nameOnCard.trim()) e.nameOnCard = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 0 && !validateContact()) return;
    if (step === 1 && !validateShipping()) return;
    if (step === 2) {
      if (!validatePayment()) return;
      // mock processing — never actually charge
      const num = generateOrderNumber();
      setOrderNumber(num);
      setConfirmedSnapshot({ items, subtotal, tax, total });
      clearCart();
      setStep(3);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(3, (s + 1) as StepIndex) as StepIndex);
  }

  function back() {
    setErrors({});
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
          className="inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
        >
          Browse the shop
        </Link>
      </section>
    );
  }

  // ── Confirmation step ──────────────────────────────────────────
  if (step === 3 && orderNumber && confirmedSnapshot) {
    return (
      <section className="max-w-[720px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-7"
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
            />
          </svg>
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

        <div className="rounded-3xl border border-[var(--border)] bg-white p-7">
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
                <div
                  className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: product.bg }}
                >
                  <span
                    className="font-display text-[14px] font-medium"
                    style={{ color: product.deep }}
                  >
                    {product.name.slice(0, 1)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[15px] font-medium text-[var(--ink)] truncate">
                    {product.name}
                  </p>
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
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Keep shopping
          </Link>
          <Link
            href="/leafmart"
            className="inline-flex items-center rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--ink)] hover:text-[#FFF8E8] transition-colors"
          >
            Back to home
          </Link>
        </div>
      </section>
    );
  }

  // ── Steps 0–2 ──────────────────────────────────────────────────
  return (
    <section className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12 lg:py-16">
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
        <div className="rounded-3xl border border-[var(--border)] bg-white p-7 sm:p-9">
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
              className="inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-7 py-3.5 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
            >
              {step === 2 ? `Pay ${formatUSD(total)}` : "Continue"}
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[100px] rounded-3xl border border-[var(--border)] bg-white p-7">
          <p className="eyebrow text-[var(--text-soft)] mb-5">In your cart</p>
          <ul className="divide-y divide-[var(--border)] mb-5">
            {items.map(({ product, quantity }) => (
              <li key={product.slug} className="py-3 flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center relative"
                  style={{ background: product.bg }}
                >
                  <span
                    className="font-display text-[13px] font-medium"
                    style={{ color: product.deep }}
                  >
                    {product.name.slice(0, 1)}
                  </span>
                  <span className="absolute -top-1.5 -right-1.5 bg-[var(--ink)] text-[#FFF8E8] text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center tabular-nums">
                    {quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-[var(--ink)] truncate leading-tight">
                    {product.name}
                  </p>
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
        </aside>
      </div>
    </section>
  );
}
