/**
 * @file dashboard/src/components/account/DangerZone.jsx
 * @description Red-bordered danger zone card with a disabled Delete Account button.
 *              Contains the delete confirmation modal logic.
 *
 * TODO: Wire up delete account when backend endpoint DELETE /api/auth/account is confirmed stable.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Icons ────────────────────────────────────────────────────────────────────

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─── Confirm modal ────────────────────────────────────────────────────────────

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, loading, expectedEmail }) => {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-primary/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface border border-strong rounded-2xl shadow-2xl p-8 max-w-sm w-full"
      >
        {/* Icon */}
        <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <AlertIcon />
        </div>

        <h3 id="delete-modal-title" className="text-xl font-bold text-center text-primary mb-2">
          Delete Your Account?
        </h3>
        <p className="text-sm text-secondary text-center mb-6">
          This will permanently delete all your data, preferences, and usage history. This cannot be undone.
        </p>

        {/* Confirmation input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-1.5">
            Type{" "}
            <span className="font-bold text-red-600 select-all">{expectedEmail}</span>{" "}
            to confirm
          </label>
          <input
            type="text"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={expectedEmail}
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-danger flex-1"
            disabled={email !== expectedEmail || loading}
            onClick={onConfirm}
          >
            {loading ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const DangerZone = ({ onDeleteConfirm, deleteLoading, expectedEmail }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="border border-red-200 rounded-2xl p-6 sm:p-8 bg-red-50/50 relative overflow-hidden h-full flex flex-col justify-center"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-100/50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertIcon />
          </div>
          <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
        </div>

        {/* Delete account row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="font-semibold text-primary mb-0.5">Delete Account</p>
            <p className="text-sm text-muted">
              This permanently deletes your account and all accessibility data.
            </p>
          </div>
          {/* TODO: Enable button and wire to deleteAccount() API when backend confirms endpoint stability */}
          <button
            disabled
            title="Account deletion — coming soon"
            onClick={() => setShowModal(true)}
            className="btn-danger flex-shrink-0 opacity-50 cursor-not-allowed"
          >
            Delete Account
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <DeleteConfirmModal
            isOpen={showModal}
            onClose={() => !deleteLoading && setShowModal(false)}
            onConfirm={() => {
              onDeleteConfirm?.();
              setShowModal(false);
            }}
            loading={deleteLoading}
            expectedEmail={expectedEmail}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DangerZone;
