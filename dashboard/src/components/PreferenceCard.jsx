/**
 * @file dashboard/src/components/PreferenceCard.jsx
 * @description Premium dark-mode preference card with reusable form controls.
 */

import React from "react";

// ─── Toggle ───────────────────────────────────────────────────────────────────

export const Toggle = ({ checked, onChange, id, disabled = false }) => (
  <button
    id={id}
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 border ${
      checked 
        ? "bg-[#1f7a63] border-transparent" 
        : "bg-gray-300 border-gray-400"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
        checked ? "translate-x-[22px]" : "translate-x-[2px]"
      }`}
    />
  </button>
);

// ─── Select ───────────────────────────────────────────────────────────────────

export const Select = ({ value, onChange, options = [], id }) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="min-w-[180px] border border-strong rounded-lg px-3 py-2 text-sm text-primary bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent cursor-pointer transition-all"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

// ─── RangeSlider ──────────────────────────────────────────────────────────────

export const RangeSlider = ({ value, onChange, min = 0, max = 100, step = 1, unit = "", id }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col items-end gap-1.5 min-w-[160px]">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{
          background: `linear-gradient(to right, #6366F1 ${percentage}%, #334155 ${percentage}%)`,
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <span className="text-xs font-semibold text-brand font-mono tabular-nums">
        {value}{unit}
      </span>
    </div>
  );
};

// ─── PreferenceCard ──────────────────────────────────────────────────────────

const PreferenceCard = ({ icon: Icon, label, description, children, danger = false, active }) => {
  return (
    <div
      className={[
        "group bg-surface rounded-xl border px-6 py-5 flex items-center justify-between gap-6 transition-all duration-200 hover:bg-surface",
        danger
          ? "border-red-500/20"
          : active
          ? "border-indigo-500/30"
          : "border-strong",
      ].join(" ")}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div
          className={[
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            danger
              ? "bg-red-500/15 text-red-400"
              : active
              ? "bg-brand text-white shadow-sm"
              : "bg-surface text-secondary group-hover:bg-surface group-hover:text-secondary",
          ].join(" ")}
          aria-hidden="true"
        >
          {Icon && <Icon />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${danger ? "text-red-400" : "text-primary"}`}>
            {label}
          </p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
};

export default PreferenceCard;
