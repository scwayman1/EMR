"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface MeResponse {
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

function initialsFor(firstName: string, lastName: string, email: string): string {
  const f = firstName?.trim()?.[0];
  const l = lastName?.trim()?.[0];
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (email?.[0] || "?").toUpperCase();
}

interface Props {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function AccountUserMenu({ variant = "desktop", onNavigate }: Props) {
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leafmart/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (cancelled) return;
        setUser(data.user);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      const res = await fetch("/api/leafmart/signout", { method: "POST" });
      const data: { redirectTo?: string } = await res.json().catch(() => ({}));
      const target = data.redirectTo || "/leafmart";
      // Hard navigation so cached server components re-render with no user.
      window.location.href = target;
    } catch {
      router.refresh();
      setSigningOut(false);
    }
  }

  // Mobile variant: just renders rows for the slide-down panel.
  if (variant === "mobile") {
    if (!loaded) return null;
    if (!user) {
      return (
        <Link
          href="/leafmart/login"
          onClick={onNavigate}
          className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors"
        >
          Sign in
        </Link>
      );
    }
    return (
      <div className="border-t border-[var(--border)] mt-2 pt-2">
        <p className="text-[12px] uppercase tracking-wide text-[var(--muted)] py-2">
          {user.email}
        </p>
        <Link
          href="/leafmart/account"
          onClick={onNavigate}
          className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors block"
        >
          Account
        </Link>
        <Link
          href="/leafmart/account/orders"
          onClick={onNavigate}
          className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors block"
        >
          Orders
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors block text-left w-full disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    );
  }

  // Desktop variant: avatar button + dropdown.
  if (!loaded) {
    // Reserve a placeholder so the layout doesn't shift.
    return <div className="w-10 h-10" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/leafmart/login"
        className="hidden lg:inline text-sm font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors px-2"
      >
        Sign in
      </Link>
    );
  }

  const initials = initialsFor(user.firstName, user.lastName, user.email);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--leaf-soft)] text-[var(--leaf)] text-[12.5px] font-semibold tracking-wide hover:ring-2 hover:ring-[var(--accent-soft)] transition"
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_40px_rgba(28,40,32,0.14)] py-2 z-50"
        >
          <div className="px-4 py-2 border-b border-[var(--border)] mb-1">
            <p className="text-[13px] font-medium text-[var(--ink)] truncate">
              {user.firstName || user.email.split("@")[0]}
            </p>
            <p className="text-[11.5px] text-[var(--muted)] truncate">{user.email}</p>
          </div>
          <Link
            href="/leafmart/account"
            role="menuitem"
            className="block px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--bg-deep)]"
            onClick={() => setOpen(false)}
          >
            Account
          </Link>
          <Link
            href="/leafmart/account/orders"
            role="menuitem"
            className="block px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--bg-deep)]"
            onClick={() => setOpen(false)}
          >
            Orders
          </Link>
          <Link
            href="/leafmart/account/outcomes"
            role="menuitem"
            className="block px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--bg-deep)]"
            onClick={() => setOpen(false)}
          >
            Outcomes
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="block w-full text-left px-4 py-2 text-[14px] text-[var(--text)] hover:bg-[var(--bg-deep)] border-t border-[var(--border)] mt-1 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
