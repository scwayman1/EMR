"use client";

import React from "react";

/**
 * EMR-007: AI-Powered Supply Store
 */
export function SupplyStore() {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-medium text-slate-900 mb-4">Patient Supply Store & DME</h2>
      <p className="text-slate-500 mb-6">AI-recommended durable medical equipment and wellness products based on clinical outcomes.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-slate-100 rounded-lg p-4 hover:border-green-200 transition-colors">
            <div className="h-32 bg-slate-50 rounded-md mb-4 flex items-center justify-center text-slate-400">
              [Product Image]
            </div>
            <h3 className="font-medium">Recommended Item {i}</h3>
            <p className="text-sm text-slate-500 mb-4">Based on recent chart notes.</p>
            <button className="w-full bg-green-50 text-green-700 py-2 rounded font-medium hover:bg-green-100">
              Add to Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
