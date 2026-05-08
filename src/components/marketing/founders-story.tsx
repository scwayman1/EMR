import React from "react";
import { Quote } from "lucide-react";

export function FoundersStorySection() {
  return (
    <section className="py-24 bg-neutral-900 overflow-hidden relative">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Image / Visual Column */}
          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-800 border border-neutral-700 relative">
              {/* Simulated Image Placeholder */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent z-10" />
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
                alt="Medical professional reviewing clinical data" 
                className="object-cover w-full h-full opacity-80"
              />
              <div className="absolute bottom-8 left-8 right-8 z-20">
                <Quote className="w-10 h-10 text-emerald-400 mb-4 opacity-80" />
                <p className="text-xl font-medium text-white leading-snug">
                  "We built the platform we wished we had when we first started integrating cannabinoid medicine into our practice."
                </p>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
          </div>

          {/* Text Column */}
          <div>
            <h2 className="text-emerald-400 font-semibold tracking-wide uppercase text-sm mb-3">
              Our Story
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6 tracking-tight">
              Founded by Clinicians, <br className="hidden md:block"/> Driven by Data
            </h3>
            
            <div className="space-y-6 text-neutral-300 text-lg leading-relaxed">
              <p>
                In 2024, our founding team of physicians and clinical pharmacists recognized a critical gap in modern healthcare: the endocannabinoid system was being completely ignored by traditional EMRs.
              </p>
              <p>
                Providers were left to guess at dosing, patients were left to navigate dispensaries blindly, and the incredible therapeutic potential of medical cannabis was being bottlenecked by a lack of clinical infrastructure.
              </p>
              <p>
                Verdant Apothecary was born from a simple thesis: if we treat cannabis like medicine—with rigorous titration protocols, structured chemovar tracking, and integrated lifestyle care plans—we can unlock outcomes that conventional pharmacology has failed to achieve.
              </p>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=2070" 
                  alt="Founder Headshot" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-semibold">Dr. Sarah Jenkins</p>
                <p className="text-emerald-400 text-sm">Co-Founder & Chief Medical Officer</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
