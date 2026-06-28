/**
 * SettingsPanel — Simplification level selector.
 *
 * Props:
 *   level    {string}   – current level ('basic' | 'standard' | 'academic')
 *   onChange {Function} – called with the new level string
 */

import React from 'react';

const LEVELS = [
  { value: 'basic', label: 'Basic', desc: 'Simple vocabulary' },
  { value: 'standard', label: 'Standard', desc: 'Balanced readability' },
  { value: 'academic', label: 'Academic', desc: 'Preserve complexity' },
];

export default function SettingsPanel({ level, onChange }) {
  return (
    <div className="w-full">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Simplification Level
      </p>

      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Simplification level">
        {LEVELS.map((opt) => {
          const isSelected = level === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${opt.label}: ${opt.desc}`}
              onClick={() => onChange(opt.value)}
              className={`
                flex flex-col items-center py-2 px-1 rounded-xl text-center
                transition-all duration-150 cursor-pointer
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1
                focus-visible:outline-brand-indigo
                ${
                  isSelected
                    ? 'bg-brand-indigo text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <span className="text-xs font-bold leading-tight">{opt.label}</span>
              <span
                className={`text-[10px] leading-tight mt-0.5 ${
                  isSelected ? 'text-white/70' : 'text-gray-400'
                }`}
              >
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
