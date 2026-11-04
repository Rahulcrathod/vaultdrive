import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api/http.js";
import { deriveEncryptionKey } from "../crypto/encryption.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Derive and cache encryption key in memory
  const initializeKey = async (passphrase, salt) => {
    if (!passphrase || !salt) return null;
    try {
      const key = await deriveEncryptionKey(passphrase, salt);
      setEncryptionKey(key);
      // Cache passphrase temporarily in sessionStorage to survive tab refresh
      sessionStorage.setItem("vaultdrive_passphrase", passphrase);
      return key;
    } catch (err) {
      console.error("Failed to derive encryption key:", err);
      return null;
    }
  };

  const refreshStorage = useCallback(async () => {
    try {
      const data = await api("/api/storage/usage");
      setStorage(data);
    } catch (err) {
      console.warn("Could not fetch storage metrics:", err.message);
    }
  }, []);

  // Check existing session on boot
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api("/api/auth/me");
        if (res?.user) {
          setUser(res.user);
          if (res.storage) setStorage(res.storage);

          // Try restoring encryption key from cached passphrase in sessionStorage
          const savedPass = sessionStorage.getItem("vaultdrive_passphrase");
          if (savedPass && res.user.salt) {
            await initializeKey(savedPass, res.user.salt);
          }
        }
      } catch (err) {
        // Not logged in or session expired
        setUser(null);
        setEncryptionKey(null);
        sessionStorage.removeItem("vaultdrive_passphrase");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (identifier, password, passphrase) => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });

    if (res?.user) {
      setUser(res.user);
      const effectivePassphrase = passphrase || password;
      await initializeKey(effectivePassphrase, res.user.salt);
      await refreshStorage();
    }
    return res;
  };

  const register = async (username, email, password, passphrase) => {
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password })
    });

    if (res?.user) {
      setUser(res.user);
      const effectivePassphrase = passphrase || password;
      await initializeKey(effectivePassphrase, res.user.salt);
      await refreshStorage();
    }
    return res;
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setEncryptionKey(null);
      setStorage(null);
      sessionStorage.removeItem("vaultdrive_passphrase");
    }
  };

  const unlockVault = async (passphrase) => {
    if (!user?.salt) throw new Error("No user salt found to unlock vault.");
    const key = await initializeKey(passphrase, user.salt);
    return Boolean(key);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        encryptionKey,
        storage,
        loading,
        login,
        register,
        logout,
        refreshStorage,
        unlockVault,
        hasKey: Boolean(encryptionKey)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
