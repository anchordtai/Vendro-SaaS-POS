"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Get redirect parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      switch (errorParam) {
        case 'inactive':
          setError('Your account has been deactivated. Please contact support.');
          break;
        case 'tenant':
          setError('Tenant not found. Please contact support.');
          break;
        case 'expired':
          setError('Your subscription has expired. Please choose a plan to continue.');
          break;
        case 'trial_expired':
          setError('Your free trial has expired. Please choose a plan to continue.');
          break;
        case 'unauthorized':
          setError('You do not have permission to access this page.');
          break;
        case 'server':
          setError('Server error. Please try again later.');
          break;
        default:
          setError('Authentication required. Please log in.');
      }
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (data.redirectTo) {
        router.push(data.redirectTo);
        return;
      }

      // Redirect based on user role
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      
      if (data.user.role === 'super_admin') {
        console.log('Redirecting super admin to: /admin');
        router.push('/admin');
      } else if (data.user.role === 'cashier' || data.user.role === 'staff') {
        console.log('Redirecting cashier/staff to: /dashboard/cashier');
        router.push('/dashboard/cashier');
      } else if (data.user.role === 'tenant_admin' || data.user.role === 'manager') {
        console.log('Redirecting tenant admin/manager to: /dashboard/admin');
        router.push('/dashboard/admin');
      } else {
        // Fallback to dashboard router
        const redirectTo = redirect || '/dashboard';
        console.log('Redirecting to:', redirectTo);
        router.push(redirectTo);
      }

    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div className="p-8 backdrop-blur-lg bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl">
          {/* Connection Status */}
          <div className="flex items-center justify-center mb-4">
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isOnline 
                ? 'bg-green-500/20 text-green-200 border border-green-500/50' 
                : 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/50'
            }`}>
              {isOnline ? (
                <>
                  <span className="mr-2">📶</span>
                  Online Mode
                </>
              ) : (
                <>
                  <span className="mr-2">📵</span>
                  Offline Mode
                </>
              )}
            </div>
          </div>

          <h2 className="mb-6 text-2xl font-semibold text-center text-white">
            Welcome Back
          </h2>

          {/* Error message */}
          {error && (
            <div className="p-3 mb-4 text-sm text-red-200 border rounded-lg bg-red-500/20 border-red-500/50 flex items-start space-x-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-medium text-purple-200">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-300 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-purple-200">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-12 text-white placeholder-purple-300 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-purple-50 text-purple-900 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Forgot password link */}
          <div className="mt-6 text-center">
            <a
              href="/forgot-password"
              className="text-purple-200 hover:text-white text-sm transition-colors"
            >
              Forgot your password?
            </a>
          </div>

          {/* Sign up link */}
          <div className="mt-8 text-center">
            <p className="text-purple-200">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-white font-semibold hover:text-purple-100 transition-colors"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-purple-200 hover:text-white text-sm transition-colors flex items-center justify-center"
          >
            <span className="mr-2">←</span>
            Back to homepage
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-6 text-sm text-center text-purple-300">
          © 2024 Vendro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
