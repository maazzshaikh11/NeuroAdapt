/**
 * @file dashboard/src/components/Sidebar.jsx
 * @description Premium dark navigation sidebar for the NeuroAdapt Dashboard.
 */

import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: "/preferences",
    label: "Accessibility",
    end: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    to: "/account",
    label: "Profile",
    end: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

const Sidebar = ({ user, onLogout }) => {
  const initial = (user?.email || "U")[0].toUpperCase();
  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <aside
      style={{ width: "var(--sidebar-width, 260px)" }}
      className="flex-shrink-0 h-screen bg-bg border-r border flex flex-col overflow-hidden"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <img src="/logo.jpeg" alt="NeuroAdapt Logo" className="w-[40px] h-[40px] object-contain rounded-md shadow-sm" />
          </div>
          <div>
            <p className="text-primary font-bold text-sm leading-tight tracking-tight">NeuroAdapt</p>
            <p className="text-xs text-muted leading-tight mt-0.5">Accessibility Platform</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto" aria-label="Dashboard sections">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-3 px-3">
          Main
        </p>
        <ul className="space-y-0.5" role="list">
          {navItems.map(({ to, label, icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-brand text-white shadow-sm"
                      : "text-muted hover:bg-surface hover:text-primary",
                  ].join(" ")
                }
              >
                <span className="flex-shrink-0">{icon}</span>
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* AI Insights Card */}
        <div className="mt-6 mx-1 p-4 rounded-xl bg-gradient-to-br /20 /10 border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">✨</span>
            <span className="text-xs font-semibold text-brand">Today's Insight</span>
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            Focus Mode increased your reading completion by{" "}
            <span className="text-brand font-semibold">24%</span> this week.
          </p>
        </div>
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border">
        <div className="flex items-center gap-3 px-1 mb-3">
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-primary"
            style={{ background: "linear-gradient(135deg, #4F46E5, #0D9488)" }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-primary font-medium truncate leading-tight">{displayName}</p>
            <p className="text-xs text-muted leading-tight mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted
                     hover:bg-red-500/10 hover:text-red-400
                     transition-all duration-150 border border-transparent hover:border-red-500/20
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Sign out"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
