import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Shared layout for a single wizard step panel.
 *
 * Wraps the children in a card with a header and a "Save + Continue"
 * submit button. The caller owns the <form> element that this is
 * rendered inside — it just needs an `action` pointing at the shared
 * server action, and a hidden `_stepId` field.
 */
export function PanelShell({
  title,
  description,
  children,
  submitLabel = "Save + Continue",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  return (
    <Card tone="raised">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end pt-6 mt-6 border-t border-border/60">
          <Button type="submit" variant="primary">
            {submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
