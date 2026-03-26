"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiCheck, FiX, FiArrowLeft, FiCreditCard, FiAlertTriangle } from "react-icons/fi";

export default function PaymentResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'success' | 'failed' | 'loading'>('loading');
  const [txRef, setTxRef] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    const tx_ref = searchParams.get('tx_ref');
    const reason_param = searchParams.get('reason');
    
    if (tx_ref) {
      setTxRef(tx_ref);
    }
    if (reason_param) {
      setReason(reason_param);
    }

    // Determine status based on URL path and parameters
    if (window.location.pathname.includes('/success')) {
      setStatus('success');
    } else if (window.location.pathname.includes('/failed')) {
      setStatus('failed');
    }
  }, [searchParams]);

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleTryAgain = () => {
    router.push('/pricing');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Processing payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Status Icon */}
        <div className="mb-6 flex justify-center">
          <div className={`flex items-center justify-center w-20 h-20 rounded-full shadow-lg ${
            status === 'success' 
              ? 'bg-green-500 shadow-green-500/30' 
              : 'bg-red-500 shadow-red-500/30'
          }`}>
            {status === 'success' ? (
              <FiCheck className="w-10 h-10 text-white" />
            ) : (
              <FiX className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">
            {status === 'success' ? 'Payment Successful!' : 'Payment Failed'}
          </h1>
          <p className="text-gray-300">
            {status === 'success' 
              ? 'Your subscription has been activated successfully.'
              : reason === 'missing_params'
                ? 'Payment information is missing.'
                : reason === 'server_error'
                  ? 'A server error occurred. Please try again.'
                  : 'Your payment could not be processed. Please try again.'
            }
          </p>
        </div>

        {/* Transaction Details */}
        {txRef && (
          <div className="p-4 mb-6 bg-gray-800 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Transaction Reference</h3>
            <p className="text-white font-mono">{txRef}</p>
          </div>
        )}

        {/* Additional Info for Success */}
        {status === 'success' && (
          <div className="p-4 mb-6 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <FiCheck className="flex-shrink-0 mt-0.5 text-green-400" />
              <div>
                <p className="text-green-100 font-medium">Subscription Activated</p>
                <p className="text-green-200 text-sm mt-1">
                  You can now access all features included in your plan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info for Failure */}
        {status === 'failed' && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start space-x-3">
              <FiAlertTriangle className="flex-shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="text-red-100 font-medium">Payment Not Processed</p>
                <p className="text-red-200 text-sm mt-1">
                  Your subscription has not been activated. Please try again or contact support.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {status === 'success' ? (
            <>
              <button
                onClick={handleGoToDashboard}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <FiArrowRight className="w-5 h-5" />
              </button>
              
              <Link
                href="/billing"
                className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 text-center"
              >
                View Invoice
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={handleTryAgain}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <FiCreditCard className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              
              <Link
                href="/support"
                className="block w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 text-center"
              >
                Contact Support
              </Link>
            </>
          )}
        </div>

        {/* Back to Pricing */}
        <div className="mt-6 text-center">
          <Link
            href="/pricing"
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center space-x-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Pricing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
