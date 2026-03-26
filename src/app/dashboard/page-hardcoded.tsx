"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  Settings, 
  CreditCard, 
  Receipt, 
  BarChart3,
  Plus,
  Search,
  Filter,
  Download,
  Bell,
  LogOut,
  Store,
  Calculator,
  Clock,
  DollarSign,
  Box,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  X,
  Check,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical
} from "lucide-react";

export default function TenantDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    sku: '',
    description: ''
  });

  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [saleForm, setSaleForm] = useState({
    customer_id: '',
    payment_method: 'cash',
    discount: 0,
    notes: ''
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('vendro_session');
    if (!sessionData) {
      router.push('/login');
      return;
    }
    const session = JSON.parse(sessionData);
    setUser(session.user);
    loadDashboardData(session.user.tenant_id);
  }, [router]);

  const loadDashboardData = async (tenantId: string) => {
    try {
      setLoading(true);
      
      // Mock data for demonstration
      const mockStats = {
        totalSales: 1250000,
        todaySales: 45,
        totalRevenue: 2850000,
        totalProducts: 156,
        lowStock: 8,
        pendingOrders: 12,
        monthlyGrowth: 12.5,
        customerCount: 234
      };

      const mockProducts = [
        { id: 1, name: 'Paracetamol 500mg', price: 150, cost: 80, stock: 45, category: 'Medicine', sku: 'MED001', sales: 120 },
        { id: 2, name: 'Amoxicillin 250mg', price: 350, cost: 200, stock: 12, category: 'Medicine', sku: 'MED002', sales: 89 },
        { id: 3, name: 'Vitamin C Tablets', price: 200, cost: 120, stock: 78, category: 'Supplements', sku: 'SUP001', sales: 234 },
        { id: 4, name: 'Hand Sanitizer', price: 100, cost: 60, stock: 5, category: 'Hygiene', sku: 'HYG001', sales: 456 },
        { id: 5, name: 'Face Masks', price: 50, cost: 30, stock: 120, category: 'Hygiene', sku: 'HYG002', sales: 789 },
      ];

      const mockSales = [
        { id: 1, customer: 'John Doe', total: 2500, items: 5, payment: 'cash', status: 'completed', date: '2024-03-26' },
        { id: 2, customer: 'Jane Smith', total: 1800, items: 3, payment: 'card', status: 'completed', date: '2024-03-26' },
        { id: 3, customer: 'Bob Johnson', total: 3200, items: 7, payment: 'transfer', status: 'pending', date: '2024-03-26' },
      ];

      const mockCustomers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', phone: '08012345678', orders: 12, totalSpent: 45000 },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '08098765432', orders: 8, totalSpent: 28000 },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '08011223344', orders: 15, totalSpent: 67000 },
      ];

      const mockNotifications = [
        { id: 1, type: 'warning', message: 'Low stock alert: Hand Sanitizer', time: '2 hours ago' },
        { id: 2, type: 'success', message: 'New order received', time: '3 hours ago' },
        { id: 3, type: 'info', message: 'System update completed', time: '5 hours ago' },
      ];

      setStats(mockStats);
      setProducts(mockProducts);
      setSales(mockSales);
      setCustomers(mockCustomers);
      setNotifications(mockNotifications);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('vendro_session');
    router.push('/login');
  };

  const addToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: number) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item => 
        item.id === productId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleAddProduct = () => {
    const newProduct = {
      id: products.length + 1,
      ...productForm,
      price: parseFloat(productForm.price),
      cost: parseFloat(productForm.cost),
      stock: parseInt(productForm.stock),
      sales: 0
    };
    setProducts([...products, newProduct]);
    setShowAddProduct(false);
    setProductForm({ name: '', price: '', cost: '', stock: '', category: '', sku: '', description: '' });
  };

  const handleAddCustomer = () => {
    const newCustomer = {
      id: customers.length + 1,
      ...customerForm,
      orders: 0,
      totalSpent: 0
    };
    setCustomers([...customers, newCustomer]);
    setShowAddCustomer(false);
    setCustomerForm({ name: '', email: '', phone: '', address: '' });
  };

  const handleCompleteSale = () => {
    const newSale = {
      id: sales.length + 1,
      customer: saleForm.customer_id || 'Walk-in Customer',
      total: getCartTotal(),
      items: cartItems.length,
      payment: saleForm.payment_method,
      status: 'completed',
      date: new Date().toISOString().split('T')[0]
    };
    setSales([newSale, ...sales]);
    
    setProducts(products.map(product => {
      const cartItem = cartItems.find(item => item.id === product.id);
      if (cartItem) {
        return { ...product, stock: product.stock - cartItem.quantity };
      }
      return product;
    }));
    
    setCartItems([]);
    setShowAddSale(false);
    setSaleForm({ customer_id: '', payment_method: 'cash', discount: 0, notes: '' });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Store className="w-8 h-8 text-blue-400" />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                Vendro POS
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex items-center bg-white/10 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="bg-transparent text-white placeholder-gray-400 outline-none text-sm w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 shadow-xl">
                    <div className="p-4 border-b border-white/10">
                      <h3 className="text-white font-medium">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(notification => (
                        <div key={notification.id} className="p-4 border-b border-white/10 hover:bg-white/5">
                          <div className="flex items-start space-x-3">
                            {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />}
                            {notification.type === 'success' && <Check className="w-5 h-5 text-green-400 mt-0.5" />}
                            {notification.type === 'info' && <Bell className="w-5 h-5 text-blue-400 mt-0.5" />}
                            <div className="flex-1">
                              <p className="text-white text-sm">{notification.message}</p>
                              <p className="text-gray-400 text-xs mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Sales</p>
                <p className="text-2xl font-bold text-white">₦{stats?.totalSales?.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-green-400 text-sm">+{stats?.monthlyGrowth}%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Today's Sales</p>
                <p className="text-2xl font-bold text-white">{stats?.todaySales}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-green-400 text-sm">+8 from yesterday</span>
                </div>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Products</p>
                <p className="text-2xl font-bold text-white">{stats?.totalProducts}</p>
                <div className="flex items-center mt-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="text-yellow-400 text-sm">{stats?.lowStock} low stock</span>
                </div>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Package className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Customers</p>
                <p className="text-2xl font-bold text-white">{stats?.customerCount}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                  <span className="text-green-400 text-sm">+12 this week</span>
                </div>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setShowAddSale(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-4 hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Sale</span>
          </button>
          <button
            onClick={() => setShowAddProduct(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-4 hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center space-x-2"
          >
            <Package className="w-5 h-5" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => setShowAddCustomer(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg p-4 hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
          <button className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg p-4 hover:from-orange-700 hover:to-orange-800 transition-all flex items-center justify-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Reports</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-lg">
          {['overview', 'products', 'sales', 'customers', 'inventory'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Business Overview</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Sales */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Sales</h3>
                  <div className="space-y-3">
                    {sales.slice(0, 5).map(sale => (
                      <div key={sale.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{sale.customer}</p>
                          <p className="text-gray-400 text-sm">{sale.items} items • {sale.payment}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">₦{sale.total.toLocaleString()}</p>
                          <p className={`text-xs px-2 py-1 rounded ${
                            sale.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {sale.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
                  <div className="space-y-3">
                    {products.slice(0, 5).map(product => (
                      <div key={product.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-gray-400 text-sm">{product.category} • Stock: {product.stock}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">₦{product.price}</p>
                          <p className="text-gray-400 text-sm">{product.sales} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Products</h2>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </button>
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">SKU</th>
                      <th className="text-left py-3 px-4">Product</th>
                      <th className="text-left py-3 px-4">Category</th>
                      <th className="text-left py-3 px-4">Price</th>
                      <th className="text-left py-3 px-4">Stock</th>
                      <th className="text-left py-3 px-4">Sales</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4">{product.sku}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{product.name}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">{product.category}</td>
                        <td className="py-3 px-4">₦{product.price}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            product.stock < 10 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4">{product.sales}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => addToCart(product)}
                              className="p-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Sales History</h2>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </button>
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Customer</th>
                      <th className="text-left py-3 px-4">Items</th>
                      <th className="text-left py-3 px-4">Total</th>
                      <th className="text-left py-3 px-4">Payment</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4">{sale.date}</td>
                        <td className="py-3 px-4">{sale.customer}</td>
                        <td className="py-3 px-4">{sale.items}</td>
                        <td className="py-3 px-4 font-bold">₦{sale.total.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-white/10 rounded text-xs capitalize">
                            {sale.payment}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Receipt className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Customers</h2>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Filter className="w-4 h-4" />
                    <span>Filter</span>
                  </button>
                  <button className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Email</th>
                      <th className="text-left py-3 px-4">Phone</th>
                      <th className="text-left py-3 px-4">Orders</th>
                      <th className="text-left py-3 px-4">Total Spent</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 font-medium">{customer.name}</td>
                        <td className="py-3 px-4">{customer.email}</td>
                        <td className="py-3 px-4">{customer.phone}</td>
                        <td className="py-3 px-4">{customer.orders}</td>
                        <td className="py-3 px-4 font-bold">₦{customer.totalSpent.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 bg-white/10 text-gray-400 rounded hover:bg-white/20">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">Inventory Management</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Low Stock Alerts</h3>
                  <div className="space-y-3">
                    {products.filter(p => p.stock < 10).map(product => (
                      <div key={product.id} className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-gray-400 text-sm">SKU: {product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-400 font-bold">{product.stock} left</p>
                            <button className="text-xs text-blue-400 hover:text-blue-300">Reorder</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventory Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Inventory Summary</h3>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Products</span>
                        <span className="text-white font-bold">{products.length}</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Low Stock Items</span>
                        <span className="text-red-400 font-bold">{products.filter(p => p.stock < 10).length}</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Total Value</span>
                        <span className="text-white font-bold">₦{products.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Shopping Cart Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-black/90 backdrop-blur-xl border-l border-white/20 transform transition-transform z-50 ${
        showCart ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Shopping Cart</h3>
            <button
              onClick={() => setShowCart(false)}
              className="p-2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Cart is empty</p>
          ) : (
            <div className="space-y-4">
              {cartItems.map(item => (
                <div key={item.id} className="bg-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="p-1 bg-white/10 rounded text-gray-400 hover:text-white"
                      >
                        -
                      </button>
                      <span className="text-white font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="p-1 bg-white/10 rounded text-gray-400 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-white font-bold">₦{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-white/20">
            <div className="flex justify-between items-center mb-4">
              <span className="text-white font-medium">Total:</span>
              <span className="text-xl font-bold text-white">₦{getCartTotal().toLocaleString()}</span>
            </div>
            <button
              onClick={() => {setShowAddSale(true); setShowCart(false);}}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Cart Toggle Button */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all z-40"
      >
        <ShoppingCart className="w-6 h-6" />
        {cartItems.length > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
            {cartItems.length}
          </span>
        )}
      </button>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add New Product</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Product Name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={productForm.name}
                onChange={(e) => setProductForm({...productForm, name: e.target.value})}
              />
              <input
                type="text"
                placeholder="SKU"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={productForm.sku}
                onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  value={productForm.price}
                  onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Cost"
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                  value={productForm.cost}
                  onChange={(e) => setProductForm({...productForm, cost: e.target.value})}
                />
              </div>
              <input
                type="number"
                placeholder="Stock Quantity"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={productForm.stock}
                onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
              />
              <select
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                value={productForm.category}
                onChange={(e) => setProductForm({...productForm, category: e.target.value})}
              >
                <option value="">Select Category</option>
                <option value="Medicine">Medicine</option>
                <option value="Supplements">Supplements</option>
                <option value="Hygiene">Hygiene</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                placeholder="Description"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                rows={3}
                value={productForm.description}
                onChange={(e) => setProductForm({...productForm, description: e.target.value})}
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddProduct}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Add Product
              </button>
              <button
                onClick={() => setShowAddProduct(false)}
                className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Add New Customer</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Customer Name"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
              />
              <textarea
                placeholder="Address"
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                rows={3}
                value={customerForm.address}
                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
              />
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Add Customer
              </button>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {showAddSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">New Sale</h3>
            
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Cart is empty. Add products to cart first.</p>
                <button
                  onClick={() => {setShowAddSale(false); setShowCart(true);}}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Add Products
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Summary */}
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Order Summary</h4>
                  <div className="space-y-2">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.name} x {item.quantity}</span>
                        <span className="text-white">₦{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/20 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-white">Total:</span>
                        <span className="text-white">₦{getCartTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Selection */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Customer (Optional)</label>
                  <select
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    value={saleForm.customer_id}
                    onChange={(e) => setSaleForm({...saleForm, customer_id: e.target.value})}
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.name}>{customer.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['cash', 'card', 'transfer'].map(method => (
                      <button
                        key={method}
                        onClick={() => setSaleForm({...saleForm, payment_method: method})}
                        className={`py-2 px-4 rounded-lg border transition-all ${
                          saleForm.payment_method === method
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white/10 border-white/20 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    value={saleForm.discount}
                    onChange={(e) => setSaleForm({...saleForm, discount: parseInt(e.target.value) || 0})}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Notes</label>
                  <textarea
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
                    rows={3}
                    placeholder="Order notes..."
                    value={saleForm.notes}
                    onChange={(e) => setSaleForm({...saleForm, notes: e.target.value})}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={handleCompleteSale}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
                  >
                    Complete Sale - ₦{getCartTotal().toLocaleString()}
                  </button>
                  <button
                    onClick={() => setShowAddSale(false)}
                    className="flex-1 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
