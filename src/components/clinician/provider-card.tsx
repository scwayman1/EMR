import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ProviderRecord } from "@/lib/domain/provider-directory";

/**
 * ProviderCard — iOS-aesthetic directory card.
 *
 * Large avatar, legible display name, specialty pills, and quick-glance
 * counts. Renders a "Message" link that opens /clinic/messages with the
 * recipient user ID prefilled via query param.
 */
export function ProviderCard({
  provider,
  messageRecipientUserId,
}: {
  provider: ProviderRecord;
  /**
   * The User.id that messaging should be addressed to. Providers are keyed
   * by their Provider.id, but messaging happens against the underlying
   * User. The page passes that id through separately.
   */
  messageRecipientUserId: string;
}) {
  const messageHref = `/clinic/messages?recipient=${encodeURIComponent(messageRecipientUserId)}`;
  const patientLabel = provider.assignedPatientCount === 1 ? "patient" : "patients";

  return (
    <Card className="card-hover transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar
            firstName={provider.firstName}
            lastName={provider.lastName}
            size="lg"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-medium text-text tracking-tight truncate">
              {provider.firstName} {provider.lastName}
            </h3>
            {provider.title && (
              <p className="text-sm text-text-muted mt-0.5 truncate">
                {provider.title}
              </p>
            )}
            {provider.npi && (
              <p className="text-[11px] text-text-subtle mt-1 font-mono tracking-tight">
                NPI {provider.npi}
              </p>
            )}
          </div>
        </div>

        {provider.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {provider.specialties.map((specialty) => (
              <Badge key={specialty} tone="accent">
                {specialty}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-text">
              {provider.assignedPatientCount}
            </span>
            <span>assigned {patientLabel}</span>
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60">
          <Link
            href={messageHref}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-accent py-2 rounded-md border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              className="text-accent"
              aria-hidden="true"
            >
              <path
                d="M12 1H2C1.45 1 1 1.45 1 2V9.5C1 10.05 1.45 10.5 2 10.5H4L7 13L10 10.5H12C12.55 10.5 13 10.05 13 9.5V2C13 1.45 12.55 1 12 1Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Message
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
