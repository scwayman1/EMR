"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ defaultValue = "", className }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/portal/shop/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/portal/shop/products");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative w-full max-w-md", className)}
    >
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm pointer-events-none select-none"
        aria-hidden="true"
      >
        {"\u{1F50D}"}
      </span>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products..."
        className="pl-9"
        aria-label="Search products"
      />
    </form>
  );
}
