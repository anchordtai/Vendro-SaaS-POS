"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user data from localStorage
    try {
      const sessionData = localStorage.getItem('vendro_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">No user data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
          <p className="text-sm text-gray-500">Email: {user.email} | Role: {user.role}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <p className="text-sm text-gray-500">Today&apos;s Sales</p>
                <p className="text-2xl font-bold">$4,520.50</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🛒</span>
              <div>
                <p className="text-sm text-gray-500">Today&apos;s Orders</p>
                <p className="text-2xl font-bold">89</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📦</span>
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-2xl font-bold">156</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <p className="text-sm text-gray-500">Low Stock Items</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
              🛒 New Sale
            </button>
            <button className="p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
              📦 Add Product
            </button>
            <button className="p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
              📊 View Reports
            </button>
            <button className="p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100">
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span>Sale #0001</span>
              <span className="text-gray-500">2 min ago - $125.00</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span>Sale #0002</span>
              <span className="text-gray-500">5 min ago - $45.50</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Sale #0003</span>
              <span className="text-gray-500">8 min ago - $210.00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
