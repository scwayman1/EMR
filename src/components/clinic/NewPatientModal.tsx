"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function NewPatientModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Final submit
      setOpen(false);
      setStep(1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-text">Add New Patient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-medium border-b border-border pb-2">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">First Name</label>
                  <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Last Name</label>
                  <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Date of Birth</label>
                  <input required type="date" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Phone</label>
                  <input required type="tel" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-medium border-b border-border pb-2">Emergency Contacts (3 Required)</h3>
              {[1, 2, 3].map((num) => (
                <div key={num} className="grid grid-cols-3 gap-4 bg-surface-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">Contact {num} Name</label>
                    <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">Relationship</label>
                    <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text">Phone</label>
                    <input required type="tel" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-lg font-medium border-b border-border pb-2">Insurance Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Primary Insurance Provider</label>
                  <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text">Member ID</label>
                    <input required type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text">Group Number</label>
                    <input type="text" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between border-t border-border mt-6">
            <div className="text-xs text-text-muted">Step {step} of 3</div>
            <div className="flex gap-2">
              {step > 1 && (
                <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              {step === 1 && (
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {step === 3 ? "Create Patient" : "Next"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
