"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { FiLock, FiMail, FiEye, FiEyeOff, FiMoon, FiWifi, FiWifiOff } from "react-icons/fi";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const router = useRouter();
  const { 
    login, 
    isAuthenticated, 
    isOfflineMode, 
    restoreSession,
    checkOfflineStatus 
  } = useAuthStore();

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      checkOfflineStatus();
    };

    updateOnlineStatus();
    
    // Setup online/offline listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Try to restore session on mount
    restoreSession();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [restoreSession, checkOfflineStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      // Role-based redirect
      const user = useAuthStore.getState().user;
      if (user?.role === "cashier") {
        router.push("/dashboard/pos");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email, password);
      
      if (!success) {
        const storeError = useAuthStore.getState().error;
        setError(storeError || "Login failed");
      }
    } catch (error) {
      setError("An unexpected error occurred");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-night-900 via-night-800 to-night-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 shadow-lg bg-primary rounded-2xl shadow-primary/30">
            <FiMoon className="w-10 h-10 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-white">
            Onyxx Nightlife
          </h1>
          <p className="text-night-300">Point of Sale System</p>
        </div>

        {/* Login Form */}
        <div className="p-8 border shadow-2xl bg-white/10 backdrop-blur-lg rounded-2xl border-white/10">
          {/* Connection Status */}
          <div className="flex items-center justify-center mb-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isOnline 
                ? 'bg-green-500/20 text-green-200 border border-green-500/50' 
                : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/50'
            }`}>
              {isOnline ? (
                <>
                  <FiWifi className="mr-2" />
                  Online Mode
                </>
              ) : (
                <>
                  <FiWifiOff className="mr-2" />
                  Offline Mode
                </>
              )}
            </div>
          </div>

          <h2 className="mb-6 text-2xl font-semibold text-center text-white">
            Welcome Back
          </h2>

          {error && (
            <div className="p-3 mb-4 text-sm text-red-200 border rounded-lg bg-red-500/20 border-red-500/50">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium text-night-200">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute -translate-y-1/2 left-3 top-1/2 text-night-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 text-white transition-all border bg-white/10 border-white/20 rounded-xl placeholder-night-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-night-200">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute -translate-y-1/2 left-3 top-1/2 text-night-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-12 text-white transition-all border bg-white/10 border-white/20 rounded-xl placeholder-night-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute transition-colors -translate-y-1/2 right-3 top-1/2 text-night-400 hover:text-white"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="w-5 h-5 mr-3 -ml-1 text-white animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Login mode info - no credentials exposed */}
          <div className="p-4 mt-6 text-center border bg-blue-500/20 border-blue-500/50 rounded-xl">
            <p className="mb-2 font-medium text-blue-100">
              {isOnline ? "Online & Offline Login Supported" : "Offline Login Only"}
            </p>
            <p className="text-xs text-blue-200">
              {isOnline
                ? "System will try online login first, then fallback to offline"
                : "Using cached credentials for offline access"}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-center text-night-400">
          © 2024 Onyxx Nightlife POS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
