import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/http";
import StorageMeter from "../components/StorageMeter";
import {
  User,
  Mail,
  Shield,
  Calendar,
  MapPin,
  Phone,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  Lock,
  Sparkles,
  HardDrive
} from "lucide-react";

export default function Profile() {
  const { user, storage, updateUser, reloadUser } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    bio: ""
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Sync initial user details into form state
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        fullName: user.fullName || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        bio: user.bio || ""
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCopyId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify(formData)
      });

      if (res?.user) {
        updateUser(res.user);
        setSuccessMsg(res.message || "Profile details updated successfully!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile details");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes = 0) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const used = storage?.usedBytes || user?.usedBytes || 0;
  const total = storage?.quotaBytes || user?.quotaBytes || 2147483648;
  const pct = Math.min(100, Math.round((used / total) * 100));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vault Dashboard</span>
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          E2EE Account ID: {user?.id?.substring(0, 10)}...
        </span>
      </div>

      {/* Profile Overview Header Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
          <div className="flex items-center space-x-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-teal-500/20 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-400 font-black text-3xl uppercase">
                {formData.username ? formData.username[0] : "U"}
              </div>
            </div>

            {/* User Meta */}
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {formData.fullName || formData.username || "User Profile"}
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full">
                  Verified Vault
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{formData.email}</span>
                <span>•</span>
                <span>@{formData.username}</span>
              </p>
              {user?.createdAt && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Member since {new Date(user.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
              )}
            </div>
          </div>

          {/* User ID Copy Badge */}
          <div className="flex flex-col sm:items-end justify-center space-y-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Account / User ID
            </span>
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="font-mono text-xs text-slate-300 max-w-[160px] truncate">
                {user?.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                title="Copy User ID"
                className="p-1 hover:text-teal-400 text-slate-400 transition-colors"
              >
                {copiedId ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            {copiedId && (
              <span className="text-[10px] text-emerald-400 font-medium">Copied to clipboard!</span>
            )}
          </div>
        </div>

        {/* Storage & E2EE Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                <span>2 GB Private Storage</span>
              </span>
              <span className="font-bold text-slate-200">{pct}% used</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {formatSize(used)} used of {formatSize(total)} total
            </p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 text-xs flex items-center space-x-1.5 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Encryption Architecture</span>
            </span>
            <p className="font-semibold text-xs text-white">Client AES-256-GCM + PBKDF2</p>
            <p className="text-[11px] text-slate-500 mt-1">Zero-Knowledge client derivation</p>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
            <span className="text-slate-400 text-xs flex items-center space-x-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              <span>User Cryptographic Salt</span>
            </span>
            <p className="font-mono text-xs text-slate-300 truncate">
              {user?.salt ? `${user.salt.substring(0, 16)}...` : "Active"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Unique 16-byte hex PBKDF2 salt</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5 animate-fade-in shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5 animate-fade-in shadow-lg shadow-rose-500/5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Profile Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Account Credentials / Identity */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <User className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-white">Account Credentials & ID</h2>
              <p className="text-xs text-slate-400">Modify your username or login email address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username (User ID Tag) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. rahul123"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Letters, numbers, underscores, and dashes (3-50 chars).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Used for account recovery and password reset links.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Personal Details */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-white">Personal Information</h2>
              <p className="text-xs text-slate-400">Tell us more about yourself</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Rahul Rathod"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bio / About Me
              </label>
              <textarea
                name="bio"
                rows="2"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Software engineer, photographer, cloud enthusiast..."
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Location & Address */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
            <MapPin className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-base font-bold text-white">Address & Location</h2>
              <p className="text-xs text-slate-400">Your address and geographical details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div className="sm:col-span-2 md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street, Apt 4B"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Mumbai"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                State / Province
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Maharashtra"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Postal / ZIP Code
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="400001"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="India"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Security Note Banner */}
        <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 flex items-start space-x-3">
          <Shield className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">Zero-Knowledge Data Preservation</p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Updating your profile details does not change your encryption key or salt. All your encrypted files and photos remain completely safe, intact, and accessible.
            </p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
