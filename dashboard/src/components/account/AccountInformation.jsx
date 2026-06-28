/**
 * @file dashboard/src/components/account/AccountInformation.jsx
 * @description Account Information card displaying user details.
 *              Reads from the full profile object returned by GET /api/profile.
 */

import React from "react";
import { motion } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

// ─── Sub-item ─────────────────────────────────────────────────────────────────

const InfoItem = ({ label, value, extra }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
    <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-2">
      {extra}
      <span className="text-sm font-semibold text-primary">{value}</span>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AccountInformation = ({ user, profile }) => {
  // Derive values — prefer the richer profile data, fall back to the JWT user object
  const username    = profile?.username    || user?.email?.split("@")[0] || "Not available";
  const email       = profile?.email       || user?.email                || "Not available";
  const displayName = profile?.displayName || profile?.fullName          || "Not set";
  const role        = (profile?.role || user?.role)
    ? ((profile?.role || user?.role).charAt(0).toUpperCase() + (profile?.role || user?.role).slice(1))
    : "User";

  const memberSince = profile?.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(profile.createdAt)
      )
    : "Not available";

  const extensionConnected = true; // TODO: Replace with real extension data

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      whileHover={{ boxShadow: "0 4px 20px rgba(27,107,90,0.08)" }}
      className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center flex-shrink-0">
          <InfoIcon />
        </div>
        <h2 className="text-base font-semibold text-primary">Account Information</h2>
      </div>

      {/* List */}
      <div className="space-y-5 flex-1">
        <InfoItem label="Username" value={username} />
        <InfoItem label="Email" value={email} />
        <InfoItem label="Display Name" value={displayName} />
        <InfoItem
          label="Account Status"
          value=""
          extra={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Active
            </span>
          }
        />
        <InfoItem label="Member Since" value={memberSince} />
        <InfoItem label="Role" value={role} />
        <InfoItem
          label="Extension Status"
          value=""
          extra={
            <span
              className={[
                "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                extensionConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-orange-50 text-orange-600 border-orange-200",
              ].join(" ")}
            >
              <span
                className={[
                  "w-1.5 h-1.5 rounded-full",
                  extensionConnected ? "bg-emerald-500 animate-pulse" : "bg-orange-500",
                ].join(" ")}
                aria-hidden="true"
              />
              {extensionConnected ? "Connected" : "Disconnected"}
            </span>
          }
        />
      </div>
    </motion.div>
  );
};

export default AccountInformation;
