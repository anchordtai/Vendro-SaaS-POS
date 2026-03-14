"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import {
  FiDollarSign,
  FiShoppingCart,
  FiPackage,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiArrowRight,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Link from "next/link";

// Demo data for the dashboard
const demoStats = {
  todaySales: 4520.5,
  todayOrders: 89,
  totalProducts: 156,
  lowStockItems: 12,
};

const demoSalesData = [
  { name: "Mon", sales: 3200 },
  { name: "Tue", sales: 2800 },
  { name: "Wed", sales: 4100 },
  { name: "Thu", sales: 3600 },
  { name: "Fri", sales: 5200 },
  { name: "Sat", sales: 6100 },
  { name: "Sun", sales: 4500 },
];

const demoTopProducts = [
  { name: "Premium Beer", sales: 245 },
  { name: "Whiskey Shot", sales: 189 },
  { name: "Vodka Mix", sales: 167 },
  { name: "Cocktail Special", sales: 145 },
  { name: "Wine Glass", sales: 98 },
];

const demoCategoryData = [
  { name: "Beer", value: 35, color: "#2563EB" },
  { name: "Whiskey", value: 25, color: "#7C3AED" },
  { name: "Vodka", value: 20, color: "#059669" },
  { name: "Wine", value: 12, color: "#DC2626" },
  { name: "Food", value: 8, color: "#D97706" },
];

const demoRecentSales = [
  { id: "1", time: "2 min ago", items: 4, total: 125.0, cashier: "Cashier 1" },
  { id: "2", time: "5 min ago", items: 2, total: 45.5, cashier: "Cashier 2" },
  { id: "3", time: "8 min ago", items: 6, total: 210.0, cashier: "Cashier 1" },
  { id: "4", time: "12 min ago", items: 1, total: 25.0, cashier: "Cashier 2" },
  { id: "5", time: "15 min ago", items: 3, total: 89.99, cashier: "Cashier 1" },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Last updated:</span>
          <span className="text-sm font-medium text-gray-900">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Today's Sales</p>
  <p className="text-2xl font-bold text-gray-900">
                ₦{demoStats.todaySales.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <FiTrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-medium text-green-600">+12.5%</span>
            <span className="text-gray-400">from yesterday</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {demoStats.todayOrders}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <FiShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm">
            <FiTrendingUp className="w-4 h-4 text-green-500" />
            <span className="font-medium text-green-600">+8.2%</span>
            <span className="text-gray-400">from yesterday</span>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {demoStats.totalProducts}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
              <FiPackage className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 text-sm">
            <Link
              href="/dashboard/inventory"
              className="text-primary hover:underline"
            >
              View inventory →
            </Link>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">
                {demoStats.lowStockItems}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-3 text-sm">
            <Link
              href="/dashboard/inventory"
              className="text-red-600 hover:underline"
            >
              View alerts →
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly Sales Chart */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm lg:col-span-2 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Weekly Sales
            </h2>
            <Link
              href="/dashboard/reports"
              className="text-sm text-primary hover:underline"
            >
              View Reports
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demoSalesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                <YAxis
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => `₦${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [
                    `₦${value.toLocaleString()}`,
                    "Sales",
                  ]}
                />
                <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Sales by Category
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={demoCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {demoCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {demoCategoryData.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-gray-600">{category.name}</span>
                </div>
                <span className="font-medium text-gray-900">
                  {category.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Selling Products */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Selling Products
            </h2>
            <Link
              href="/dashboard/reports"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {demoTopProducts.map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 text-sm font-medium rounded-full bg-primary/10 text-primary">
                    {index + 1}
                  </span>
                  <span className="font-medium text-gray-900">
                    {product.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 overflow-hidden bg-gray-100 rounded-full">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(product.sales / demoTopProducts[0].sales) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-12 text-sm text-right text-gray-500">
                    {product.sales} sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Sales
            </h2>
            <Link
              href="/dashboard/sales"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {demoRecentSales.map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <FiShoppingCart className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      #{sale.id.padStart(4, "0")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {sale.items} items • {sale.cashier}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${sale.total.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">{sale.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions for Admin */}
      {isAdmin && (
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Link
              href="/dashboard/products"
              className="flex flex-col items-center gap-2 p-4 transition-colors bg-gray-50 rounded-xl hover:bg-gray-100"
            >
              <FiPackage className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                Add Product
              </span>
            </Link>
            <Link
              href="/dashboard/staff"
              className="flex flex-col items-center gap-2 p-4 transition-colors bg-gray-50 rounded-xl hover:bg-gray-100"
            >
              <FiShoppingCart className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                Manage Staff
              </span>
            </Link>
            <Link
              href="/dashboard/reports"
              className="flex flex-col items-center gap-2 p-4 transition-colors bg-gray-50 rounded-xl hover:bg-gray-100"
            >
              <FiTrendingUp className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-gray-700">
                View Reports
              </span>
            </Link>
            <Link
              href="/dashboard/pos"
              className="flex flex-col items-center gap-2 p-4 transition-colors bg-primary/10 rounded-xl hover:bg-primary/20"
            >
              <FiShoppingCart className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium text-primary">Open POS</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
