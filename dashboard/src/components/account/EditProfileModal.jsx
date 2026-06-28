/**
 * @file dashboard/src/components/account/EditProfileModal.jsx
 * @description Fully functional Edit Profile modal with avatar upload (drag & drop),
 *              inline validation, real backend integration, and optimistic UI updates.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProfile, uploadAvatar, apiFetch } from "../../utils/api";

// ─── Icons ────────────────────────────────────────────────────────────────────

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ─── Field components ─────────────────────────────────────────────────────────

const FieldGroup = ({ label, htmlFor, error, hint, children, readOnly }) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-semibold text-secondary uppercase tracking-wider">
      {label}
      {readOnly && (
        <span className="text-[10px] font-normal bg-bg border border-strong text-muted px-1.5 py-0.5 rounded-md tracking-normal">
          read-only
        </span>
      )}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertIcon />{error}
      </p>
    )}
    {hint && !error && <p className="text-xs text-muted">{hint}</p>}
  </div>
);

const InputField = ({ id, value, onChange, placeholder, disabled, maxLength, type = "text" }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    maxLength={maxLength}
    className={[
      "w-full bg-bg border border-strong rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/50",
      "focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-150",
      disabled ? "opacity-60 cursor-not-allowed" : "",
    ].join(" ")}
  />
);

const SelectField = ({ id, value, onChange, children, disabled }) => (
  <select
    id={id}
    value={value}
    onChange={onChange}
    disabled={disabled}
    className={[
      "w-full bg-bg border border-strong rounded-xl px-3.5 py-2.5 text-sm text-primary",
      "focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-150 appearance-none cursor-pointer",
      disabled ? "opacity-60 cursor-not-allowed" : "",
    ].join(" ")}
  >
    {children}
  </select>
);

const ReadonlyField = ({ value }) => (
  <div className="w-full bg-bg/50 border border-strong/50 rounded-xl px-3.5 py-2.5 text-sm text-muted select-none">
    {value || "—"}
  </div>
);

// ─── Avatar Uploader ──────────────────────────────────────────────────────────

const AvatarUploader = ({ currentUrl, currentInitial, onFileChange, previewUrl }) => {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onFileChange(file);
    }
  }, [onFileChange]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) onFileChange(file);
  };

  const avatarSrc = previewUrl || currentUrl;

  return (
    <div className="flex items-center gap-5">
      {/* Circular preview */}
      <div className="relative flex-shrink-0">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md overflow-hidden select-none"
          style={{ background: "linear-gradient(135deg, var(--color-brand), var(--color-accent))" }}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="Avatar preview" className="w-full h-full object-cover" />
          ) : (
            currentInitial
          )}
        </div>
        {/* Overlay button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute inset-0 rounded-full bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition-opacity duration-150"
          aria-label="Change avatar"
        >
          Change
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={[
          "flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-150",
          dragging ? "border-brand bg-brand/5" : "border-strong hover:border-brand/50 hover:bg-brand/5",
        ].join(" ")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
        aria-label="Upload avatar image"
      >
        <span className="text-muted"><UploadIcon /></span>
        <div className="text-center">
          <p className="text-sm font-medium text-secondary">Drop image here or <span className="text-brand">browse</span></p>
          <p className="text-xs text-muted mt-0.5">JPG, PNG, WEBP · max 5 MB</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = ({ message, type = "success" }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 12, scale: 0.96 }}
    transition={{ duration: 0.22 }}
    className={[
      "fixed bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold",
      type === "success"
        ? "bg-emerald-600 text-white"
        : "bg-red-600 text-white",
    ].join(" ")}
    role="alert"
  >
    {type === "success" ? <CheckIcon /> : <AlertIcon />}
    {message}
  </motion.div>
);

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeading = ({ children }) => (
  <div className="pt-2 pb-1">
    <h3 className="text-xs font-bold text-brand uppercase tracking-widest">{children}</h3>
    <div className="h-px bg-brand/10 mt-1.5" />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const EditProfileModal = ({ isOpen, onClose, profile, user, onSaveSuccess }) => {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    fullName:    "",
    username:    "",
    displayName: "",
    bio:         "",
    phone:       "",
    occupation:  "",
  });

  const [avatarFile,   setAvatarFile]   = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [errors,       setErrors]       = useState({});
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState(null);
  const [isDirty,      setIsDirty]      = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | checking | taken | available

  const usernameTimer = useRef(null);

  // Pre-fill from profile when modal opens
  useEffect(() => {
    if (!isOpen || !profile) return;
    setForm({
      fullName:    profile.fullName    || profile.name || "",
      username:    profile.username    || "",
      displayName: profile.displayName || "",
      bio:         profile.bio         || "",
      phone:       profile.phone       || "",
      occupation:  profile.occupation  || "",
    });
    setAvatarFile(null);
    setPreviewUrl(null);
    setErrors({});
    setIsDirty(false);
    setUsernameStatus("idle");
  }, [isOpen, profile]);

  // Cleanup object URLs
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setIsDirty(true);
  };

  const handleAvatarChange = (file) => {
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsDirty(true);
  };

  // Debounced username availability check
  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, username: val }));
    setErrors((prev) => ({ ...prev, username: "" }));
    setIsDirty(true);
    setUsernameStatus("idle");

    clearTimeout(usernameTimer.current);
    if (val.length >= 3 && /^[a-zA-Z0-9_]+$/.test(val) && val !== profile?.username) {
      setUsernameStatus("checking");
      usernameTimer.current = setTimeout(async () => {
        try {
          await apiFetch("/api/profile", {
            method: "PATCH",
            body: JSON.stringify({ username: val }),
          });
          setUsernameStatus("available");
        } catch (err) {
          if (err.code === "USERNAME_TAKEN") {
            setUsernameStatus("taken");
            setErrors((prev) => ({ ...prev, username: "Username is already taken." }));
          } else {
            setUsernameStatus("idle");
          }
        }
      }, 700);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) {
      errs.fullName = "Full name is required.";
    } else if (form.fullName.trim().length < 2 || form.fullName.trim().length > 50) {
      errs.fullName = "Full name must be 2–50 characters.";
    }
    if (form.username && (form.username.length < 3 || form.username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(form.username))) {
      errs.username = "Username: 3–20 chars, letters, numbers & underscores only.";
    }
    if (usernameStatus === "taken") {
      errs.username = "Username is already taken.";
    }
    if (form.bio.length > 200) {
      errs.bio = "Bio must be 200 characters or fewer.";
    }
    if (form.displayName && form.displayName.length > 50) {
      errs.displayName = "Display name must be 50 characters or fewer.";
    }
    return errs;
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Discard them?")) return;
    }
    onClose();
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      let updatedUser = null;

      // 1. Upload avatar first if changed
      if (avatarFile) {
        const avatarRes = await uploadAvatar(avatarFile);
        updatedUser = avatarRes.user;
      }

      // 2. Update profile fields
      const payload = {};
      if (form.fullName.trim())    payload.fullName    = form.fullName.trim();
      if (form.username)           payload.username    = form.username;
      if (form.displayName)        payload.displayName = form.displayName;
      if (form.bio !== undefined)  payload.bio         = form.bio;
      if (form.phone !== undefined) payload.phone      = form.phone;
      if (form.occupation !== undefined) payload.occupation = form.occupation;

      if (Object.keys(payload).length > 0) {
        const profileRes = await updateProfile(payload);
        updatedUser = profileRes.user ?? updatedUser;
      }

      // 3. Propagate to parent
      if (updatedUser) {
        onSaveSuccess(updatedUser);
      }

      setIsDirty(false);
      showToast("Profile updated successfully.");
      setTimeout(() => onClose(), 1200);

    } catch (err) {
      if (err.code === "USERNAME_TAKEN") {
        setErrors((prev) => ({ ...prev, username: "Username is already taken." }));
      }
      showToast(err.message || "Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const initial = (profile?.fullName || profile?.name || profile?.email || "U")[0].toUpperCase();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
              onClick={handleClose}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[520px] bg-surface border-l border-strong shadow-2xl flex flex-col overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Edit Profile"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-strong flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-primary">Edit Profile</h2>
                  <p className="text-xs text-muted mt-0.5">Changes are saved to your account.</p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-muted hover:text-primary p-1.5 rounded-lg hover:bg-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  aria-label="Close"
                >
                  <XIcon />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

                {/* Avatar */}
                <SectionHeading>Profile Picture</SectionHeading>
                <AvatarUploader
                  currentUrl={profile?.avatarUrl ? `${import.meta.env.VITE_API_BASE_URL || ""}${profile.avatarUrl}` : null}
                  currentInitial={initial}
                  onFileChange={handleAvatarChange}
                  previewUrl={previewUrl}
                />

                {/* Personal */}
                <SectionHeading>Personal Information</SectionHeading>

                <FieldGroup label="Full Name" htmlFor="edit-fullName" error={errors.fullName}>
                  <InputField
                    id="edit-fullName"
                    value={form.fullName}
                    onChange={set("fullName")}
                    placeholder="Muhammad Maaz Shaikh"
                    maxLength={50}
                  />
                </FieldGroup>

                <FieldGroup
                  label="Username"
                  htmlFor="edit-username"
                  error={errors.username}
                  hint="Letters, numbers, and underscores · 3–20 chars"
                >
                  <div className="relative">
                    <InputField
                      id="edit-username"
                      value={form.username}
                      onChange={handleUsernameChange}
                      placeholder="maaz_shaikh"
                      maxLength={20}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                      {usernameStatus === "checking" && <span className="text-muted"><SpinnerIcon /></span>}
                      {usernameStatus === "available" && <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckIcon /> Available</span>}
                      {usernameStatus === "taken" && <span className="text-red-600 font-semibold">Taken</span>}
                    </div>
                  </div>
                </FieldGroup>

                <FieldGroup label="Display Name" htmlFor="edit-displayName" error={errors.displayName} hint="What appears throughout the app UI">
                  <InputField
                    id="edit-displayName"
                    value={form.displayName}
                    onChange={set("displayName")}
                    placeholder="Maaz"
                    maxLength={50}
                  />
                </FieldGroup>

                <FieldGroup
                  label="Bio / About Me"
                  htmlFor="edit-bio"
                  error={errors.bio}
                  hint={`${form.bio.length}/200 characters`}
                >
                  <textarea
                    id="edit-bio"
                    value={form.bio}
                    onChange={set("bio")}
                    rows={3}
                    maxLength={200}
                    placeholder="Software Engineering Student · Accessibility Advocate"
                    className="w-full bg-bg border border-strong rounded-xl px-3.5 py-2.5 text-sm text-primary placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-150 resize-none"
                  />
                </FieldGroup>

                <FieldGroup label="Phone Number" htmlFor="edit-phone" hint="Optional · International format e.g. +91 98765 43210">
                  <InputField
                    id="edit-phone"
                    value={form.phone}
                    onChange={set("phone")}
                    placeholder="+91 98765 43210"
                    type="tel"
                  />
                </FieldGroup>
                
                <FieldGroup label="Occupation" htmlFor="edit-occupation" hint="Optional · e.g. Student, Software Engineer">
                  <InputField
                    id="edit-occupation"
                    value={form.occupation}
                    onChange={set("occupation")}
                    placeholder="Student"
                    maxLength={100}
                  />
                </FieldGroup>

                {/* Read-only */}
                <SectionHeading>Read-only Information</SectionHeading>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Email" htmlFor="ro-email" readOnly>
                    <ReadonlyField value={profile?.email || user?.email} />
                  </FieldGroup>
                  <FieldGroup label="Account Status" htmlFor="ro-status" readOnly>
                    <ReadonlyField value="Active" />
                  </FieldGroup>
                  <FieldGroup label="Member Since" htmlFor="ro-member" readOnly>
                    <ReadonlyField value={profile?.createdAt
                      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(profile.createdAt))
                      : undefined}
                    />
                  </FieldGroup>
                  <FieldGroup label="Role" htmlFor="ro-role" readOnly>
                    <ReadonlyField value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"} />
                  </FieldGroup>
                  <FieldGroup label="Email Verified" htmlFor="ro-verified" readOnly>
                    <ReadonlyField value="Verified ✓" />
                  </FieldGroup>
                  <FieldGroup label="Daily Usage Limit" htmlFor="ro-limit" readOnly>
                    <ReadonlyField value="50 simplifications / day" />
                  </FieldGroup>
                </div>

                {/* Bottom spacer */}
                <div className="h-4" />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-strong flex-shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-semibold text-secondary border border-strong rounded-xl hover:bg-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  whileTap={!saving ? { scale: 0.97 } : {}}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "var(--color-brand)" }}
                >
                  {saving ? (
                    <><SpinnerIcon /> Saving…</>
                  ) : (
                    <><CheckIcon /> Save Changes</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.msg} type={toast.type} />}
      </AnimatePresence>
    </>
  );
};

export default EditProfileModal;
