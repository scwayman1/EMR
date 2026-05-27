"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavPrefs } from "@/components/shell/NavPrefsContext";
import { cn } from "@/lib/utils/cn";

export function ContinuePanel() {
  const prefs = useNavPrefs();
  const pathname = usePathname() ?? "";

  if (!prefs?.hydrated) return null;

  const recent = prefs.recents
    .filter((item) => {
      const isPortalRoute = item.href === "/portal" || item.href.startsWith("/portal/");
      const isCurrent = pathname === item.href || pathname.startsWith(item.href + "/");
      return isPortalRoute && !isCurrent;
    })
    .slice(0, 3);

  if (recent.length === 0) return null;

  return (
    <Card tone="glass" className="mb-6 md:mb-8">
      <CardContent className="py-4 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              Continue
            </p>
            <h2 className="mt-1 font-display text-lg text-text tracking-tight">
              Pick up where you left off
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((item, idx) => (
              <Link key={item.href} href={item.href}>
                <Button
                  size="sm"
                  variant={idx === 0 ? "secondary" : "ghost"}
                  className={cn(
                    "min-h-[40px] rounded-full",
                    idx > 0 && "bg-white/35 hover:bg-white/55",
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
