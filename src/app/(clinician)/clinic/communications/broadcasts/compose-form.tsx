"use client";

import { useFormState } from "react-dom";
import { useRef, useEffect } from "react";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createCampaignAction, type CampaignResult } from "./actions";

export function CampaignComposeForm() {
  const [state, formAction] = useFormState<CampaignResult | null, FormData>(
    createCampaignAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="campaign-name">Campaign name</Label>
        <Input
          id="campaign-name"
          name="name"
          required
          maxLength={120}
          placeholder="e.g. Refill reminder — May"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="channel">Channel</Label>
          <select
            id="channel"
            name="channel"
            required
            className="h-9 px-3 text-sm rounded-md border border-border-strong bg-surface w-full"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audienceStatus">Audience</Label>
          <select
            id="audienceStatus"
            name="audienceStatus"
            className="h-9 px-3 text-sm rounded-md border border-border-strong bg-surface w-full"
            defaultValue="active"
          >
            <option value="active">Active patients</option>
            <option value="all">All patients</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-text-muted">
        <input type="checkbox" name="audienceQualified" className="h-4 w-4" />
        Restrict to qualified patients only
      </label>

      <div className="space-y-1">
        <Label htmlFor="bodyTemplate">Message body</Label>
        <Textarea
          id="bodyTemplate"
          name="bodyTemplate"
          required
          rows={5}
          maxLength={1000}
          placeholder={"Hi {{firstName}}, just a reminder…"}
        />
        <p className="text-[10px] text-text-subtle">
          Supports <code>{`{{firstName}}`}</code> and{" "}
          <code>{`{{lastName}}`}</code>. Max 1000 chars.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="scheduledFor">Schedule for (optional)</Label>
          <Input
            id="scheduledFor"
            name="scheduledFor"
            type="datetime-local"
          />
        </div>
        <label className="flex items-end gap-2 text-xs text-text-muted pb-1">
          <input type="checkbox" name="sendNow" className="h-4 w-4" />
          Send immediately (skip schedule)
        </label>
      </div>

      {state?.ok === false && (
        <p className="text-xs text-danger">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-xs text-success">
          Campaign created — {state.recipientCount} recipients.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit">Create campaign</Button>
      </div>
    </form>
  );
}
