/**
 * FeatureToggle — Accessible pill toggle for a single feature.
 *
 * Props:
 *   label    {string}   – visible label text
 *   enabled  {boolean}  – current on/off state
 *   onChange {Function}  – called with the new boolean value
 *   icon     {string}   – optional emoji / icon prefix
 */

import React from 'react';

export default function FeatureToggle({ label, enabled, onChange, icon = '' }) {
  const handleClick = () => onChange(!enabled);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
      onClick={handleClick}
      className={`
        flex items-center justify-between w-full h-12 px-4
        rounded-full font-semibold text-[13px] select-none
        transition-all duration-200 ease-out
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        focus-visible:outline-brand-teal
        ${
          enabled
            ? 'bg-[#1f7a63] text-white shadow-md shadow-brand-teal/25'
            : 'bg-gray-300 text-gray-700 hover:bg-gray-400 border border-gray-400'
        }
      `}
    >
      <span className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        {label}
      </span>

      {/* Mini toggle indicator */}
      <span
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full
          transition-colors duration-200
          ${enabled ? 'bg-white/30' : 'bg-gray-400 border border-gray-500'}
        `}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
            transform transition-transform duration-200
            ${enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}
          `}
        />
      </span>
    </button>
  );
}
