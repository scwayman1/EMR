import React from "react";
import { Check, Zap } from "lucide-react";

export function PricingTableSection() {
  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide uppercase text-sm mb-3">
            Pricing
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-6 tracking-tight">
            Transparent Clinical Software
          </h3>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            No hidden fees, no per-patient surcharges. Simple pricing for modern practices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Individual Provider */}
          <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col">
            <h4 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Solo Practitioner</h4>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6">Perfect for independent clinicians starting to integrate cannabis.</p>
            
            <div className="mb-8">
              <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">$149</span>
              <span className="text-neutral-500 dark:text-neutral-400">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {['Unlimited Patient Records', 'Custom Chemovar Titration Plans', 'Basic Patient Explainer Agent', 'Standard Support', 'Full Gamification Suite'].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full py-3 px-4 bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl font-semibold transition-colors">
              Start 14-Day Trial
            </button>
          </div>

          {/* Enterprise / Multi-Provider */}
          <div className="bg-emerald-900 rounded-3xl p-8 border border-emerald-700 shadow-lg relative flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Most Popular
            </div>
            
            <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              Clinical Group <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </h4>
            <p className="text-emerald-200 text-sm mb-6">For multi-provider practices and specialized clinics.</p>
            
            <div className="mb-8">
              <span className="text-4xl font-bold text-white">$499</span>
              <span className="text-emerald-300">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              {[
                'Everything in Solo, plus:', 
                'Up to 5 Providers (+$49/additional)', 
                'Automated MIPS Reporting Integration', 
                'Medicare CBD Eligibility Checks', 
                'White-labeled Patient Portal',
                'Priority 24/7 Support'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-emerald-100">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold transition-colors border border-emerald-400">
              Upgrade to Group
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
