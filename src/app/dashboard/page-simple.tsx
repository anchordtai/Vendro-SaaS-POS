"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TenantDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('vendro_session');
    if (!sessionData) {
      router.push('/login');
      return;
    }
    const session = JSON.parse(sessionData);
    setUser(session.user);
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('vendro_session');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Vendro Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">Business</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Welcome to Vendro Dashboard!</h2>
          <p className="text-gray-300">Your authentication is working perfectly. Login successful!</p>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">User Info</h3>
              <p className="text-gray-300 text-sm">Name: {user?.name}</p>
              <p className="text-gray-300 text-sm">Email: {user?.email}</p>
              <p className="text-gray-300 text-sm">Role: {user?.role}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">System Status</h3>
              <p className="text-green-400 text-sm">✅ Authentication Working</p>
              <p className="text-green-400 text-sm">✅ Database Connected</p>
              <p className="text-green-400 text-sm">✅ User Session Active</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Next Steps</h3>
              <p className="text-gray-300 text-sm">• Add products</p>
              <p className="text-gray-300 text-sm">• Configure settings</p>
              <p className="text-gray-300 text-sm">• Start selling!</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
