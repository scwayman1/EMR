"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AccountSidebar } from "@/components/leafmart/AccountSidebar";

interface Address {
  id: string;
  label?: string | null;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone?: string | null;
  isDefault: boolean;
}

interface AddressDraft {
  label: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY: AddressDraft = {
  label: "",
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
  isDefault: false,
};

function fieldClass() {
  return "w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--leaf)] focus:ring-2 focus:ring-[var(--accent-soft)] transition";
}
function labelClass() {
  return "block text-[12px] font-medium tracking-wide uppercase text-[var(--text-soft)] mb-1.5";
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setError(null);
    const res = await fetch("/api/leafmart/addresses");
    if (res.status === 401) {
      setAuthError(true);
      setLoaded(true);
      return;
    }
    if (!res.ok) {
      setError(`Failed to load addresses (${res.status}).`);
      setLoaded(true);
      return;
    }
    const data: { addresses: Address[] } = await res.json();
    setAddresses(data.addresses);
    setLoaded(true);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function startCreate() {
    setEditing(null);
    setDraft({ ...EMPTY });
    setCreating(true);
  }
  function startEdit(addr: Address) {
    setCreating(false);
    setEditing(addr);
    setDraft({
      label: addr.label ?? "",
      firstName: addr.firstName,
      lastName: addr.lastName,
      address1: addr.address1,
      address2: addr.address2 ?? "",
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      phone: addr.phone ?? "",
      isDefault: addr.isDefault,
    });
  }
  function cancel() {
    setCreating(false);
    setEditing(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = editing ? `/api/leafmart/addresses/${editing.id}` : "/api/leafmart/addresses";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setError(data.error || `Save failed (${res.status}).`);
      setSaving(false);
      return;
    }
    cancel();
    await refresh();
    setSaving(false);
  }

  async function setDefault(id: string) {
    await fetch(`/api/leafmart/addresses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    await fetch(`/api/leafmart/addresses/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <section className="px-6 lg:px-14 pt-10 pb-20 max-w-[1440px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-6">
        <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
        <span>·</span>
        <Link href="/leafmart/account" className="hover:text-[var(--leaf)]">Account</Link>
        <span>·</span>
        <span className="text-[var(--text)]">Addresses</span>
      </div>

      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[var(--muted)] mb-3">Addresses</p>
          <h1 className="font-display text-[40px] sm:text-[52px] font-normal tracking-[-1.5px] leading-[1.05] text-[var(--ink)]">
            Where should we
            <em className="font-accent not-italic text-[var(--leaf)]"> send it?</em>
          </h1>
        </div>
        {!authError && !creating && !editing && (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors"
          >
            Add address
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountSidebar />
        </aside>

        <div className="space-y-5">
          {authError && (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <p className="font-display text-[24px] text-[var(--ink)] mb-2">
                Sign in to manage your addresses.
              </p>
              <Link
                href="/leafmart/login?next=/leafmart/account/addresses"
                className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors mt-3"
              >
                Sign in
              </Link>
            </div>
          )}

          {error && !authError && (
            <div className="rounded-2xl border border-[var(--danger)] bg-[var(--danger)]/[0.04] px-4 py-3 text-[13px] text-[var(--danger)]">
              {error}
            </div>
          )}

          {(creating || editing) && !authError && (
            <form
              onSubmit={submit}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8 space-y-4"
            >
              <p className="eyebrow text-[var(--muted)]">
                {editing ? "Edit address" : "New address"}
              </p>
              <div>
                <label className={labelClass()}>Label (optional)</label>
                <input
                  className={fieldClass()}
                  placeholder="Home"
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass()}>First name</label>
                  <input
                    required
                    className={fieldClass()}
                    value={draft.firstName}
                    onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Last name</label>
                  <input
                    required
                    className={fieldClass()}
                    value={draft.lastName}
                    onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass()}>Address line 1</label>
                <input
                  required
                  className={fieldClass()}
                  value={draft.address1}
                  onChange={(e) => setDraft({ ...draft, address1: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass()}>Address line 2</label>
                <input
                  className={fieldClass()}
                  value={draft.address2}
                  onChange={(e) => setDraft({ ...draft, address2: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className={labelClass()}>City</label>
                  <input
                    required
                    className={fieldClass()}
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass()}>State</label>
                  <input
                    required
                    maxLength={2}
                    className={fieldClass()}
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass()}>ZIP</label>
                  <input
                    required
                    className={fieldClass()}
                    value={draft.postalCode}
                    onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Phone</label>
                  <input
                    className={fieldClass()}
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13.5px] text-[var(--text-soft)]">
                <input
                  type="checkbox"
                  checked={draft.isDefault}
                  onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })}
                />
                Use as default
              </label>
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Add address"}
                </button>
                <button
                  type="button"
                  onClick={cancel}
                  className="inline-flex items-center text-[14px] text-[var(--text-soft)] hover:text-[var(--leaf)] px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loaded && !authError && addresses.length === 0 && !creating && !editing && (
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <p className="font-display text-[24px] text-[var(--ink)] mb-2">
                No saved addresses yet.
              </p>
              <p className="text-[14px] text-[var(--text-soft)] mb-6">
                Add one and it&rsquo;ll auto-fill at checkout.
              </p>
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-6 py-3 text-[14px] font-medium hover:bg-[var(--leaf)] transition-colors"
              >
                Add your first address
              </button>
            </div>
          )}

          {!authError && addresses.map((addr) => (
            <article
              key={addr.id}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 lg:p-8 flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {addr.label && (
                    <p className="font-display text-[18px] text-[var(--ink)]">{addr.label}</p>
                  )}
                  {addr.isDefault && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                      style={{ background: "var(--leaf-soft)", color: "var(--leaf)" }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <p className="text-[14px] text-[var(--text)] leading-relaxed">
                  {addr.firstName} {addr.lastName}<br />
                  {addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}<br />
                  {addr.city}, {addr.state} {addr.postalCode}
                </p>
                {addr.phone && (
                  <p className="text-[12.5px] text-[var(--muted)] mt-1.5">{addr.phone}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(addr.id)}
                    className="text-[13px] text-[var(--leaf)] hover:underline px-2 py-1"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(addr)}
                  className="text-[13px] text-[var(--text-soft)] hover:text-[var(--leaf)] px-2 py-1"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(addr.id)}
                  className="text-[13px] text-[var(--danger)] hover:underline px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
