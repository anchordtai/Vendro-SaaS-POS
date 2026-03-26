"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TenantService } from "@/lib/tenant-service";
import { supabase } from "@/lib/supabase";
import type { BusinessType, BusinessSize } from "@/types/saas";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [businessData, setBusinessData] = useState({
    business_name: "",
    business_type: "" as BusinessType,
    business_size: "" as BusinessSize,
    email: "",
    phone: "",
    address: "",
    city: "",
    country: ""
  });
  
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const businessTypes = [
    { value: "pharmacy", label: "Pharmacy", icon: "💊", description: "Medical supplies and prescriptions" },
    { value: "hotel_bar", label: "Hotel Bar", icon: "🍸", description: "Bar services for hotels" },
    { value: "nightclub", label: "Nightclub", icon: "🎵", description: "Entertainment and drinks venue" },
    { value: "grocery", label: "Grocery Store", icon: "🛒", description: "Food and household items" },
    { value: "retail", label: "Retail Store", icon: "🏪", description: "General merchandise" }
  ];

  const businessSizes = [
    { value: "small", label: "Small", description: "1-10 employees", products: "100 products" },
    { value: "medium", label: "Medium", description: "11-50 employees", products: "500 products" },
    { value: "large", label: "Large", description: "50+ employees", products: "2,000+ products" }
  ];

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!businessData.business_name || !businessData.business_type || !businessData.business_size || !businessData.email) {
      setError("Please fill in all required fields");
      return;
    }
    
    setStep(2);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (adminData.password !== adminData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      if (adminData.password.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      // Create Supabase Auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
        options: {
          data: {
            name: adminData.name,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to create auth user");
        setLoading(false);
        return;
      }

      // Create tenant and user with the auth user ID
      const result = await TenantService.createTenant({
        ...businessData,
        admin_user: {
          id: authData.user.id, // Pass the auth user ID
          name: adminData.name,
          email: adminData.email,
          password: adminData.password
        }
      });

      // Show success message and redirect
      router.push(`/signup/success?tenant=${result.tenant.id}`);
    } catch (error: any) {
      setError(error.message || "Failed to create account");
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

      <div className="relative w-full max-w-4xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 1 ? 'bg-white text-purple-900' : 'bg-white/20 text-white'
            }`}>
              1
            </div>
            <div className={`w-24 h-1 ${step >= 2 ? 'bg-white' : 'bg-white/20'}`} />
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step >= 2 ? 'bg-white text-purple-900' : 'bg-white/20 text-white'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-center mt-2 text-white text-sm">
            <span className={step === 1 ? 'font-semibold' : ''}>Business Info</span>
            <span className="mx-16">Admin Account</span>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4 shadow-lg bg-white rounded-2xl shadow-white/30">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-white">
            Vendro
          </h1>
          <p className="text-purple-200">
            {step === 1 ? "Tell us about your business" : "Create your admin account"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 text-sm text-red-200 border rounded-lg bg-red-500/20 border-red-500/50">
            {error}
          </div>
        )}

        {/* Step 1: Business Information */}
        {step === 1 && (
          <div className="p-8 backdrop-blur-lg bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl">
            <form onSubmit={handleBusinessSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Business Name *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">🏢</span>
                    <input
                      type="text"
                      value={businessData.business_name}
                      onChange={(e) => setBusinessData({...businessData, business_name: e.target.value})}
                      className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="Enter business name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Business Email *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">✉️</span>
                    <input
                      type="email"
                      value={businessData.email}
                      onChange={(e) => setBusinessData({...businessData, email: e.target.value})}
                      className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="business@example.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-4 text-sm font-medium text-white">
                  Business Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {businessTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setBusinessData({...businessData, business_type: type.value as BusinessType})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        businessData.business_type === type.value
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/20 bg-white/5 text-purple-200 hover:border-white/40'
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs mt-1 opacity-80">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-4 text-sm font-medium text-white">
                  Business Size *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {businessSizes.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setBusinessData({...businessData, business_size: size.value as BusinessSize})}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        businessData.business_size === size.value
                          ? 'border-white bg-white/20 text-white'
                          : 'border-white/20 bg-white/5 text-purple-200 hover:border-white/40'
                      }`}
                    >
                      <div className="font-semibold text-lg">{size.label}</div>
                      <div className="text-sm mt-1">{size.description}</div>
                      <div className="text-xs mt-2 opacity-80">Up to {size.products}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">📞</span>
                    <input
                      type="tel"
                      value={businessData.phone}
                      onChange={(e) => setBusinessData({...businessData, phone: e.target.value})}
                      className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="+234 800 000 0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-white">
                    City
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">📍</span>
                    <input
                      type="text"
                      value={businessData.city}
                      onChange={(e) => setBusinessData({...businessData, city: e.target.value})}
                      className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                      placeholder="Lagos"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Business Address
                </label>
                <textarea
                  value={businessData.address}
                  onChange={(e) => setBusinessData({...businessData, address: e.target.value})}
                  className="w-full py-3 px-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                  placeholder="Enter your business address"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-white text-purple-900 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Continue to Admin Account
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <div className="p-8 backdrop-blur-lg bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl">
            <form onSubmit={handleAdminSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Your Full Name *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">👤</span>
                  <input
                    type="text"
                    value={adminData.name}
                    onChange={(e) => setAdminData({...adminData, name: e.target.value})}
                    className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Admin Email *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">✉️</span>
                  <input
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                    className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminData.password}
                    onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                    className="w-full py-3 pl-10 pr-12 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-200 hover:text-white"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-white">
                  Confirm Password *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-200">🔒</span>
                  <input
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({...adminData, confirmPassword: e.target.value})}
                    className="w-full py-3 pl-10 pr-4 text-white placeholder-purple-200 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              {/* Business Summary */}
              <div className="p-4 bg-white/10 rounded-xl">
                <h3 className="font-semibold text-white mb-2">Business Summary</h3>
                <div className="space-y-1 text-sm text-purple-200">
                  <p><strong>Business:</strong> {businessData.business_name}</p>
                  <p><strong>Type:</strong> {businessTypes.find(t => t.value === businessData.business_type)?.label}</p>
                  <p><strong>Size:</strong> {businessSizes.find(s => s.value === businessData.business_size)?.label}</p>
                  <p><strong>Email:</strong> {businessData.email}</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-white text-purple-900 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-purple-200">
            Already have an account?{" "}
            <a href="/login" className="text-white font-semibold hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
