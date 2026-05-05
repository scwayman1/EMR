"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Eyebrow } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Building, Mail, Phone, User, Calendar } from "lucide-react";
import Link from "next/link";

export default function BookDemoPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    // Simulate API call to CRM (e.g., Hubspot, Salesforce)
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStatus("success");
  };

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-20 pb-28">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column: Copy & Social Proof */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Eyebrow className="mb-6">Enterprise Sales</Eyebrow>
            <h1 className="font-display text-5xl md:text-6xl text-text leading-[1.05] tracking-tight mb-6">
              See Leafjourney in action.
            </h1>
            <p className="text-xl text-text-muted leading-relaxed mb-10">
              Discover how our AI-native platform can streamline your clinical operations, automate charting, and unlock new revenue streams through Leafmart.
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-text mb-1">Tailored Walkthrough</h3>
                  <p className="text-text-muted text-sm">A live, 30-minute demonstration customized for your specific practice specialty.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-text mb-1">Integration Roadmap</h3>
                  <p className="text-text-muted text-sm">Learn how to seamlessly migrate your existing patient data and connect your current billing systems.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 mt-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium text-text mb-1">Pricing & ROI Analysis</h3>
                  <p className="text-text-muted text-sm">Transparent enterprise pricing options and projected time-savings via our autonomous charting agents.</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[var(--surface-muted)]/50 rounded-2xl border border-[var(--border)]">
              <p className="italic text-text-muted text-sm leading-relaxed mb-4">
                "Leafjourney completely transformed our clinic. The autonomous subagents handle the documentation while we focus on the patient. It's the first time in ten years I'm leaving the office at 5 PM."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent)] text-white rounded-full flex items-center justify-center font-bold text-sm">
                  SJ
                </div>
                <div>
                  <p className="font-medium text-text text-sm">Dr. Sarah Jenkins</p>
                  <p className="text-xs text-text-muted">Medical Director, Horizon Health</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: The Form */}
          <div className="lg:pl-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            {status === "success" ? (
              <Card tone="raised" className="border-[var(--accent)] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--accent)]" />
                <CardContent className="p-10 text-center">
                  <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--accent)]">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="font-display text-3xl text-text mb-4">Request Received</h2>
                  <p className="text-text-muted leading-relaxed mb-8">
                    Thank you for your interest! A member of our enterprise sales team will be in touch within 24 hours to schedule your personalized demonstration.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setStatus("idle")}>
                    Submit another request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card tone="raised" className="shadow-xl">
                <CardContent className="p-8 sm:p-10">
                  <h2 className="font-display text-2xl text-text mb-6">Schedule your demo</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">First Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                          <input required type="text" className="w-full h-11 pl-10 pr-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors" placeholder="Jane" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Last Name</label>
                        <input required type="text" className="w-full h-11 px-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors" placeholder="Doe" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Work Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                        <input required type="email" className="w-full h-11 pl-10 pr-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors" placeholder="jane@clinic.com" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Organization Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                        <input required type="text" className="w-full h-11 pl-10 pr-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors" placeholder="Horizon Health Partners" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                          <input required type="tel" className="w-full h-11 pl-10 pr-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors" placeholder="(555) 123-4567" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Team Size</label>
                        <select required className="w-full h-11 px-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors appearance-none">
                          <option value="" disabled selected>Select size...</option>
                          <option value="1-5">1-5 Providers</option>
                          <option value="6-20">6-20 Providers</option>
                          <option value="21-50">21-50 Providers</option>
                          <option value="50+">50+ Providers</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wider">What are you hoping to solve?</label>
                      <textarea className="w-full min-h-[100px] p-3 bg-[var(--surface-muted)]/30 border border-[var(--border)] rounded-xl text-sm focus:border-[var(--accent)] outline-none transition-colors resize-y" placeholder="Briefly describe your current challenges..." />
                    </div>

                    <Button type="submit" size="lg" className="w-full mt-4" disabled={status === "submitting"}>
                      {status === "submitting" ? "Submitting Request..." : "Request Demo"}
                    </Button>
                    
                    <p className="text-[11px] text-text-subtle text-center mt-4">
                      By submitting this form, you agree to our <Link href="/security" className="underline hover:text-[var(--accent)]">Privacy Policy</Link>.
                    </p>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
