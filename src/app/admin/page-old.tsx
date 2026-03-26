"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user data and check if super admin
    try {
      const sessionData = localStorage.getItem('vendro_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setUser(session.user);
        
        if (session.user.role !== 'super_admin') {
          router.push('/dashboard');
          return;
        }
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      router.push('/login');
      return;
    }

    // Load admin data
    loadAdminData();
  }, [router]);

  const loadAdminData = async () => {
    try {
      // Mock data for now - replace with actual API calls
      setStats({
        totalTenants: 45,
        activeTenants: 38,
        totalRevenue: 125000,
        newSignups: 12
      });

      setTenants([
        { id: '1', business_name: 'AF Store', business_type: 'retail', status: 'active', created_at: '2026-03-20', revenue: 4500 },
        { id: '2', business_name: 'Tech Shop', business_type: 'electronics', status: 'trial', created_at: '2026-03-19', revenue: 2300 },
        { id: '3', business_name: 'Food Mart', business_type: 'grocery', status: 'active', created_at: '2026-03-18', revenue: 6700 },
        { id: '4', business_name: 'Pharmacy Plus', business_type: 'pharmacy', status: 'expired', created_at: '2026-03-15', revenue: 8900 },
        { id: '5', business_name: 'Bar Central', business_type: 'bar', status: 'active', created_at: '2026-03-14', revenue: 3200 },
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Manage all tenants and system overview</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">👤 {user?.name}</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('vendro_session');
                  router.push('/login');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏢</span>
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-2xl font-bold">{stats?.totalTenants}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="text-sm text-gray-500">Active Tenants</p>
                <p className="text-2xl font-bold">{stats?.activeTenants}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">${stats?.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📈</span>
              <div>
                <p className="text-sm text-gray-500">New Signups</p>
                <p className="text-2xl font-bold">{stats?.newSignups}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Tenants</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.business_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{tenant.business_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${tenant.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                      <button className="text-red-600 hover:text-red-900">Suspend</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">🔧 System Management</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                📊 System Analytics
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                💳 Payment Gateway Settings
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                📧 Email Configuration
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">👥 User Management</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                📋 All Users
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                🚫 Suspended Accounts
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                🔐 Permissions
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">📈 Reports</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                💰 Revenue Report
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                📊 Usage Analytics
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 rounded hover:bg-gray-100">
                📥 Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
