import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";
import { animateCounter } from "../utils/animateCounter";
import { getPrefersReducedMotion } from "../hooks/useMotion";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Refs for the stat counter DOM elements
  const stat1Ref = useRef(null);
  const stat2Ref = useRef(null);

  // Trigger stat counters when the stats block becomes visible.
  // We use a local IntersectionObserver so the counters fire alongside
  // the Framer Motion fade-in (delay 0.3s matches the existing animation).
  useEffect(() => {
    const stat1 = stat1Ref.current;
    const stat2 = stat2Ref.current;
    if (!stat1 || !stat2) return;

    const reduced = getPrefersReducedMotion();

    if (reduced) {
      // Show final values immediately — no animation
      stat1.textContent = "50,000+";
      stat2.textContent = "95%";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(stat1, 50000, "+");
            animateCounter(stat2, 95, "%");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe stat1 as a proxy for the whole stats row
    observer.observe(stat1);

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-bg overflow-hidden">
      {/* Left Panel: Hero & Stats */}
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

          {/* Hero headline — reveal on scroll (also fades in via Framer Motion on mount) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="reveal is-visible"
          >
            <h1 className="font-display text-4xl lg:text-[48px] font-semibold text-primary leading-[1.1] mb-6 tracking-tight">
              AI-Powered <br/>
              <span className="text-brand    ">Accessibility</span>
            </h1>
            {/* Subtext line — staggered reveal (80ms delay via nth-child CSS) */}
            <p className="text-lg text-secondary mb-12 max-w-md leading-relaxed reveal is-visible">
              Simplify complex content. Improve reading focus. Make the web accessible for everyone.
            </p>
          </motion.div>

          {/* Stats row — arrives as a single group (spec requirement) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="grid grid-cols-2 gap-8 max-w-md"
          >
            <div>
              {/* data-counter values are set by animateCounter() via ref */}
              <div
                ref={stat1Ref}
                className="text-[32px] font-medium text-brand mb-1 leading-none tabular-nums"
                aria-label="50,000+ texts simplified"
              >
                50,000+
              </div>
              <div className="text-sm text-secondary">Texts simplified</div>
            </div>
            <div>
              <div
                ref={stat2Ref}
                className="text-[32px] font-medium text-brand mb-1 leading-none tabular-nums"
                aria-label="95% readability improvement"
              >
                95%
              </div>
              <div className="text-sm text-secondary">Readability improvement</div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 mt-auto flex items-center gap-4 text-sm text-muted">
          <span>&copy; 2026 NeuroAdapt Inc.</span>
          <a href="#" className="hover:text-secondary transition-colors">Privacy</a>
          <a href="#" className="hover:text-secondary transition-colors">Terms</a>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        {/* Mobile background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand rounded-full blur-[100px]" />
        </div>

        {/* Login form card — reveal class for scroll (treated as final state on mount here) */}
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
            <h2 className="text-3xl font-bold text-primary mb-2 tracking-tight">Welcome back</h2>
            <p className="text-secondary">Enter your credentials to access your account.</p>
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
                <label htmlFor="login-email" className="block text-sm font-medium text-secondary mb-1.5">Email</label>
                <input
                  id="login-email"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-medium text-secondary">Password</label>
                  <a href="#" className="text-sm font-medium text-brand hover:text-brand transition-colors">Forgot password?</a>
                </div>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-bg border border-strong text-primary placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input id="remember-me" type="checkbox" className="w-4 h-4 rounded border-strong bg-bg text-brand focus:ring-indigo-500" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary">Remember me for 30 days</label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-secondary">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-brand hover:text-brand transition-colors">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
