"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSig, DEMO_PHARMACIES } from "@/lib/domain/e-prescribe";

interface RxPreviewProps {
  patientName: string;
  productName: string;
  productType: string;
  route: string;
  doseAmount: number;
  doseUnit: string;
  frequency: string;
  frequencyLabel: string;
  daysSupply: number;
  quantity: number;
  quantityUnit: string;
  refills: number;
  timingInstructions?: string;
  diagnosisCodes: { code: string; label: string }[];
  noteToPatient?: string;
  noteToPharmacy?: string;
  pharmacyId?: string;
  thcMg?: number;
  cbdMg?: number;
  providerName: string;
  onSign: () => void;
  signing: boolean;
  signed: boolean;
}

export function RxPreview({
  patientName,
  productName,
  productType,
  route,
  doseAmount,
  doseUnit,
  frequency,
  frequencyLabel,
  daysSupply,
  quantity,
  quantityUnit,
  refills,
  timingInstructions,
  diagnosisCodes,
  noteToPatient,
  noteToPharmacy,
  pharmacyId,
  thcMg,
  cbdMg,
  providerName,
  onSign,
  signing,
  signed,
}: RxPreviewProps) {
  const pharmacy = pharmacyId ? DEMO_PHARMACIES.find((p) => p.id === pharmacyId) : null;
  const sig = formatSig({ doseAmount, doseUnit, frequency, route, timingInstructions });
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <Card className="border-2 border-accent/30 bg-white">
      <CardContent className="pt-6 pb-6">
        {/* Rx Header */}
        <div className="border-b border-border pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-text-subtle font-medium">
                Prescription preview
              </p>
              <p className="font-display text-xl text-text tracking-tight mt-1">
                Rx
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">{today}</p>
              {signed && (
                <Badge tone="success" className="mt-1">Signed</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Patient */}
        <div className="mb-4">
          <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Patient</p>
          <p className="text-sm font-medium text-text">{patientName}</p>
        </div>

        {/* Medication */}
        <div className="bg-surface-muted rounded-lg p-4 mb-4">
          <p className="text-base font-semibold text-text">{productName}</p>
          <p className="text-sm text-text-muted mt-1">
            {productType} &middot; {route}
          </p>
          {(thcMg || cbdMg) && (
            <div className="flex items-center gap-2 mt-2">
              {thcMg && thcMg > 0 && (
                <Badge tone="warning" className="text-[10px]">THC {thcMg}mg</Badge>
              )}
              {cbdMg && cbdMg > 0 && (
                <Badge tone="success" className="text-[10px]">CBD {cbdMg}mg</Badge>
              )}
            </div>
          )}
        </div>

        {/* Sig */}
        <div className="mb-4">
          <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Sig</p>
          <p className="text-sm text-text font-mono bg-surface-muted rounded px-3 py-2">{sig}</p>
        </div>

        {/* Quantity & Refills */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Quantity</p>
            <p className="text-sm font-medium text-text">{quantity} {quantityUnit}</p>
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Days supply</p>
            <p className="text-sm font-medium text-text">{daysSupply}</p>
          </div>
          <div>
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Refills</p>
            <p className="text-sm font-medium text-text">{refills}</p>
          </div>
        </div>

        {/* Diagnosis codes */}
        {diagnosisCodes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Diagnosis</p>
            <div className="flex flex-wrap gap-1.5">
              {diagnosisCodes.map((dx) => (
                <Badge key={dx.code} tone="neutral" className="text-xs">
                  {dx.code}: {dx.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Pharmacy */}
        {pharmacy && (
          <div className="mb-4">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Send to pharmacy</p>
            <p className="text-sm text-text">{pharmacy.name}</p>
            <p className="text-xs text-text-muted">{pharmacy.address}</p>
            <p className="text-xs text-text-muted">Fax: {pharmacy.fax}</p>
          </div>
        )}

        {/* Notes */}
        {noteToPatient && (
          <div className="mb-4">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Note to patient</p>
            <p className="text-sm text-text-muted">{noteToPatient}</p>
          </div>
        )}
        {noteToPharmacy && (
          <div className="mb-4">
            <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Note to pharmacy</p>
            <p className="text-sm text-text-muted">{noteToPharmacy}</p>
          </div>
        )}

        {/* Signature */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">Prescriber</p>
              <p className="text-sm font-medium text-text">{providerName}</p>
            </div>
            {!signed ? (
              <Button onClick={onSign} disabled={signing} size="sm">
                {signing ? "Signing..." : "Sign & send"}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-emerald-600">
                  e-Signed
                </span>
                <span className="text-xs text-text-muted">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
