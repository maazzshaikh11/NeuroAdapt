/**
 * LoginSlot — Placeholder mount point for authentication UI.
 *
 * Member 3 will later inject:
 *   • Login Form
 *   • Profile Panel
 *   • Register Form
 *
 * This component renders a subtle placeholder when no auth UI is injected.
 */

import React from 'react';

export default function LoginSlot() {
  return (
    <div
      id="neuroadapt-login-slot"
      className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-center"
      aria-label="Authentication area"
    >
      <p className="text-xs text-gray-400 font-medium">
        Authentication module will appear here
      </p>
    </div>
  );
}
