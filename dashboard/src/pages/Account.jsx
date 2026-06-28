/**
 * @file dashboard/src/pages/Account.jsx
 * @description Premium SaaS-style Account / Profile page.
 *
 * Layout (desktop 2-col, mobile 1-col):
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │ ProfileHeader (full width)                           │
 *  ├──────────────────────────────────────────────────────┤
 *  │ Left column               │ Right column             │
 *  │  StatisticCards (2×2)     │ StatisticCards (2×2)    │
 *  │  AccessibilitySummary     │ SecurityCard             │
 *  │  AccountInformation       │ RecentActivity           │
 *  │  ExtensionStatusCard      │ QuickActions             │
 *  ├──────────────────────────────────────────────────────┤
 *  │ DangerZone   (full width)                            │
 *  └──────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ─── API ──────────────────────────────────────────────────────────────────────
import { getProfile, changePassword, deleteAccount, MOCK_PROFILE } from "../utils/api";

// ─── Sub-components ──────────────────────────────────────────────────────────
import ProfileHeader        from "../components/account/ProfileHeader";
import StatisticCard        from "../components/account/StatisticCard";
import AccessibilitySummary from "../components/account/AccessibilitySummary";
import SecurityCard         from "../components/account/SecurityCard";
import RecentActivity       from "../components/account/RecentActivity";
import ExtensionStatusCard  from "../components/account/ExtensionStatusCard";
import QuickActions         from "../components/account/QuickActions";
import DangerZone           from "../components/account/DangerZone";
import AccountInformation   from "../components/account/AccountInformation";
import EditProfileModal     from "../components/account/EditProfileModal";



// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
  <div className="space-y-6 max-w-6xl">
    <div className="skeleton h-8 w-48 rounded-xl" />
    <div className="skeleton h-36 w-full rounded-2xl" />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton h-28 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="skeleton h-64 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Account({ user: propUser, onLogout }) {
  // Pull updateUser so we can propagate profile changes into global auth state
  const { updateUser } = useAuth();

  // ── Profile fetch ────────────────────────────────────────────────────────
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getProfile();
        // Support both { user } and flat response shapes
        if (mounted) setProfile(data?.user ?? data);
      } catch {
        if (mounted) setProfile(MOCK_PROFILE);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Edit Profile modal ───────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);

  /** Called by EditProfileModal on successful save */
  const handleProfileSaved = useCallback((updatedUser) => {
    // 1. Update local profile state so ProfileHeader & cards re-render instantly
    setProfile((prev) => ({ ...prev, ...updatedUser }));

    // 2. Push relevant fields into the global AuthContext so the sidebar/
    //    dashboard greeting also refresh without a page reload.
    updateUser({
      displayName: updatedUser.displayName,
      avatarUrl:   updatedUser.avatarUrl,
      fullName:    updatedUser.fullName,
    });
  }, [updateUser]);

  // ── Password change ──────────────────────────────────────────────────────
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePasswordChange = async (currentPw, newPw, confirmPw) => {
    setPwError("");
    setPwSuccess(false);

    if (newPw.length < 8)     return setPwError("New password must be at least 8 characters.");
    if (newPw !== confirmPw)  return setPwError("Passwords do not match.");

    setPwLoading(true);
    try {
      await changePassword({ oldPassword: currentPw, newPassword: newPw });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3500);
    } catch (err) {
      setPwError(err.message || "Failed to update password.");
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete account ───────────────────────────────────────────────────────
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      onLogout();
    } catch (err) {
      console.error("Delete account failed:", err);
      setDeleteLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (loading || !profile) return <PageSkeleton />;

  // Merge propUser + profile so every child gets the richest possible data
  const mergedUser = { ...propUser, ...profile };

  return (
    <>
      {/* Edit Profile drawer */}
      <EditProfileModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        user={propUser}
        onSaveSuccess={handleProfileSaved}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 max-w-6xl"
      >
        {/* ── Page Header ── */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Account</h1>
          <p className="text-sm text-muted mt-1">
            Manage your profile, accessibility preferences, and security settings.
          </p>
        </motion.div>

        {/* ── Profile Header (full width) ── */}
        <motion.div variants={itemVariants}>
          <ProfileHeader
            profile={profile}
            user={propUser}
            onEditClick={() => setEditOpen(true)}
          />
        </motion.div>



        {/* ── Row 1: Accessibility & Security ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
        >
          <AccessibilitySummary preferences={profile.preferences ?? {}} />
          <SecurityCard
            onPasswordChange={handlePasswordChange}
            loading={pwLoading}
            error={pwError}
            success={pwSuccess}
          />
        </motion.div>

        {/* ── Row 2: Account Info & Recent Activity ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
        >
          <AccountInformation user={propUser} profile={profile} />
          <RecentActivity />
        </motion.div>

        {/* ── Row 3: Extension Status & Quick Actions ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch"
        >
          <ExtensionStatusCard />
          <QuickActions />
        </motion.div>

        {/* ── Row 4: Danger Zone (full width) ── */}
        <motion.div variants={itemVariants}>
          <DangerZone
            onDeleteConfirm={handleDeleteConfirm}
            deleteLoading={deleteLoading}
            expectedEmail={profile.email}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
