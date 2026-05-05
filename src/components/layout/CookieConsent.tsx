// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem("leafjourney-cookie-consent");
    if (!consent) {
      // Delay showing it slightly to not overwhelm on load
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("leafjourney-cookie-consent", "true");
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem("leafjourney-cookie-consent", "false");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
        <div className="flex-1">
          <h3 className="font-display text-lg font-medium text-text mb-1">
            We value your privacy
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to our use of cookies as outlined in our Privacy Policy.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Button variant="outline" onClick={handleDecline} className="w-full sm:w-auto">
            Decline
          </Button>
          <Button onClick={handleAccept} className="w-full sm:w-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}
