"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FiHome,
  FiPackage,
  FiShoppingCart,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiLogOut,
  FiTrendingUp,
  FiDollarSign,
  FiBox,
  FiUserPlus,
  FiEye,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiDownload,
  FiCalendar,
} from "react-icons/fi";
import { UserService, User } from "@/lib/user-service";
import { TenantService } from "@/lib/tenant-service";

interface DashboardStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalUsers: number;
  lowStockProducts: number;
  todaySales: number;
  todayRevenue: number;
  weeklySales: number;
  weeklyRevenue: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
  sku: string;
  created_at: string;
}

interface Sale {
  id: string;
  receipt_number: string;
  total_amount: number;
  payment_method: string;
  customer_name?: string;
  cashier_name: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await UserService.getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Check if user has admin privileges
      if (!['tenant_admin', 'manager'].includes(user.role)) {
        router.push('/dashboard?error=unauthorized');
        return;
      }
      
      setCurrentUser(user);
      await loadDashboardData(user);
    } catch (error) {
      console.error("Error loading current user:", error);
      router.push('/login');
    }
  };

  const loadDashboardData = async (user: User) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get tenant information
      const tenantData = await TenantService.getTenantById(user.tenant_id);
      if (!tenantData) {
        setError('Tenant not found');
        return;
      }
      setTenant(tenantData);

      // Load data based on active tab
      if (activeTab === 'overview') {
        await loadStats(user.tenant_id);
      } else if (activeTab === 'products') {
        await loadProducts(user.tenant_id);
      } else if (activeTab === 'sales') {
        await loadSales(user.tenant_id);
      } else if (activeTab === 'users') {
        await loadUsers(user.tenant_id);
      }
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/stats/dashboard?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadProducts = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/products?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadSales = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/sales?tenant_id=${tenantId}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setSales(data);
      }
    } catch (error) {
      console.error("Error loading sales:", error);
    }
  };

  const loadUsers = async (tenantId: string) => {
    try {
      const usersData = await UserService.getTenantUsers(tenantId);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDashboardData(currentUser);
    }
  }, [activeTab]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      router.push('/login');
    }
  };

  const canManageUsers = currentUser && UserService.hasPermission(currentUser.role, 'manage_tenant_users');
  const canManageProducts = currentUser && UserService.hasPermission(currentUser.role, 'manage_tenant_products');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSales = sales.filter(sale =>
    sale.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    sale.cashier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900">{tenant?.business_name || 'Dashboard'}</h2>
          <p className="text-sm text-gray-500">{currentUser?.name}</p>
        </div>
        
        <nav className="mt-6">
          <Link
            href="/dashboard/admin"
            className={`flex items-center px-6 py-3 text-sm font-medium ${
              activeTab === 'overview' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            <FiHome className="w-5 h-5 mr-3" />
            Overview
          </Link>
          
          {canManageProducts && (
            <Link
              href="/dashboard/admin"
              className={`flex items-center px-6 py-3 text-sm font-medium ${
                activeTab === 'products' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('products');
              }}
            >
              <FiPackage className="w-5 h-5 mr-3" />
              Products
            </Link>
          )}
          
          <Link
            href="/dashboard/admin"
            className={`flex items-center px-6 py-3 text-sm font-medium ${
              activeTab === 'sales' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('sales');
            }}
          >
            <FiShoppingCart className="w-5 h-5 mr-3" />
            Sales
          </Link>
          
          {canManageUsers && (
            <Link
              href="/dashboard/admin"
              className={`flex items-center px-6 py-3 text-sm font-medium ${
                activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('users');
              }}
            >
              <FiUsers className="w-5 h-5 mr-3" />
              Users
            </Link>
          )}
          
          <Link
            href="/dashboard/staff"
            className="flex items-center px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FiUserPlus className="w-5 h-5 mr-3" />
            Staff Management
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            <FiLogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Role: {currentUser?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Products</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                    </div>
                    <FiPackage className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                    </div>
                    <FiShoppingCart className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">₦{stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <FiDollarSign className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                    <FiUsers className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </div>

              {/* Today's Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales</span>
                      <span className="font-medium">{stats.todaySales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-medium">₦{stats.todayRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Performance</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales</span>
                      <span className="font-medium">{stats.weeklySales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue</span>
                      <span className="font-medium">₦{stats.weeklyRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {stats.lowStockProducts > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="text-yellow-800">
                      {stats.lowStockProducts} products are running low on stock
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Products</h2>
                {canManageProducts && (
                  <Link
                    href="/dashboard/products"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <FiPlus className="w-4 h-4" />
                    Add Product
                  </Link>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                          <td className="px-6 py-4 text-gray-900">₦{product.price.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              product.stock_quantity > 10
                                ? 'bg-green-100 text-green-800'
                                : product.stock_quantity > 0
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{product.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Sales</h2>
                <Link
                  href="/dashboard/sales"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <FiEye className="w-4 h-4" />
                  View All Sales
                </Link>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search sales..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-6 py-4 font-medium text-gray-900">{sale.receipt_number}</td>
                          <td className="px-6 py-4 text-gray-500">{sale.customer_name || 'Walk-in'}</td>
                          <td className="px-6 py-4 text-gray-500">{sale.cashier_name}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">₦{sale.total_amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                {canManageUsers && (
                  <Link
                    href="/dashboard/staff"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    <FiUserPlus className="w-4 h-4" />
                    Manage Users
                  </Link>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              user.role === 'tenant_admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'cashier' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
