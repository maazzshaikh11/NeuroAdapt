/**
 * ProfileHeader — Extension header bar with auth display.
 *
 * Shows the NeuroAdapt wordmark on the left.
 * On the right, shows either:
 *   • User initials + name (if logged in)
 *   • "Sign In" button placeholder (if logged out)
 *
 * Props:
 *   user  {Object|null} – { name: string, email?: string } or null
 */

import React from 'react';

/**
 * Extracts up to two uppercase initials from a name string.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

export default function ProfileHeader({ user }) {
  return (
    <header className="flex items-center justify-between h-14 px-4 bg-brand-indigo text-white shrink-0">
      {/* Wordmark */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-extrabold tracking-tight">NeuroAdapt</span>
      </div>

      {/* Auth area */}
      {user ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-sm font-bold">
            {getInitials(user.name)}
          </span>
          <span className="text-sm font-medium truncate max-w-[100px]">
            {user.name}
          </span>
        </div>
      ) : (
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/50"
          aria-label="Sign in to NeuroAdapt"
        >
          Sign In
        </button>
      )}
    </header>
  );
}
