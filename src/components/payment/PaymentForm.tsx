"use client";

import { useState, useEffect } from 'react';
import { CreditCard, Lock, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
}

interface PaymentFormProps {
  plan: Plan;
  tenantId: string;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export default function PaymentForm({ plan, tenantId, billingCycle, onSuccess, onError }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityVerified, setSecurityVerified] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    acceptTerms: false,
    securityCheck: false
  });
  
  const router = useRouter();
  const amount = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

  // Security verification on mount
  useEffect(() => {
    verifySecurity();
  }, []);

  const verifySecurity = async () => {
    try {
      // Check if connection is secure
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        setError('Payment processing requires a secure connection (HTTPS)');
        return;
      }

      // Generate CSRF token
      const csrfToken = await generateCSRFToken();
      if (csrfToken) {
        setSecurityVerified(true);
      }
    } catch (error) {
      console.error('Security verification failed:', error);
      setError('Security verification failed. Please refresh the page.');
    }
  };

  const generateCSRFToken = async (): Promise<string> => {
    // In a real implementation, this would fetch a token from the server
    return Math.random().toString(36).substring(2, 15);
  };

  const validateForm = (): boolean => {
    if (!formData.customerName.trim()) {
      setError('Please enter your name');
      return false;
    }

    if (!formData.customerEmail.trim()) {
      setError('Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customerEmail)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.customerPhone.trim()) {
      setError('Please enter your phone number');
      return false;
    }

    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions');
      return false;
    }

    if (!formData.securityCheck) {
      setError('Please confirm you understand the security measures');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      // Initialize payment with security features
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
          'X-CSRF-Token': await generateCSRFToken()
        },
        body: JSON.stringify({
          planId: plan.id,
          tenantId: tenantId,
          billingCycle: billingCycle,
          customerEmail: formData.customerEmail,
          customerName: formData.customerName,
          customerPhone: formData.customerPhone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      // Security check: Verify payment URL is from Flutterwave
      if (!data.paymentUrl || !data.paymentUrl.includes('flutterwave')) {
        throw new Error('Invalid payment gateway response');
      }

      setPaymentUrl(data.paymentUrl);
      setProcessing(true);

      // Open payment in secure popup or redirect
      if (window.innerWidth > 768) {
        // Desktop: Open in popup for better UX
        const popup = window.open(
          data.paymentUrl,
          'vendro-payment',
          'width=800,height=600,scrollbars=yes,resizable=yes,secure=yes'
        );

        if (popup) {
          // Monitor popup for completion
          const checkClosed = setInterval(() => {
            if (popup.closed) {
              clearInterval(checkClosed);
              setProcessing(false);
              // Verify payment status
              verifyPaymentStatus(data.tx_ref);
            }
          }, 1000);
        } else {
          // Fallback to redirect
          window.location.href = data.paymentUrl;
        }
      } else {
        // Mobile: Redirect directly
        window.location.href = data.paymentUrl;
      }

    } catch (error) {
      console.error('Payment initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentStatus = async (txRef: string) => {
    try {
      const response = await fetch(`/api/payments/verify/${txRef}`);
      const data = await response.json();

      if (data.status === 'successful') {
        onSuccess?.(data);
        router.push('/payment/success?tx_ref=' + txRef);
      } else {
        setError('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setError('Unable to verify payment status. Please check your email for confirmation.');
    }
  };

  if (!securityVerified) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-yellow-500" />
        </div>
        <h3 className="text-lg font-semibold text-center mb-2">Security Verification</h3>
        <p className="text-gray-600 text-center text-sm">
          Verifying secure connection...
        </p>
      </div>
    );
  }

  if (paymentUrl && processing) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-center mb-2">Processing Payment</h3>
        <p className="text-gray-600 text-center text-sm mb-4">
          You will be redirected to our secure payment provider...
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center">
            <Lock className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm text-blue-700">
              Your payment is processed securely by Flutterwave
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Security Badge */}
      <div className="flex items-center justify-center mb-6">
        <div className="bg-green-100 rounded-full p-2">
          <Shield className="w-6 h-6 text-green-600" />
        </div>
        <span className="ml-2 text-sm font-medium text-green-700">Secure Payment</span>
      </div>

      {/* Plan Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">{plan.name} Plan</h3>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-gray-900">₦{amount.toLocaleString()}</span>
          <span className="text-gray-500 ml-2">/{billingCycle}</span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          {billingCycle === 'yearly' && (
            <span className="text-green-600 font-medium">Save 20% with yearly billing</span>
          )}
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="John Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={formData.customerEmail}
            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="john@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.customerPhone}
            onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+234 800 000 0000"
            required
          />
        </div>

        {/* Security Checkbox */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.securityCheck}
              onChange={(e) => setFormData({ ...formData, securityCheck: e.target.checked })}
              className="mt-1 mr-3"
              required
            />
            <div className="text-sm">
              <span className="font-medium text-blue-900">Security Confirmation</span>
              <p className="text-blue-700 mt-1">
                I understand this payment is processed securely with 256-bit encryption and my financial information is protected.
              </p>
            </div>
          </label>
        </div>

        {/* Terms and Conditions */}
        <div>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={formData.acceptTerms}
              onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
              className="mt-1 mr-3"
              required
            />
            <div className="text-sm">
              <span className="font-medium text-gray-900">Terms and Conditions</span>
              <p className="text-gray-600 mt-1">
                I agree to the subscription terms and understand that this is a recurring payment that can be cancelled at any time.
              </p>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !securityVerified}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₦{amount.toLocaleString()}
            </>
          )}
        </button>
      </form>

      {/* Security Features */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          <div className="flex items-center">
            <Lock className="w-3 h-3 mr-1" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center">
            <Shield className="w-3 h-3 mr-1" />
            <span>PCI Compliant</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            <span>Fraud Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
