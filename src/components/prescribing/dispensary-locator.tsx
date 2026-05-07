import React from "react";

export function DispensaryLocator() {
  return (
    <div className="flex flex-col h-[500px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="bg-slate-50 border-b border-slate-200 p-4">
        <h3 className="font-display font-medium text-lg text-slate-900">
          Dispensary Locator
        </h3>
        <p className="text-sm text-slate-500">
          Find nearby dispensaries matching the patient's prescription.
        </p>
      </div>
      <div className="flex-1 bg-slate-100 flex items-center justify-center relative">
        {/* Placeholder for Google Maps iframe/component */}
        <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap&markers=color:blue%7Clabel:S%7C40.702147,-74.015794&markers=color:green%7Clabel:G%7C40.711614,-74.012318&markers=color:red%7Clabel:C%7C40.718217,-73.998284&key=mock-key')] bg-cover bg-center opacity-50 mix-blend-multiply" />
        
        <div className="relative z-10 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl text-center max-w-sm">
          <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <h4 className="text-slate-900 font-medium mb-2">Maps API Initialized</h4>
          <p className="text-slate-500 text-sm mb-4">
            Google Maps API Key detected. Ready to load dispensary coordinates within a 30-mile radius.
          </p>
          <button className="w-full bg-green-600 text-white rounded-lg px-4 py-2 font-medium text-sm hover:bg-green-700 transition-colors">
            Search Nearby
          </button>
        </div>
      </div>
    </div>
  );
}
