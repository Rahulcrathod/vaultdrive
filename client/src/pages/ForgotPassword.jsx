import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/http";
import { Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [serverMsg, setServerMsg] = useState(null);
  const [resetLink, setResetLink] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() })
      });
      setServerMsg(res.message);
      if (res.resetUrl) setResetLink(res.resetUrl);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 mx-auto mb-5">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Mail className="w-7 h-7 text-teal-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">Forgot Password</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your account email to receive a password reset link
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 animate-fade-in text-center">
            {resetLink && (
              <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-center space-y-3">
                <p className="text-xs font-bold text-teal-300">🔑 Instant Password Reset Link:</p>
                <a
                  href={resetLink}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs inline-flex items-center justify-center shadow-lg shadow-teal-500/20 transition-all"
                >
                  Click Here to Set New Password Now
                </a>
                <p className="text-[10px] text-slate-400 break-all select-all font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  {resetLink}
                </p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-teal-300 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto mb-1" />
              <p className="font-semibold text-white text-sm">Request Processed</p>
              <p className="text-slate-300 leading-relaxed text-xs">
                {serverMsg || `Password reset instructions have been generated for ${email}.`}
              </p>
              <div className="pt-2 text-[11px] text-amber-300/90 text-left bg-slate-950/40 p-2.5 rounded-lg border border-amber-500/20">
                <p className="font-bold mb-1">📌 Delivery Notes:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  <li>Check your <strong>Spam / Junk</strong> folder.</li>
                  <li>Check <strong>Promotions / Updates</strong> tab in Gmail.</li>
                  <li>If your email is the same as the sender email, check your <strong>Sent Mail</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-300 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                <strong>Zero-Knowledge Note:</strong> Resetting your password will re-initialize your vault with a fresh key so you can start clean.
              </span>
            </div>

            <div className="pt-4">
              <Link
                to="/login"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Login</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending reset instructions...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
