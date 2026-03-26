"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiCreditCard, FiCheck, FiX, FiInfo, FiArrowRight } from "react-icons/fi";
import { TenantService } from "@/lib/tenant-service";
import type { Plan, BusinessSize } from "@/types/saas";

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [businessSize, setBusinessSize] = useState<BusinessSize>('small');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
    
    // Get URL parameters
    const reason = searchParams.get('reason');
    if (reason) {
      // Handle different reasons for showing pricing page
      console.log('Showing pricing for reason:', reason);
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const plansData = await TenantService.getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(businessSize)
  );

  const handleSubscribe = async (plan: Plan) => {
    setLoading(true);
    setSelectedPlan(plan);

    try {
      // Check if user is authenticated
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        router.push('/login?redirect=' + encodeURIComponent('/pricing'));
        return;
      }

      const { user } = await response.json();

      // Initialize payment
      const paymentResponse = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          tenantId: user.tenant_id,
          billingCycle,
          customerEmail: user.email,
          customerName: user.name,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.error || 'Payment initialization failed');
      }

      // Redirect to Flutterwave payment page
      window.location.href = paymentData.paymentUrl;
    } catch (error: any) {
      console.error('Subscription error:', error);
      alert(error.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const getYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - yearlyPrice;
    return Math.round((savings / monthlyTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-purple-900 font-bold">V</span>
              </div>
              <span className="text-white font-semibold">Vendro</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-white text-purple-900 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-purple-200 max-w-3xl mx-auto">
            Choose the perfect plan for your business. All plans include core features with no hidden fees.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-purple-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                billingCycle === 'yearly'
                  ? 'bg-white text-purple-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Business Size Selector */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-1 inline-flex">
            {(['small', 'medium', 'large'] as BusinessSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setBusinessSize(size)}
                className={`px-6 py-2 rounded-lg font-medium capitalize transition-all ${
                  businessSize === size
                    ? 'bg-white text-purple-900'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/10 backdrop-blur-lg border-2 rounded-2xl p-8 transition-all hover:scale-105 ${
                plan.tier === 'growth' 
                  ? 'border-white shadow-2xl shadow-white/20' 
                  : 'border-white/20'
              }`}
            >
              {plan.tier === 'growth' && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 capitalize">
                  {plan.tier}
                </h3>
                <div className="text-4xl font-bold text-white mb-2">
                  ${billingCycle === 'monthly' ? plan.monthly_price : plan.yearly_price}
                  <span className="text-lg font-normal text-purple-200">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="text-sm text-green-300">
                    Save {getYearlySavings(plan.monthly_price, plan.yearly_price)}% annually
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-white">Up to {plan.max_products} products</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-white">Up to {plan.max_outlets} outlets</span>
                </div>
                <div className="flex items-center space-x-3">
                  <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-white">Up to {plan.max_users} users</span>
                </div>
                
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <FiCheck className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-white capitalize">
                      {feature.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loading && selectedPlan?.id === plan.id}
                className={`w-full py-3 px-6 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${
                  plan.tier === 'growth'
                    ? 'bg-white text-purple-900 hover:bg-purple-50'
                    : 'bg-white/20 text-white hover:bg-white/30 border-2 border-white/40'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading && selectedPlan?.id === plan.id ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiCreditCard className="w-5 h-5" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Compare All Features
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Starter</th>
                  <th className="text-center py-4 px-4">Growth</th>
                  <th className="text-center py-4 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Basic Inventory</td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Sales Tracking</td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Advanced Analytics</td>
                  <td className="text-center py-4 px-4">
                    <FiX className="w-5 h-5 text-red-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">API Access</td>
                  <td className="text-center py-4 px-4">
                    <FiX className="w-5 h-5 text-red-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-white/10">
                  <td className="py-4 px-4">Priority Support</td>
                  <td className="text-center py-4 px-4">
                    <FiX className="w-5 h-5 text-red-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiX className="w-5 h-5 text-red-400 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-4">
                    <FiCheck className="w-5 h-5 text-green-400 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <div className="flex items-start space-x-3">
                <FiInfo className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Can I change plans anytime?</h3>
                  <p className="text-purple-200 text-sm">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <div className="flex items-start space-x-3">
                <FiInfo className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Is there a free trial?</h3>
                  <p className="text-purple-200 text-sm">
                    Yes! All new accounts start with a 14-day free trial with full access to your chosen plan.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <div className="flex items-start space-x-3">
                <FiInfo className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">What payment methods do you accept?</h3>
                  <p className="text-purple-200 text-sm">
                    We accept all major credit cards, debit cards, and bank transfers through Flutterwave.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <div className="flex items-start space-x-3">
                <FiInfo className="w-5 h-5 text-purple-300 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">Can I cancel anytime?</h3>
                  <p className="text-purple-200 text-sm">
                    Yes, you can cancel your subscription at any time. Your access continues until the end of the billing period.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white/10 backdrop-blur-lg border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to transform your business?
            </h2>
            <p className="text-xl text-purple-200 mb-8">
              Join thousands of businesses using Vendro to streamline their operations.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-purple-900 font-semibold rounded-xl hover:bg-purple-50 transition-all transform hover:scale-105"
            >
              <span>Start Free Trial</span>
              <FiArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
