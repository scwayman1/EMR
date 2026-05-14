import React from "react";
import Link from "next/link";
import { CanopyCellProps } from "@/lib/canopy/types";

export function CanopyCell({ metric, comparisonMode = "prior_period", isLoading = false }: CanopyCellProps) {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg shadow-sm bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-1/3"></div>
      </div>
    );
  }

  const isPositive = metric.trendPercentage !== undefined && metric.trendPercentage > 0;
  const isNegative = metric.trendPercentage !== undefined && metric.trendPercentage < 0;

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white flex flex-col">
      <h3 className="text-sm font-medium text-gray-500">{metric.title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900">{metric.currentValue}</span>
        {metric.trendPercentage !== undefined && comparisonMode !== "none" && (
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
            {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(metric.trendPercentage)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <Link href={metric.drilldownUrl} className="text-sm text-blue-600 hover:underline">
          View Patients →
        </Link>
      </div>
    </div>
  );
}
