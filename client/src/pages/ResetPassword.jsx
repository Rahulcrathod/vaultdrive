import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../api/http";
import { Lock, KeyRound, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmedWipe, setConfirmedWipe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError("Missing password reset token in URL. Please use the link sent to your email.");
      return;
    }

    async function verify() {
      try {
        const res = await api(`/api/auth/verify-reset-token/${encodeURIComponent(token)}`);
        setTokenValid(true);
        if (res.email) setUserEmail(res.email);
      } catch (err) {
        setTokenValid(false);
        setTokenError(err.message || "Invalid or expired reset token.");
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!confirmedWipe) {
      setError("Please confirm the zero-knowledge security disclaimer.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
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
            <KeyRound className="w-7 h-7 text-teal-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">Set New Password</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose a new master password for your VaultDrive account
          </p>
        </div>

        {verifying ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Verifying security token...</p>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4 animate-fade-in text-center">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-1" />
              <p className="font-semibold text-white text-sm">Invalid or Expired Link</p>
              <p className="text-rose-300 leading-relaxed">{tokenError}</p>
            </div>
            <div className="pt-4">
              <Link
                to="/forgot-password"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <span>Request a New Reset Link</span>
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="space-y-4 animate-fade-in text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white text-sm">Password Reset Complete</p>
              <p className="text-slate-300 leading-relaxed">
                Your password and zero-knowledge encryption salt have been updated. You can now log into your 2 GB vault.
              </p>
            </div>
            <div className="pt-4">
              <Link
                to="/login"
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center space-x-2"
              >
                <span>Log In with New Password</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {userEmail && (
              <p className="text-xs text-center text-slate-400 mb-2">
                Resetting password for: <strong className="text-teal-400">{userEmail}</strong>
              </p>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            {/* Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Zero-Knowledge Vault Notice</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Because files are encrypted on your device with your password, previous files cannot be decrypted without the old password. Resetting will re-initialize your clean 2 GB vault.
              </p>
              <label className="flex items-center space-x-2 pt-1 text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={confirmedWipe}
                  onChange={(e) => setConfirmedWipe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-[11px] font-medium">I understand and want to reset my password</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Confirm & Reset Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
