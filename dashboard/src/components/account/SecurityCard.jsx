/**
 * @file dashboard/src/components/account/SecurityCard.jsx
 * @description Professional password change card with live strength meter,
 *              requirement checklist, and AnimatePresence feedback toasts.
 *              Calls the existing changePassword() API endpoint.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const CheckIcon = ({ filled }) => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={filled ? "text-emerald-600" : "text-muted"}
  >
    <circle cx="12" cy="12" r="10" fill={filled ? "currentColor" : "none"} className={filled ? "text-emerald-100" : ""} />
    <path d="M8 12l3 3 5-5" stroke={filled ? "#15803d" : "currentColor"} />
  </svg>
);

// ─── Password strength ────────────────────────────────────────────────────────

const REQUIREMENTS = [
  { key: "length",    label: "8 characters",     test: (p) => p.length >= 8 },
  { key: "upper",     label: "Uppercase letter",  test: (p) => /[A-Z]/.test(p) },
  { key: "lower",     label: "Lowercase letter",  test: (p) => /[a-z]/.test(p) },
  { key: "number",    label: "Number",            test: (p) => /[0-9]/.test(p) },
  { key: "special",   label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH_META = [
  { label: "Too weak",   barColor: "#ef4444", textColor: "text-red-500" },
  { label: "Weak",       barColor: "#f97316", textColor: "text-orange-500" },
  { label: "Fair",       barColor: "#eab308", textColor: "text-yellow-500" },
  { label: "Good",       barColor: "#22c55e", textColor: "text-emerald-500" },
  { label: "Strong",     barColor: "#15803d", textColor: "text-emerald-700" },
];

const getStrength = (pw) => {
  if (!pw) return 0;
  return REQUIREMENTS.filter((r) => r.test(pw)).length;
};

// ─── Password input with show/hide toggle ─────────────────────────────────────

const PasswordInput = ({ id, label, value, onChange, required, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-secondary mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="input-field pr-10"
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors p-0.5"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const SecurityCard = ({ onPasswordChange, loading, error, success }) => {
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showReqs, setShowReqs] = useState(false);

  const strength   = getStrength(pwForm.newPw);
  const meta       = STRENGTH_META[Math.max(0, strength - 1)] ?? STRENGTH_META[0];
  const pctFilled  = (strength / 5) * 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    onPasswordChange(pwForm.current, pwForm.newPw, pwForm.confirm);
    // Clear form only on success — parent controls success state
  };

  // Reset form when success fires
  React.useEffect(() => {
    if (success) setPwForm({ current: "", newPw: "", confirm: "" });
  }, [success]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
          <LockIcon />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary">Security</h2>
          <p className="text-xs text-muted">Change your password</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1">
        <AnimatePresence>
          {success && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 rounded-xl border border-emerald-200 mb-4"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Password updated successfully!
            </motion.div>
          )}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200 mb-4"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <PasswordInput
            id="current-password"
            label="Current Password"
            value={pwForm.current}
            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
            required
            placeholder="Enter current password"
          />

          {/* New password */}
          <div>
            <PasswordInput
              id="new-password"
              label="New Password"
              value={pwForm.newPw}
              onChange={(e) => {
                setPwForm({ ...pwForm, newPw: e.target.value });
                if (!showReqs) setShowReqs(true);
              }}
              required
              placeholder="Enter new password"
            />

            {/* Strength meter */}
            <AnimatePresence>
              {pwForm.newPw.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  {/* Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pctFilled}%` }}
                        transition={{ duration: 0.3 }}
                        className="h-full rounded-full transition-colors duration-300"
                        style={{ background: meta.barColor }}
                      />
                    </div>
                    {strength > 0 && (
                      <span className={`text-xs font-medium whitespace-nowrap ${meta.textColor}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3 pt-1">
                    {REQUIREMENTS.map((req) => {
                      const met = req.test(pwForm.newPw);
                      return (
                        <span
                          key={req.key}
                          className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
                            met ? "text-emerald-700" : "text-muted"
                          }`}
                        >
                          <CheckIcon filled={met} />
                          {req.label}
                        </span>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Confirm password */}
          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            required
            placeholder="Confirm new password"
          />

          {/* Confirm mismatch hint */}
          {pwForm.confirm.length > 0 && pwForm.newPw !== pwForm.confirm && (
            <p className="text-xs text-red-600 -mt-1">Passwords do not match</p>
          )}

          <div className="pt-1">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="btn-primary w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating…
                </span>
              ) : (
                "Update Password"
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default SecurityCard;
