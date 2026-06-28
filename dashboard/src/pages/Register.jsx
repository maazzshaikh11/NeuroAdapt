import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";


const features = [
  { icon: "✨", title: "AI-Powered Simplification", desc: "Convert complex text into easy-to-read language instantly." },
  { icon: "🧠", title: "Bionic Reading", desc: "Enhance focus and reading speed with intelligent text formatting." },
  { icon: "🎯", title: "Focus Mode", desc: "Eliminate distractions and improve reading comprehension." },
  { icon: "♿", title: "Dyslexia-Friendly", desc: "Custom fonts and spacing designed for neurodiverse users." },
];

export default function Register() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-bg overflow-hidden">
      {/* Left Panel: Features */}
      <div className="relative hidden lg:flex flex-col min-h-screen px-12 pt-12 pb-8 lg:px-24 lg:pt-24 lg:pb-10 bg-bg border-r border">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-brand rounded-full blur-[120px]" />
          <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] bg-brand-soft rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/logo.jpeg" alt="NeuroAdapt Logo" className="w-[40px] h-[40px] object-contain rounded-md shadow-sm" />
            <span className="text-xl font-bold text-primary tracking-tight">NeuroAdapt</span>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-4xl lg:text-[48px] font-semibold text-primary leading-[1.1] mb-6 tracking-tight">
              The web, made <br />
              <span className="text-brand    ">accessible for all</span>
            </h1>
            <p className="text-lg text-secondary mb-12 max-w-md leading-relaxed">
              Join thousands of users who read faster, comprehend better, and browse without barriers.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }} className="space-y-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.4, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-surface border border-strong flex items-center justify-center text-lg flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{f.title}</p>
                  <p className="text-sm text-muted mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="relative z-10 mt-auto flex items-center gap-4 text-sm text-muted">
          <span>&copy; 2026 NeuroAdapt Inc.</span>
          <a href="#" className="hover:text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-secondary transition-colors">Terms</a>
        </div>
      </div>

      {/* Right Panel: Register Form */}
      <div className="flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px] z-10"
        >
          <div className="mb-10 lg:hidden flex items-center justify-center gap-3">
            <img src="/logo.jpeg" alt="NeuroAdapt Logo" className="w-[40px] h-[40px] object-contain rounded-md shadow-sm" />
            <span className="text-2xl font-bold text-primary">NeuroAdapt</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">Create an account</h2>
            <p className="text-secondary">Start your accessibility journey today.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-secondary mb-1.5">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-bg border border-strong text-primary placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-secondary mb-1.5">Email</label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-bg border border-strong text-primary placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-secondary mb-1.5">Password</label>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full bg-bg border border-strong text-primary placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Creating account..." : "Create Free Account"}
            </button>

            <p className="text-center text-xs text-muted">
              By signing up, you agree to our{" "}
              <a href="#" className="text-brand hover:text-brand">Terms of Service</a> and{" "}
              <a href="#" className="text-brand hover:text-brand">Privacy Policy</a>.
            </p>
          </form>

          <p className="mt-8 text-center text-sm text-secondary">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand hover:text-brand transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
