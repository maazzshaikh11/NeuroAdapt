/**
 * QuotaBar — Displays the user's daily simplification usage quota.
 *
 * Props:
 *   used  {number} – number of uses consumed today
 *   total {number} – maximum daily limit
 */

import React from 'react';

export default function QuotaBar({ used = 0, total = 50 }) {
  const remaining = Math.max(0, total - used);
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isLow = remaining <= 10;

  return (
    <div className="w-full" role="meter" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={total} aria-label="Daily usage quota">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">Daily Usage</span>
        <span className={`text-xs font-semibold ${isLow ? 'text-amber-600' : 'text-gray-600'}`}>
          {remaining} / {total} remaining
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isLow ? 'bg-amber-500' : 'bg-brand-teal'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
