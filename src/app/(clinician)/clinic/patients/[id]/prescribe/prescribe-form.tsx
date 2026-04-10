"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { createPrescriptionAction, type PrescribeResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FieldGroup, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  brand: string | null;
  productType: string;
  route: string;
  thcConcentration: number | null;
  cbdConcentration: number | null;
  thcCbdRatio: string | null;
  concentrationUnit: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating prescription…" : "Create prescription"}
    </Button>
  );
}

export function PrescribeForm({
  patientId,
  patientName,
  products,
}: {
  patientId: string;
  patientName: string;
  products: Product[];
}) {
  const [state, formAction] = useFormState<PrescribeResult | null, FormData>(
    createPrescriptionAction,
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="patientId" value={patientId} />

      {/* Product selection */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Select product</CardTitle>
          <CardDescription>
            Choose from your organization&apos;s cannabis formulary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-text-muted">
              No products in the formulary yet. Add products in the ops dashboard.
            </p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/40 hover:bg-accent-soft/30 transition-colors cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50"
                >
                  <input
                    type="radio"
                    name="productId"
                    value={p.id}
                    required
                    className="h-4 w-4 text-accent border-border-strong focus:ring-accent/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text">
                        {p.name}
                      </span>
                      <Badge tone="neutral">{p.productType.replace("_", " ")}</Badge>
                      {p.thcCbdRatio && (
                        <Badge tone="highlight">
                          THC:CBD {p.thcCbdRatio}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {p.brand && `${p.brand} · `}
                      {p.thcConcentration !== null && `THC ${p.thcConcentration} ${p.concentrationUnit}`}
                      {p.thcConcentration !== null && p.cbdConcentration !== null && " / "}
                      {p.cbdConcentration !== null && `CBD ${p.cbdConcentration} ${p.concentrationUnit}`}
                      {" · "}
                      {p.route}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dosing */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Dosing</CardTitle>
          <CardDescription>
            Set the dose volume and frequency. The system auto-calculates mg from the product concentration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <FieldGroup label="Volume per dose" htmlFor="volumePerDose">
              <Input
                id="volumePerDose"
                name="volumePerDose"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.5"
              />
            </FieldGroup>
            <FieldGroup label="Unit" htmlFor="volumeUnit">
              <select
                id="volumeUnit"
                name="volumeUnit"
                required
                className="flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="mL">mL</option>
                <option value="drops">drops</option>
                <option value="puffs">puffs</option>
                <option value="units">units (capsules)</option>
                <option value="mg">mg</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Times per day" htmlFor="frequencyPerDay">
              <Input
                id="frequencyPerDay"
                name="frequencyPerDay"
                type="number"
                min="1"
                max="12"
                required
                placeholder="2"
              />
            </FieldGroup>
          </div>

          <div className="mt-4">
            <FieldGroup
              label="Timing instructions"
              htmlFor="timingInstructions"
              hint="e.g. Morning and 1 hour before bed"
            >
              <Input
                id="timingInstructions"
                name="timingInstructions"
                placeholder="Morning and 1 hour before bed"
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Instructions + notes */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Instructions &amp; notes</CardTitle>
          <CardDescription>
            Patient instructions are auto-generated if left blank. Clinician notes are internal only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Patient instructions"
            htmlFor="patientInstructions"
            hint="Leave blank to auto-generate from dosing details"
          >
            <Textarea
              id="patientInstructions"
              name="patientInstructions"
              rows={3}
              placeholder="Take 0.5 mL under the tongue twice daily…"
            />
          </FieldGroup>
          <FieldGroup
            label="Clinician notes"
            htmlFor="clinicianNotes"
            hint="Internal — not shown to the patient"
          >
            <Textarea
              id="clinicianNotes"
              name="clinicianNotes"
              rows={2}
              placeholder="Starting low dose 1:1 for sleep and pain. Reassess in 2 weeks."
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {state?.ok === false && (
        <p className="text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center justify-between gap-4">
        <Link href={`/clinic/patients/${patientId}?tab=rx`}>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
