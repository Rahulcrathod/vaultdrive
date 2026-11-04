import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Lock, User, KeyRound, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [samePassphrase, setSamePassphrase] = useState(true);
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const effectivePassphrase = samePassphrase ? password : passphrase;
      await login(identifier.trim(), password, effectivePassphrase);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 mx-auto mb-5">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Lock className="w-7 h-7 text-teal-400" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">Access Your Vault</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in to unlock your client-side encrypted 2 GB storage
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                autoFocus
                placeholder="username or user@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <Link to="/forgot-password" className="text-xs text-teal-400 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          {/* Passphrase option */}
          <div className="pt-2">
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={samePassphrase}
                onChange={(e) => setSamePassphrase(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500"
              />
              <span>Use account password for vault decryption</span>
            </label>

            {!samePassphrase && (
              <div className="mt-3 relative animate-fade-in">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Zero-Knowledge Encryption Passphrase
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-teal-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required={!samePassphrase}
                    placeholder="Enter your private encryption passphrase"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-teal-500/40 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-400 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deriving AES-256 Key & Unlocking...</span>
              </>
            ) : (
              <>
                <span>Unlock Vault & Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Don't have a secure storage account yet?{" "}
            <Link to="/register" className="text-teal-400 hover:underline font-semibold">
              Get 2 GB Free Storage
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
