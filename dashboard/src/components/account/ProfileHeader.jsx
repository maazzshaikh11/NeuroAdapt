/**
 * @file dashboard/src/components/account/ProfileHeader.jsx
 * @description Premium profile overview card — avatar, name, bio, email,
 *              verified badge, member-since, last-login, and Edit Profile button.
 */

import React from "react";
import { motion } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────

const CheckBadgeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25z"
      clipRule="evenodd"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const ProfileHeader = ({ profile, user, onEditClick }) => {
  if (!profile) return null;

  const API_BASE   = import.meta.env.VITE_API_BASE_URL || "";
  const avatarUrl  = profile.avatarUrl ? `${API_BASE}${profile.avatarUrl}` : null;
  const displayName = profile.displayName || profile.fullName || profile.name;
  const initial    = (displayName || profile.email || "U")[0].toUpperCase();

  const memberSince = profile.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        new Date(profile.createdAt)
      )
    : "—";

  // TODO: Replace with real lastLoginAt from backend when available
  const lastLogin = "2 hours ago";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ boxShadow: "0 4px 24px rgba(27,107,90,0.10)" }}
      className="bg-surface border border-strong rounded-2xl p-6 sm:p-8 relative overflow-hidden"
    >
      {/* Gradient bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: "linear-gradient(90deg, var(--color-brand), var(--color-accent))" }}
        aria-hidden="true"
      />

      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.2 }}
          className="relative flex-shrink-0"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg select-none overflow-hidden"
            style={{ background: "linear-gradient(135deg, var(--color-brand), var(--color-accent))" }}
            aria-label={`Avatar for ${displayName || profile.email}`}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile avatar" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.target.style.display = 'none'; // Hide broken image
                  e.target.nextSibling.style.display = 'flex'; // Show initials
                }}
              />
            ) : null}
            <div 
              style={{ display: avatarUrl ? 'none' : 'flex' }} 
              className="w-full h-full items-center justify-center"
            >
              {initial}
            </div>
          </div>
          {/* Online indicator */}
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface rounded-full" aria-hidden="true" />
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name + badge */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-primary truncate">
              {displayName || user?.email?.split("@")[0] || "Not available"}
            </h2>
            {profile.profileType && (
              <span className="text-xs font-semibold bg-brand-soft text-brand border border-brand/20 px-2.5 py-0.5 rounded-full capitalize">
                {profile.profileType}
              </span>
            )}
          </div>

          {/* Username */}
          {profile.username && (
            <p className="text-xs text-muted mb-1">@{profile.username}</p>
          )}

          {/* Email */}
          <p className="text-sm text-secondary mb-2 truncate">{profile.email}</p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-secondary italic mb-3 max-w-prose">{profile.bio}</p>
          )}

          {/* Verified badge */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckBadgeIcon />
              Verified Account
            </span>
            {profile.occupation && (
              <span className="text-xs text-muted bg-bg border border-strong px-2.5 py-1 rounded-full">
                {profile.occupation}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarIcon />
              Member since {memberSince}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon />
              Last login {lastLogin}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <div className="flex-shrink-0">
          <motion.button
            onClick={onEditClick}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary border border-strong rounded-xl px-3.5 py-2 transition-all duration-150 hover:border-brand/40 hover:text-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <PencilIcon />
            Edit Profile
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileHeader;
