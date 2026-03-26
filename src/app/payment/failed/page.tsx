"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiCheck, FiX, FiArrowLeft, FiCreditCard, FiAlertTriangle } from "react-icons/fi";

export default function PaymentFailedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  }, [searchParams]);

  const handleTryAgain = () => {
    router.push('/pricing');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Status Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center justify-center w-20 h-20 bg-red-500 rounded-full shadow-lg shadow-red-500/30">
            <FiX className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">
            Payment Failed
          </h1>
          <p className="text-red-100">
            {reason === 'missing_params'
              ? 'Payment information is missing.'
              : reason === 'server_error'
                ? 'A server error occurred. Please try again.'
                : 'Your payment could not be processed. Please try again.'}
          </p>
        </div>

        {/* Transaction Details */}
        {txRef && (
          <div className="p-4 mb-6 bg-red-800/30 rounded-xl">
            <h3 className="text-sm font-semibold text-red-200 mb-2">Transaction Reference</h3>
            <p className="text-white font-mono">{txRef}</p>
          </div>
        )}

        {/* Error Info */}
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-start space-x-3">
            <FiAlertTriangle className="flex-shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="text-red-100 font-medium">Payment Not Processed</p>
              <p className="text-red-200 text-sm mt-1">
                Your subscription has not been activated. Please try again or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
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
        </div>

        {/* Back to Pricing */}
        <div className="mt-6 text-center">
          <Link
            href="/pricing"
            className="text-red-200 hover:text-white transition-colors inline-flex items-center space-x-2"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Back to Pricing</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
