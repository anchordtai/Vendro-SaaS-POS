"use client";

import { useState } from "react";
import { Shield, User, Mail, CheckCircle, AlertCircle, Loader, ExternalLink, Copy } from "lucide-react";

export default function SuperAdminSetupManual() {
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/setup-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to create super admin');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Super Admin Record Created!</h2>
              <p className="text-gray-300">
                Database record created successfully. Now complete the setup in Supabase.
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">User Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-300">Name:</span>
                  <span className="text-white font-mono">{result.user.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300">Email:</span>
                  <span className="text-white font-mono">{result.user.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300">User ID:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-sm">{result.user.id}</span>
                    <button
                      onClick={() => copyToClipboard(result.user.id)}
                      className="p-1 hover:bg-green-500/20 rounded"
                    >
                      <Copy className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                </div>
                {copied && (
                  <p className="text-green-400 text-sm">Copied to clipboard!</p>
                )}
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-4">Next Steps - Supabase Setup</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Go to Supabase Dashboard</p>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline flex items-center space-x-1"
                    >
                      <span>Open Supabase</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Navigate to Authentication</p>
                    <p className="text-blue-200 text-sm">Authentication → Users</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Add New User</p>
                    <p className="text-blue-200 text-sm">Click "Add user" button</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Enter User Details</p>
                    <p className="text-blue-200 text-sm">
                      Email: <span className="font-mono">{result.user.email}</span><br/>
                      User ID: <span className="font-mono">{result.user.id}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-xs font-bold">5</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Set Password & Save</p>
                    <p className="text-blue-200 text-sm">Choose a strong password and save</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-yellow-400 text-sm mb-4">
                After completing these steps, you can login with your super admin credentials.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                <span>Go to Login</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Manual Super Admin Setup</h1>
            <p className="text-gray-300 text-sm">
              Create super admin record manually (bypasses auth issues)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:bg-white/10"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:bg-white/10"
                  placeholder="admin@vendro.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name || !formData.email}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating Record...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Create Super Admin Record</span>
                </>
              )}
            </button>
          </form>

          {/* Info Notice */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 text-sm font-medium mb-1">Manual Setup Process</p>
                <p className="text-blue-300 text-xs">
                  This creates the database record only. You'll need to complete the auth user setup in Supabase dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
