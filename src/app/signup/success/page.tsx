"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignUpSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantId, setTenantId] = useState<string>("");

  useEffect(() => {
    const tenant = searchParams.get('tenant');
    if (tenant) {
      setTenantId(tenant);
    }
  }, [searchParams]);

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Success icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg shadow-white/30">
            <span className="text-5xl">✅</span>
          </div>
        </div>

        {/* Success message */}
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold text-white">
            Welcome to Vendro! 🎉
          </h1>
          <p className="text-xl text-green-100 mb-2">
            Your account has been created successfully
          </p>
          <p className="text-green-200">
            Start your 14-day free trial and transform your business today
          </p>
        </div>

        {/* Next steps */}
        <div className="p-6 mb-8 bg-white/10 backdrop-blur-lg border-2 border-white/20 rounded-2xl">
          <h2 className="mb-4 text-lg font-semibold text-white">What's Next?</h2>
          <div className="space-y-3 text-left">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-semibold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Check your email</p>
                <p className="text-green-200 text-sm">We've sent a confirmation email with your account details</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-semibold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Sign in to your dashboard</p>
                <p className="text-green-200 text-sm">Access your personalized POS system</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs text-white font-semibold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Configure your business</p>
                <p className="text-green-200 text-sm">Add products, set up your outlet, and start selling</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trial info */}
        <div className="p-4 mb-8 bg-yellow-500/20 border border-yellow-500/50 rounded-xl">
          <div className="flex items-center justify-center space-x-2 text-yellow-100">
            <span className="text-sm">📧</span>
            <span className="text-sm font-medium">
              Free trial active for 14 days
            </span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="space-y-4">
          <button
            onClick={handleGoToLogin}
            className="w-full py-4 bg-white text-green-900 font-semibold rounded-xl hover:bg-green-50 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2"
          >
            <span>Go to Login</span>
            <span>→</span>
          </button>
          
          <a
            href="mailto:support@vendro.com"
            className="block w-full py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 border-2 border-white/20"
          >
            Need Help? Contact Support
          </a>
        </div>

        {/* Tenant ID (for debugging) */}
        {tenantId && (
          <div className="mt-6 text-xs text-green-300">
            Tenant ID: {tenantId}
          </div>
        )}

        {/* Additional info */}
        <div className="mt-8 text-center">
          <p className="text-green-200 text-sm">
            No credit card required • Cancel anytime • Full access to all features
          </p>
        </div>
      </div>
    </div>
  );
}
